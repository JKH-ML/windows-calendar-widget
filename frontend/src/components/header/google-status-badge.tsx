import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, PlugZap, Loader2 } from 'lucide-react'
import { GoogleTokenInfo } from '../../../wailsjs/go/main/App'
import type { main } from '../../../wailsjs/go/models'
import { cn } from '@/lib/utils'
import { useLanguage } from '../language-provider'

type Status = 'loading' | 'connected' | 'disconnected' | 'notConfigured' | 'error'

export default function GoogleStatusBadge() {
  const { t } = useLanguage()
  const [status, setStatus] = useState<Status>('loading')
  const [info, setInfo] = useState<main.GoogleTokenInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      setStatus('loading')
      try {
        const data = await GoogleTokenInfo()
        if (cancelled) return
        setInfo(data)
        if (!data.clientConfigured) {
          setStatus('notConfigured')
        } else if (data.connected) {
          setStatus('connected')
        } else {
          setStatus('disconnected')
        }
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message ?? String(err))
        setStatus('error')
      }
    }
    void load()
    const id = setInterval(load, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const label =
    status === 'connected'
      ? t('statusConnected')
      : status === 'disconnected'
        ? t('statusDisconnected')
        : status === 'notConfigured'
          ? t('statusNotConfigured')
          : status === 'error'
            ? t('statusError')
            : '...'

  const tone =
    status === 'connected'
      ? 'border-emerald-500/40 text-emerald-600 bg-emerald-50'
      : status === 'notConfigured'
        ? 'border-border text-muted-foreground bg-muted/40'
        : status === 'disconnected'
          ? 'border-amber-500/40 text-amber-700 bg-amber-50'
          : status === 'error'
            ? 'border-destructive/60 text-destructive bg-destructive/10'
            : 'border-border text-muted-foreground bg-muted/30'

  const Icon =
    status === 'connected'
      ? CheckCircle2
      : status === 'disconnected'
        ? PlugZap
        : status === 'notConfigured'
          ? PlugZap
          : status === 'error'
            ? AlertCircle
            : Loader2

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium',
        tone
      )}
      title={error ?? info?.userEmail ?? ''}
    >
      <Icon className={cn('h-3.5 w-3.5', status === 'loading' && 'animate-spin')} />
      <span className="whitespace-nowrap max-w-[180px] truncate">{label}</span>
    </div>
  )
}
