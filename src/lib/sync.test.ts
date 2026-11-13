import { afterEach, expect, test, vi } from 'vitest'
import { GithubError } from './github'
import type { Room } from './rooms'
import { pushOps } from './sync'

const ROOMS: Room[] = [
  { floor: '33F', room: 3301, type: 'ST3', task: 'bypass' },
  { floor: '33F', room: 3303, type: 'SK2', task: 'bypass' },
]
const NOW = new Date('2026-11-13T01:10:00Z')

function remoteFile(records: unknown[], sha: string) {
  const text = JSON.stringify({ updatedAt: null, records })
  return new Response(JSON.stringify({ sha, content: btoa(text) }), { status: 200 })
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

test('applies pending ops on top of the remote file and writes it back with the fetched sha', async () => {
  const fetchMock = stubFetch(
    remoteFile([{ room: 3301, task: 'bypass', doneAt: '2026-11-13T10:00:00+09:00' }], 'sha-1'),
    new Response('{}', { status: 200 }),
  )

  const merged = await pushOps('token', [{ room: 3303, doneAt: '2026-11-13T10:05:00+09:00' }], ROOMS, NOW)

  expect(merged).toEqual({ 3301: '2026-11-13T10:00:00+09:00', 3303: '2026-11-13T10:05:00+09:00' })
  const [, putInit] = fetchMock.mock.calls[1]
  const body = JSON.parse(putInit!.body as string)
  expect(putInit!.method).toBe('PUT')
  expect(body.sha).toBe('sha-1')
  expect(JSON.parse(atob(body.content)).records).toEqual([
    { room: 3301, task: 'bypass', doneAt: '2026-11-13T10:00:00+09:00' },
    { room: 3303, task: 'bypass', doneAt: '2026-11-13T10:05:00+09:00' },
  ])
})

test('only reads the remote file when there is nothing to send', async () => {
  const fetchMock = stubFetch(remoteFile([{ room: 3301, task: 'bypass', doneAt: '2026-11-13T10:00:00+09:00' }], 'sha-1'))

  const merged = await pushOps('token', [], ROOMS, NOW)

  expect(merged).toEqual({ 3301: '2026-11-13T10:00:00+09:00' })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('reports the HTTP status when GitHub rejects the request', async () => {
  stubFetch(new Response('{"message":"Bad credentials"}', { status: 401 }))

  const error = await pushOps('bad-token', [], ROOMS, NOW).catch((e: unknown) => e)

  expect(error).toBeInstanceOf(GithubError)
  expect((error as GithubError).status).toBe(401)
})

test('never sends the token anywhere except the Authorization header', async () => {
  const fetchMock = stubFetch(remoteFile([], 'sha-1'), new Response('{}', { status: 200 }))

  await pushOps('secret-token', [{ room: 3301, doneAt: '2026-11-13T10:00:00+09:00' }], ROOMS, NOW)

  for (const [url, init] of fetchMock.mock.calls) {
    expect(String(url)).not.toContain('secret-token')
    expect(String(init?.body ?? '')).not.toContain('secret-token')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret-token')
  }
})
