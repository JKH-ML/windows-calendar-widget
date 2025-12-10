import { useEffect, useMemo, useState } from 'react'
import { format, isValid } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/components/language-provider'
import { SearchEvents } from '../../../wailsjs/go/main/App'
import type { main } from '../../../wailsjs/go/models'
import { useCalendarContext } from '../calendar/calendar-context'
import { Loader2, Search as SearchIcon } from 'lucide-react'
import { colorOptions } from '../calendar/calendar-tailwind-classes'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const colorHexMap: Record<string, string> = Object.fromEntries(
  colorOptions.map((c) => [c.value, c.hex])
) as Record<string, string>

export default function SearchDialog({ open, onOpenChange }: Props) {
  const { t, locale } = useLanguage()
  const {
    setSelectedEvent,
    setManageEventDialogOpen,
    setDate,
  } = useCalendarContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<main.CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setResults([])
      setQuery('')
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setError(null)
      return
    }
    const handler = setTimeout(async () => {
      if (typeof SearchEvents !== 'function') {
        setError(t('searchError'))
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await SearchEvents(trimmed, '', '', 50)
        const safeResults = Array.isArray(res) ? res : []
        setResults(safeResults)
      } catch (err: any) {
        setError(t('searchError'))
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open])

  const renderedResults = useMemo(
    () =>
      results
        .map((event) => {
          const start = new Date(event.start)
          const end = new Date(event.end)
          if (!isValid(start) || !isValid(end)) {
            return null
          }
          const isAllDay = event.allDay || event.recurrence === 'allday'
          const color =
            colorHexMap[event.color] ||
            colorHexMap[event.googleCalendarId || ''] ||
            '#94a3b8'
          const range = isAllDay
            ? format(start, 'yyyy-MM-dd', { locale })
            : `${format(start, 'yyyy-MM-dd HH:mm', { locale })} → ${format(end, 'HH:mm', { locale })}`
          return { event, start, end, isAllDay, color, range }
        })
        .filter(Boolean) as {
        event: main.CalendarEvent
        start: Date
        end: Date
        isAllDay: boolean
        color: string
        range: string
      }[],
    [results, locale]
  )

  function openEvent(evt: main.CalendarEvent) {
    const selected = {
      ...evt,
      start: new Date(evt.start),
      end: new Date(evt.end),
    } as any
    setSelectedEvent(selected)
    setManageEventDialogOpen(true)
    setDate(new Date(evt.start))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="gap-1">
          <DialogTitle>{t('searchTitle')}</DialogTitle>
          <DialogDescription>
            {t('searchPlaceholder')}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-96 overflow-y-auto rounded-lg border bg-muted/30 p-2">
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('searchTitle')}
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error || t('searchError')}
            </div>
          ) : renderedResults.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              {t('searchNoResults')}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {renderedResults.map(({ event, range, color }) => (
                <button
                  key={event.id}
                  type="button"
                  className="flex w-full flex-col gap-1 rounded-md border bg-background px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent/40"
                  onClick={() => openEvent(event)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: color, borderColor: color }}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold leading-tight">
                      {event.title || '(no title)'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{range}</div>
                  {(event.location || event.description) && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {event.location || event.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
