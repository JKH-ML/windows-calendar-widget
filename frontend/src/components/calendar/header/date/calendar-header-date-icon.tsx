import { format } from 'date-fns'
import { useCalendarContext } from '../../calendar-context'
import { useLanguage } from '@/components/language-provider'
export default function CalendarHeaderDateIcon() {
  const { calendarIconIsToday, date: calendarDate } = useCalendarContext()
  const { locale } = useLanguage()
  const date = calendarIconIsToday ? new Date() : calendarDate
  return (
    <div className="flex size-14 flex-col items-start overflow-hidden rounded-lg border">
      <p className="flex h-6 w-full items-center justify-center bg-primary text-center text-xs font-semibold text-background uppercase">
        {format(date, 'MMM', { locale })}
      </p>
      <p className="flex w-full items-center justify-center text-lg font-bold">
        {format(date, 'dd', { locale })}
      </p>
    </div>
  )
}
