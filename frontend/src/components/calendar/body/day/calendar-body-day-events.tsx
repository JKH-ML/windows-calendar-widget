import { useCalendarContext } from '../../calendar-context'
import { isSameDay } from 'date-fns'
import { useLanguage } from '@/components/language-provider'
import { colorOptions } from '../../calendar-tailwind-classes'

export default function CalendarBodyDayEvents() {
  const { events, date, setManageEventDialogOpen, setSelectedEvent } =
    useCalendarContext()
  const { t } = useLanguage()
  const dayEvents = events.filter((event) => isSameDay(event.start, date))
  const colorHexMap = Object.fromEntries(colorOptions.map((c) => [c.value, c.hex]))

  return !!dayEvents.length ? (
    <div className="flex flex-col gap-2">
      <p className="font-medium p-2 pb-0 font-heading">{t('eventsTitle')}</p>
      <div className="flex flex-col gap-2">
        {dayEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-2 px-2 cursor-pointer"
            onClick={() => {
              setSelectedEvent(event)
              setManageEventDialogOpen(true)
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-1.5 h-3 rounded-sm"
                aria-hidden
              >
                <span
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    backgroundColor:
                      colorHexMap[event.color as keyof typeof colorHexMap] ?? '#38bdf8',
                  }}
                />
              </span>
              <p className="text-foreground text-sm font-medium truncate">
                {event.title}
              </p>
              {!event.allDay && (
                <span className="text-xs text-foreground/80">
                {`${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` +
                  ` - ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  ) : (
    <div className="p-2 text-muted-foreground">{t('noEvents')}</div>
  )
}
