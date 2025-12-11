import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/language-provider'
import { GoogleTokenInfo } from '../../../../../wailsjs/go/main/App'
import type { main } from '../../../../../wailsjs/go/models'

type Props = {
  onOpenAccountDialog: () => void
}

export default function CalendarHeaderActionsSync({
  onOpenAccountDialog,
}: Props) {
  const { t } = useLanguage()
  const [info, setInfo] = useState<main.GoogleTokenInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await GoogleTokenInfo()
        if (cancelled) return
        setInfo(data)
      } catch (error) {
        if (cancelled) return
        console.warn('Failed to load Google token info', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const id = setInterval(load, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const connected = !!(info?.clientConfigured && info.connected)
  const Icon = loading ? Loader2 : connected ? Cloud : CloudOff
  const label = connected ? t('statusConnected') : t('statusDisconnected')

  return (
    <Button
      className="flex items-center justify-center h-7 w-7 p-1 disabled:opacity-100"
      variant="outline"
      size="icon"
      onClick={onOpenAccountDialog}
      aria-label={label}
      title={label}
      type="button"
    >
      <Icon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </Button>
  )
}
