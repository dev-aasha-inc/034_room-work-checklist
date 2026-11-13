import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GithubError } from './github'
import { applyOps, type Op, type Records, toJstIso } from './records'
import { ALL_ROOMS } from './rooms'
import { pushOps } from './sync'

const STATE_KEY = 'rwc.state'
const TOKEN_KEY = 'rwc.token'
const RETRY_MS = 15_000
// Statuses GitHub returns when the token is wrong, expired, or lacks access to the records repository.
const REJECTED_STATUSES = [401, 403, 404]

/**
 * local: no token on this device, records stay here only.
 * waiting: there are unsent taps and the next attempt is scheduled.
 * rejected: GitHub refused the token.
 */
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'waiting' | 'rejected'

interface State {
  /** Records as last confirmed by GitHub. */
  base: Records
  /** Taps made on this device that GitHub has not confirmed yet. */
  pending: Op[]
}

export interface RecordsStore {
  records: Records
  status: SyncStatus
  pendingCount: number
  mark: (room: number, done: boolean) => void
}

/**
 * A field link carries the write token in the URL fragment (#k=...). Keep it on this device only
 * and remove it from the address bar so it is not shared or bookmarked by accident.
 */
export function adoptTokenFromUrl(): void {
  const match = /^#k=(.+)$/.exec(window.location.hash)
  if (!match) return
  localStorage.setItem(TOKEN_KEY, decodeURIComponent(match[1]))
  window.history.replaceState(null, '', window.location.pathname)
}

function loadState(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null') as Partial<State> | null
    if (saved?.base && Array.isArray(saved.pending)) return { base: saved.base, pending: saved.pending }
  } catch {
    // Unreadable local data cannot be recovered; start from what GitHub holds.
  }
  return { base: {}, pending: [] }
}

export function useRecords(): RecordsStore {
  const [token] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [state, setState] = useState(loadState)
  const [status, setStatus] = useState<SyncStatus>(token ? 'syncing' : 'local')
  const stateRef = useRef(state)
  const inFlight = useRef(false)

  const commit = useCallback((next: State) => {
    stateRef.current = next
    localStorage.setItem(STATE_KEY, JSON.stringify(next))
    setState(next)
  }, [])

  const sync = useCallback(async () => {
    if (!token || inFlight.current) return
    inFlight.current = true
    setStatus('syncing')
    try {
      // Taps made while a request is in flight are picked up by the next round.
      do {
        const sent = stateRef.current.pending
        const base = await pushOps(token, sent, ALL_ROOMS)
        commit({ base, pending: stateRef.current.pending.slice(sent.length) })
      } while (stateRef.current.pending.length > 0)
      setStatus('synced')
    } catch (error) {
      const rejected = error instanceof GithubError && REJECTED_STATUSES.includes(error.status)
      setStatus(rejected ? 'rejected' : 'waiting')
    } finally {
      inFlight.current = false
    }
  }, [token, commit])

  useEffect(() => {
    void sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [sync])

  useEffect(() => {
    if (status !== 'waiting') return
    const timer = setTimeout(sync, RETRY_MS)
    return () => clearTimeout(timer)
  }, [status, sync])

  const mark = useCallback(
    (room: number, done: boolean) => {
      // The timestamp is taken at the tap, not when the record reaches GitHub.
      const op: Op = { room, doneAt: done ? toJstIso(new Date()) : null }
      commit({ ...stateRef.current, pending: [...stateRef.current.pending, op] })
      void sync()
    },
    [commit, sync],
  )

  const records = useMemo(() => applyOps(state.base, state.pending), [state])

  return { records, status, pendingCount: state.pending.length, mark }
}
