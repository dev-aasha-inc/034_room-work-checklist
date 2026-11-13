import { fetchRemote, putRemote } from './github'
import { applyOps, type Op, parseRecords, type Records, serializeRecords, toJstIso } from './records'
import type { Room } from './rooms'

function commitMessage(ops: Op[]): string {
  if (ops.length > 1) return `record: ${ops.length} changes`
  const [op] = ops
  return `record: ${op.room} ${op.doneAt ? 'done' : 'undone'}`
}

/**
 * Replays the device's unsent taps on top of whatever GitHub currently holds and writes the result back.
 * Reading first means a fresh browser can never wipe records that are already stored.
 */
export async function pushOps(token: string, ops: Op[], rooms: Room[], now: Date = new Date()): Promise<Records> {
  const remote = await fetchRemote(token)
  const merged = applyOps(parseRecords(remote.text), ops)
  if (ops.length > 0) {
    await putRemote(token, serializeRecords(merged, rooms, toJstIso(now)), remote.sha, commitMessage(ops))
  }
  return merged
}
