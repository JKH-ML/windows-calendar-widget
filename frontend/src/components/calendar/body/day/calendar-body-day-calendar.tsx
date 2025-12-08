import { useCalendarContext } from '../../calendar-context'
import { Calendar } from '@/components/ui/calendar'
import { useLanguage } from '@/components/language-provider'

export default function CalendarBodyDayCalendar() {
  const { date, setDate } = useCalendarContext()
  const { locale } = useLanguage()
  return (
    <Calendar
      selected={date}
      onSelect={(date: Date | undefined) => date && setDate(date)}
      mode="single"
      locale={locale}
    />
  )
}
