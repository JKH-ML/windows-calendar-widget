import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  isWithinInterval,
} from 'date-fns'
import { cn } from '@/lib/utils'
import CalendarEvent from '../../calendar-event'
import { AnimatePresence, motion } from 'framer-motion'
import { useLanguage } from '@/components/language-provider'
import { useCalendarContext } from '../../calendar-context'

export default function CalendarBodyMonth() {
  const {
    date,
    events,
    setDate,
    setDayEventsModalOpen,
    weekStartsOn,
    setNewEventDialogOpen,
  } = useCalendarContext()
  const { resolvedLanguage } = useLanguage()

  // Get the first day of the month
  const monthStart = startOfMonth(date)
  // Get the last day of the month
  const monthEnd = endOfMonth(date)

  // Get the first Monday of the first week (may be in previous month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn })
  // Get the last day of the last week (may be in next month)
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn })

  // Get all days between start and end
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  const today = new Date()

  // Filter events to only show those within the current month view
  const visibleEvents = events.filter(
    (event) =>
      isWithinInterval(event.start, {
        start: calendarStart,
        end: calendarEnd,
      }) ||
      isWithinInterval(event.end, { start: calendarStart, end: calendarEnd })
  )

  return (
    <div className="flex flex-col flex-grow overflow-hidden">
      <div className="hidden md:grid grid-cols-7 border-border divide-x divide-border">
        {(() => {
          const base =
            resolvedLanguage === 'ko'
              ? ['일', '월', '화', '수', '목', '금', '토']
              : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          return weekStartsOn === 1
            ? [...base.slice(1), base[0]]
            : base
        })().map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground border-b border-border"
          >
            {day}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={monthStart.toISOString()}
          className="grid md:grid-cols-7 flex-grow overflow-y-auto relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
        >
          {calendarDays.map((day) => {
            const dayEvents = visibleEvents.filter((event) =>
              isSameDay(event.start, day)
            )
            const isToday = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, date)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative flex flex-col border-b border-r p-2 aspect-square cursor-pointer',
                  !isCurrentMonth && 'bg-muted/50 hidden md:flex'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setDate(day)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setDate(day)
                  setNewEventDialogOpen(true)
                }}
              >
                <div
                  className={cn(
                    'text-sm font-medium w-fit p-1 flex flex-col items-center justify-center rounded-full aspect-square',
                    isToday && 'bg-primary text-background',
                    !isToday && isSameDay(day, date) && 'border border-current'
                  )}
                >
                  {format(day, 'd')}
                </div>
                <AnimatePresence mode="wait">
                  <div className="flex flex-col gap-1 mt-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <CalendarEvent
                        key={event.id}
                        event={event}
                        className="relative h-auto"
                        month
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <motion.div
                        key={`more-${day.toISOString()}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.2,
                        }}
                        className="text-xs text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDate(day)
                          setDayEventsModalOpen(true)
                        }}
                      >
                        {resolvedLanguage === 'ko'
                          ? `+${dayEvents.length - 3}개 더보기`
                          : `+${dayEvents.length - 3} more`}
                      </motion.div>
                    )}
                  </div>
                </AnimatePresence>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
