import { useCalendarContext } from '../../calendar-context'
import { isSameMonth } from 'date-fns'
import { useLanguage } from '@/components/language-provider'

export default function CalendarHeaderDateBadge() {
  const { events, date } = useCalendarContext()
  const { resolvedLanguage } = useLanguage()
  const monthEvents = events.filter((event) => isSameMonth(event.start, date))

  if (!monthEvents.length) return null
  return (
    <div className="whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-xs">
      {resolvedLanguage === 'ko'
        ? `${monthEvents.length}개 일정`
        : `${monthEvents.length} events`}
    </div>
  )
}
