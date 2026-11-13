import roomsData from '@/data/rooms.json'

export type Task = 'bypass' | 'gr'

export interface Room {
  floor: string
  room: number
  type: string
  task: Task
  /** Kept in the data but not shown until the work is confirmed. */
  onHold?: boolean
  /** Shown with a warning: the worker must check with the person in charge before starting. */
  confirmFirst?: boolean
}

export const CONFIRM_FIRST_LABEL = '作業前に要確認'

export const TASK_LABEL: Record<Task, string> = {
  bypass: 'バイパス',
  gr: 'GR（アース）',
}

/** Every room in the source list, including the ones on hold. */
export const ALL_ROOMS = roomsData as Room[]

/** Rooms to work on, in walking order. */
export const ROOMS = ALL_ROOMS.filter((room) => !room.onHold)

export const FLOORS = [...new Set(ROOMS.map((room) => room.floor))]

/** Five-digit numbers are the second room of a suite: 13308 belongs to suite 3308. */
export function suiteNumber(room: number): number {
  return room % 10000
}
