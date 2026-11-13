import { Check } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatJst, type Records } from '@/lib/records'
import { type Room, suiteNumber, TASK_LABEL, type Task } from '@/lib/rooms'
import { cn } from '@/lib/utils'

const TASK_BADGE: Record<Task, string> = {
  bypass: 'bg-bypass-soft text-bypass',
  gr: 'bg-gr-soft text-gr',
}

interface RoomCardProps {
  room: Room
  doneAt: string | undefined
}

function RoomCard({ room, doneAt }: RoomCardProps) {
  const suite = suiteNumber(room.room)
  return (
    <article
      className={cn(
        'flex h-full flex-col items-center justify-center gap-3 rounded-[2rem] border-2 px-4 text-center transition-colors',
        doneAt ? 'border-done bg-done-soft' : 'border-foreground/10 bg-card',
      )}
    >
      <Badge className={cn('h-9 px-4 text-base', TASK_BADGE[room.task])}>{TASK_LABEL[room.task]}</Badge>
      <p className="text-[5.75rem] leading-none font-semibold tracking-tighter tabular-nums">{suite}</p>
      <p className="text-lg text-muted-foreground tabular-nums">
        {suite !== room.room && `（${room.room}）`} {room.type}
      </p>
      {doneAt ? (
        <p className="flex items-center gap-1.5 text-lg font-semibold text-done tabular-nums">
          <Check className="size-5" aria-hidden="true" />
          完了 {formatJst(doneAt)}
        </p>
      ) : (
        <p className="text-lg text-muted-foreground">未完了</p>
      )}
    </article>
  )
}

interface RoomCarouselProps {
  rooms: Room[]
  records: Records
  index: number
  onIndexChange: (index: number) => void
}

/** One room per screen; swipe sideways to move between rooms. */
export function RoomCarousel({ rooms, records, index, onIndexChange }: RoomCarouselProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  // Bring the requested room into view. A no-op when the user's own swipe already put it there.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const animate = !isFirstRender.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    isFirstRender.current = false
    if (Math.round(el.scrollLeft / el.clientWidth) === index) return
    el.scrollTo({ left: index * el.clientWidth, behavior: animate ? 'smooth' : 'instant' })
  }, [index])

  const handleScroll = () => {
    const el = scroller.current
    if (!el) return
    const visible = Math.round(el.scrollLeft / el.clientWidth)
    if (visible !== index) onIndexChange(visible)
  }

  return (
    <div
      ref={scroller}
      onScroll={handleScroll}
      className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {rooms.map((room) => (
        <section
          key={room.room}
          aria-roledescription="slide"
          aria-label={`${suiteNumber(room.room)} ${TASK_LABEL[room.task]}`}
          className="h-full w-full shrink-0 snap-center snap-always px-5"
        >
          <RoomCard room={room} doneAt={records[room.room]} />
        </section>
      ))}
    </div>
  )
}
