import type { Room } from './rooms'

/** Completion time per room number, as ISO 8601 in Japan time. */
export type Records = Record<number, string>

/** One tap on the device: done (with its timestamp) or undone (null). */
export interface Op {
  room: number
  doneAt: string | null
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export function applyOps(base: Records, ops: Op[]): Records {
  return ops.reduce<Records>((records, { room, doneAt }) => {
    if (doneAt) return { ...records, [room]: doneAt }
    const { [room]: _undone, ...rest } = records
    return rest
  }, base)
}

/** Formats an instant as Japan time regardless of the device's own time zone. */
export function toJstIso(date: Date): string {
  return `${new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`
}

/** "2026-11-13T10:42:17+09:00" -> "11/13 10:42:17" */
export function formatJst(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)} ${iso.slice(11, 19)}`
}

export function serializeRecords(records: Records, rooms: Room[], updatedAt: string): string {
  const listed = rooms
    .filter(({ room }) => records[room])
    .map(({ room, task }) => ({ room, task, doneAt: records[room] }))
  // A record for a room that is no longer in the list is kept, never dropped.
  const listedNumbers = new Set(rooms.map(({ room }) => room))
  const unlisted = Object.keys(records)
    .map(Number)
    .filter((room) => !listedNumbers.has(room))
    .map((room) => ({ room, doneAt: records[room] }))
  return `${JSON.stringify({ updatedAt, records: [...listed, ...unlisted] }, null, 2)}\n`
}

/** Throws on anything unexpected: treating a broken file as empty would overwrite real records. */
export function parseRecords(text: string): Records {
  const file = JSON.parse(text) as { records?: unknown } | null
  if (!Array.isArray(file?.records)) throw new Error('Unexpected records file format')
  return Object.fromEntries(
    file.records.map((entry: { room?: unknown; doneAt?: unknown } | null) => {
      if (typeof entry?.room !== 'number' || typeof entry.doneAt !== 'string') {
        throw new Error('Unexpected record entry')
      }
      return [entry.room, entry.doneAt]
    }),
  )
}
