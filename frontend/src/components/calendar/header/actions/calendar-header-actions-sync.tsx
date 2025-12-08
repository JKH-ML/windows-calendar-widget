import { useEffect, useState } from 'react'
import { Cloud, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/language-provider'
import { useCalendarContext } from '../../calendar-context'
import { GoogleSync, ListEvents } from '../../../../../wailsjs/go/main/App'

export default function CalendarHeaderActionsSync() {
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)
  const { t } = useLanguage()
  const { setEvents } = useCalendarContext()
  const emitError = (message: string) =>
    window.dispatchEvent(new CustomEvent('sync-error', { detail: message }))
  const emitOk = () => window.dispatchEvent(new Event('sync-ok'))

  useEffect(() => {
    if (!justSynced) return
    const timer = setTimeout(() => setJustSynced(false), 3000)
    return () => clearTimeout(timer)
  }, [justSynced])

  async function handleSync() {
    if (syncing || justSynced) return
    setSyncing(true)
    try {
      await GoogleSync()
      const data = await ListEvents()
      setEvents(
        data.map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }))
      )
      emitOk()
    } catch (err: any) {
      emitError(err?.message ?? String(err))
    } finally {
      setSyncing(false)
      setJustSynced(true)
    }
  }

  return (
    <Button
      className="flex items-center justify-center h-7 w-7 p-1 disabled:opacity-100"
      variant="outline"
      size="icon"
      onClick={handleSync}
      disabled={syncing || justSynced}
      aria-label={t('syncResult')}
      title={t('syncResult')}
    >
      {justSynced ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Cloud className="h-4 w-4" />
      )}
    </Button>
  )
}
