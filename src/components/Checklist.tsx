import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudCheck,
  CloudOff,
  CloudUpload,
  LayoutGrid,
  type LucideIcon,
  TriangleAlert,
  Undo2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FloorGrid } from '@/components/FloorGrid'
import { RoomCarousel } from '@/components/RoomCarousel'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Records } from '@/lib/records'
import { FLOORS, type Room, ROOMS, suiteNumber } from '@/lib/rooms'
import { type SyncStatus, useRecords } from '@/lib/useRecords'
import { cn } from '@/lib/utils'

// After a room is completed, show the result briefly, then slide to the next open room.
const ADVANCE_DELAY_MS = 350
// Taps are ignored right after completing or undoing, so a double tap cannot act on the same room
// twice or on the room the view is sliding to.
const TAP_LOCK_MS = 900
const UNDO_CONFIRM_MS = 5000

function roomsOn(floor: string): Room[] {
  return ROOMS.filter((room) => room.floor === floor)
}

function countOpen(rooms: Room[], records: Records): number {
  return rooms.filter((room) => !records[room.room]).length
}

/** Next room after `from` that is not done yet, wrapping around the floor. -1 when none is left. */
function nextOpenIndex(rooms: Room[], records: Records, from: number): number {
  for (let step = 1; step < rooms.length; step++) {
    const i = (from + step) % rooms.length
    if (!records[rooms[i].room]) return i
  }
  return -1
}

interface FloorTabsProps {
  floor: string
  records: Records
  onSelect: (floor: string) => void
}

function FloorTabs({ floor, records, onSelect }: FloorTabsProps) {
  const current = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    current.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [floor])

  return (
    <nav
      aria-label="階の切り替え"
      className="flex shrink-0 gap-2 overflow-x-auto px-5 pt-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {FLOORS.map((f) => {
        const open = countOpen(roomsOn(f), records)
        const isCurrent = f === floor
        return (
          <button
            key={f}
            ref={isCurrent ? current : undefined}
            type="button"
            aria-current={isCurrent}
            onClick={() => onSelect(f)}
            className={cn(
              'flex h-12 shrink-0 items-center gap-1.5 rounded-xl border-2 px-3.5 text-lg font-semibold tabular-nums transition-colors active:translate-y-px',
              isCurrent ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/10 bg-card',
            )}
          >
            {f}
            {open === 0 ? (
              <Check className={cn('size-4', !isCurrent && 'text-done')} aria-label="完了" />
            ) : (
              <span className="text-xs font-normal opacity-70">残{open}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

interface FloorViewProps {
  floor: string
  records: Records
  mark: (room: number, done: boolean) => void
}

function FloorView({ floor, records, mark }: FloorViewProps) {
  const rooms = roomsOn(floor)
  const [index, setIndex] = useState(() => Math.max(0, rooms.findIndex((room) => !records[room.room])))
  const [showGrid, setShowGrid] = useState(false)
  const [isConfirmingUndo, setIsConfirmingUndo] = useState(false)
  const lockedUntil = useRef(0)
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const current = rooms[index]
  const isDone = Boolean(records[current.room])
  const doneCount = rooms.length - countOpen(rooms, records)
  const previous = rooms[index - 1]
  const next = rooms[index + 1]

  useEffect(() => {
    if (!isConfirmingUndo) return
    const timer = setTimeout(() => setIsConfirmingUndo(false), UNDO_CONFIRM_MS)
    return () => clearTimeout(timer)
  }, [isConfirmingUndo])

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  const goTo = (i: number) => {
    // Moving by hand cancels a pending auto-advance, so the view is never pulled back.
    clearTimeout(advanceTimer.current)
    setIndex(i)
    setIsConfirmingUndo(false)
  }

  const isLocked = () => Date.now() < lockedUntil.current

  const complete = () => {
    if (isLocked()) return
    lockedUntil.current = Date.now() + TAP_LOCK_MS
    mark(current.room, true)
    const target = nextOpenIndex(rooms, records, index)
    if (target !== -1) advanceTimer.current = setTimeout(() => goTo(target), ADVANCE_DELAY_MS)
  }

  const undo = () => {
    if (isLocked()) return
    if (!isConfirmingUndo) {
      setIsConfirmingUndo(true)
      return
    }
    // The big button turns back into "done" in the same spot; a third tap must not re-complete the room.
    lockedUntil.current = Date.now() + TAP_LOCK_MS
    mark(current.room, false)
    setIsConfirmingUndo(false)
  }

  return (
    <>
      <div className="shrink-0 px-5 pt-3">
        <p className="mb-1.5 flex items-baseline justify-between text-sm text-muted-foreground tabular-nums">
          <span>
            <span className="text-2xl font-semibold text-foreground">{doneCount}</span> / {rooms.length} 完了
          </span>
          {doneCount === rooms.length && <span className="font-semibold text-done">この階は完了</span>}
        </p>
        <Progress
          value={(doneCount / rooms.length) * 100}
          aria-label={`${floor}の進捗`}
          className="**:data-[slot=progress-indicator]:bg-done **:data-[slot=progress-track]:h-2 **:data-[slot=progress-track]:bg-foreground/10"
        />
      </div>

      <div className="min-h-0 flex-1 py-4">
        {showGrid ? (
          <FloorGrid
            rooms={rooms}
            records={records}
            index={index}
            onSelect={(i) => {
              goTo(i)
              setShowGrid(false)
            }}
          />
        ) : (
          <RoomCarousel rooms={rooms} records={records} index={index} onIndexChange={goTo} />
        )}
      </div>

      <nav aria-label="部屋の移動" className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-5">
        <Button
          variant="ghost"
          className="h-12 justify-start px-2 text-lg tabular-nums"
          disabled={showGrid || !previous}
          onClick={() => goTo(index - 1)}
        >
          <ChevronLeft className="size-6" aria-label="前の部屋" />
          {previous && suiteNumber(previous.room)}
        </Button>
        <Button
          variant="outline"
          className="h-12 gap-2 px-4 text-base tabular-nums"
          aria-pressed={showGrid}
          onClick={() => {
            setShowGrid(!showGrid)
            setIsConfirmingUndo(false)
          }}
        >
          <LayoutGrid className="size-5" aria-hidden="true" />
          {showGrid ? '閉じる' : `一覧 ${index + 1}/${rooms.length}`}
        </Button>
        <Button
          variant="ghost"
          className="h-12 justify-end px-2 text-lg tabular-nums"
          disabled={showGrid || !next}
          onClick={() => goTo(index + 1)}
        >
          {next && suiteNumber(next.room)}
          <ChevronRight className="size-6" aria-label="次の部屋" />
        </Button>
      </nav>

      <div className="shrink-0 px-5 pt-3">
        {isDone ? (
          <Button
            variant={isConfirmingUndo ? 'destructive' : 'outline'}
            className="h-24 w-full gap-2 rounded-2xl text-xl"
            disabled={showGrid}
            onClick={undo}
          >
            <Undo2 className="size-6" aria-hidden="true" />
            {isConfirmingUndo ? 'もう一度押すと取り消し' : '取り消す'}
          </Button>
        ) : (
          <Button className="h-24 w-full gap-2 rounded-2xl text-3xl font-semibold" disabled={showGrid} onClick={complete}>
            <Check className="size-8" aria-hidden="true" />
            完了にする
          </Button>
        )}
      </div>
    </>
  )
}

const SYNC_VIEW: Record<SyncStatus, { icon: LucideIcon; text: string; className: string }> = {
  local: { icon: CloudOff, text: 'この端末にだけ保存しています', className: 'text-muted-foreground' },
  syncing: { icon: CloudUpload, text: '送信中…', className: 'text-muted-foreground' },
  synced: { icon: CloudCheck, text: '保存済み', className: 'text-done' },
  waiting: { icon: CloudOff, text: '電波を待っています。自動で再送します', className: 'text-amber-700' },
  rejected: { icon: TriangleAlert, text: '保存できません。管理者に連絡してください', className: 'text-destructive' },
}

interface SyncStatusLineProps {
  status: SyncStatus
  pendingCount: number
}

function SyncStatusLine({ status, pendingCount }: SyncStatusLineProps) {
  const { icon: Icon, text, className } = SYNC_VIEW[status]
  return (
    <p
      role="status"
      className={cn(
        'flex shrink-0 items-center justify-center gap-1.5 px-5 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {text}
      {status !== 'local' && pendingCount > 0 && `（未送信 ${pendingCount} 件）`}
    </p>
  )
}

export function Checklist() {
  const { records, status, pendingCount, mark } = useRecords()
  const [floor, setFloor] = useState(() => FLOORS.find((f) => countOpen(roomsOn(f), records) > 0) ?? FLOORS[0])

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col">
      <FloorTabs floor={floor} records={records} onSelect={setFloor} />
      <FloorView key={floor} floor={floor} records={records} mark={mark} />
      <SyncStatusLine status={status} pendingCount={pendingCount} />
    </main>
  )
}
