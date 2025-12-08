'use client'

import { useCalendarContext } from '../calendar-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isSameDay, format } from 'date-fns'
import { colorOptions } from '../calendar-tailwind-classes'
import { useLanguage } from '@/components/language-provider'

const colorHexMap = Object.fromEntries(colorOptions.map((c) => [c.value, c.hex]))

export default function CalendarDayEventsModal() {
  const {
    events,
    date,
    setDate,
    setSelectedEvent,
    setManageEventDialogOpen,
    dayEventsModalOpen,
    setDayEventsModalOpen,
  } = useCalendarContext()
  const { locale, resolvedLanguage } = useLanguage()

  const dayEvents = events.filter((event) => isSameDay(event.start, date))

  return (
    <Dialog open={dayEventsModalOpen} onOpenChange={setDayEventsModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {resolvedLanguage === 'ko'
              ? format(date, 'yyyy년 M월 d일', { locale })
              : format(date, 'MMMM d, yyyy', { locale })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {dayEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {resolvedLanguage === 'ko' ? '일정이 없습니다.' : 'No events.'}
            </p>
          )}
          {dayEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className="flex flex-col rounded-md border bg-transparent px-3 py-2 text-left hover:bg-accent/30 transition-colors"
              onClick={() => {
                setSelectedEvent(event)
                setManageEventDialogOpen(true)
                setDayEventsModalOpen(false)
                setDate(event.start)
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-1.5 h-3 rounded-sm"
                  style={{
                    backgroundColor:
                      colorHexMap[event.color as keyof typeof colorHexMap] ?? '#38bdf8',
                  }}
                  aria-hidden
                />
                <span className="font-semibold text-foreground truncate">
                  {event.title}
                </span>
              </div>
              {!event.allDay && (
                <span className="text-xs text-muted-foreground">
                  {format(event.start, 'p', { locale })} - {format(event.end, 'p', { locale })}
                </span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
