// Completion records live in a separate private repository. The app only ever touches this one file,
// and the write token is sent nowhere else.
const RECORDS_URL = 'https://api.github.com/repos/dev-aasha-inc/room-work-records/contents/records.json'

export class GithubError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`GitHub API responded with ${status}`)
    this.name = 'GithubError'
    this.status = status
  }
}

export interface RemoteFile {
  text: string
  sha: string
}

async function request(token: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(RECORDS_URL, {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new GithubError(response.status)
  return response.json()
}

export async function fetchRemote(token: string): Promise<RemoteFile> {
  const file = (await request(token)) as { sha?: unknown; content?: unknown } | null
  if (typeof file?.sha !== 'string' || typeof file.content !== 'string') {
    throw new Error('Unexpected GitHub response')
  }
  // The file is ASCII-only (room numbers and timestamps), so atob/btoa are sufficient.
  return { text: atob(file.content), sha: file.sha }
}

export async function putRemote(token: string, text: string, sha: string, message: string): Promise<void> {
  await request(token, { method: 'PUT', body: JSON.stringify({ message, content: btoa(text), sha }) })
}
