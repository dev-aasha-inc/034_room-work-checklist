import type { Records } from '@/lib/records'
import { type Room, suiteNumber } from '@/lib/rooms'
import { cn } from '@/lib/utils'

interface FloorGridProps {
  rooms: Room[]
  records: Records
  index: number
  onSelect: (index: number) => void
}

/** Every room on the floor at a glance; tap one to jump to it. */
export function FloorGrid({ rooms, records, index, onSelect }: FloorGridProps) {
  return (
    <div className="flex h-full flex-col gap-3 px-5">
      <ul className="grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto p-1">
        {rooms.map((room, i) => {
          const suite = suiteNumber(room.room)
          const isDone = Boolean(records[room.room])
          return (
            <li key={room.room}>
              <button
                type="button"
                aria-current={i === index}
                aria-label={`${suite} ${isDone ? '完了' : '未完了'}`}
                onClick={() => onSelect(i)}
                className={cn(
                  'flex h-16 w-full flex-col items-center justify-center rounded-xl border-2 text-lg leading-tight font-semibold tabular-nums transition-colors active:translate-y-px',
                  isDone && 'border-done bg-done-soft text-done',
                  !isDone && (room.task === 'gr' ? 'border-gr/30 bg-card text-gr' : 'border-foreground/10 bg-card'),
                  i === index && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
              >
                {suite}
                {suite !== room.room && <span className="text-xs font-normal">（{room.room}）</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="flex justify-center gap-4 text-sm text-muted-foreground">
        <span className="text-done">■ 完了</span>
        <span className="text-gr">紫の文字 = GR</span>
      </p>
    </div>
  )
}
