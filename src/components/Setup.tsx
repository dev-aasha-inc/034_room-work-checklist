import { Check, Copy, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchRemote, GithubError, putRemote } from '@/lib/github'

type Phase = 'idle' | 'checking' | 'ready' | 'failed'

function failureMessage(error: unknown): string {
  if (error instanceof GithubError && error.status === 401) return '鍵が正しくありません。貼り付けた文字を確認してください。'
  if (error instanceof GithubError && [403, 404].includes(error.status)) {
    return 'この鍵では記録用リポジトリに書き込めません。対象リポジトリと Contents の権限を確認してください。'
  }
  return 'GitHub に接続できませんでした。少し待ってからもう一度試してください。'
}

/** Admin-only page (#setup): turns a write token into the link that is handed to the field worker. */
export function Setup() {
  const [token, setToken] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [failure, setFailure] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const trimmed = token.trim()

  const verify = async () => {
    setPhase('checking')
    try {
      // Read the file and write it back unchanged: proves the token can do both before it is handed out.
      const remote = await fetchRemote(trimmed)
      await putRemote(trimmed, remote.text, remote.sha, 'chore: verify write access')
      setPhase('ready')
    } catch (error) {
      setFailure(failureMessage(error))
      setPhase('failed')
    }
  }

  const copyLink = async () => {
    // The token travels in the URL fragment, which browsers never send to the server.
    const link = `${window.location.origin}${window.location.pathname}#k=${encodeURIComponent(trimmed)}`
    await navigator.clipboard.writeText(link)
    setIsCopied(true)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-10">
      <header className="flex flex-col gap-2">
        <KeyRound className="size-8" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">現場用リンクを作る</h1>
        <p className="text-muted-foreground">
          記録用リポジトリに書き込める鍵（トークン）を貼ると、現場のスマホで開くリンクができます。鍵はこの画面には保存されません。
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label htmlFor="token" className="text-sm font-medium">
          書き込み用の鍵
        </label>
        <Input
          id="token"
          type="password"
          autoComplete="off"
          placeholder="github_pat_..."
          className="h-12"
          value={token}
          aria-invalid={phase === 'failed'}
          aria-describedby={phase === 'failed' ? 'token-error' : undefined}
          onChange={(event) => {
            setToken(event.target.value)
            setPhase('idle')
            setIsCopied(false)
          }}
        />
        {phase === 'failed' && (
          <p id="token-error" role="alert" className="text-sm text-destructive">
            {failure}
          </p>
        )}
      </div>

      {phase === 'ready' ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-1.5 font-semibold text-done">
            <Check className="size-5" aria-hidden="true" />
            鍵を確認しました
          </p>
          <Button className="h-14 gap-2 text-lg" onClick={copyLink}>
            <Copy className="size-5" aria-hidden="true" />
            {isCopied ? 'コピーしました' : '現場用リンクをコピー'}
          </Button>
          <p className="text-sm text-muted-foreground">
            このリンクを知っている人は記録を書き換えられます。作業する人にだけ送り、作業が終わったら GitHub で鍵を削除してください。
          </p>
        </div>
      ) : (
        <Button className="h-14 text-lg" disabled={!trimmed || phase === 'checking'} onClick={verify}>
          {phase === 'checking' ? '確認中…' : '鍵を確認する'}
        </Button>
      )}
    </main>
  )
}
