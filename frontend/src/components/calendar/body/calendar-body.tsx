import { useCalendarContext } from '../calendar-context'
import CalendarBodyMonth from './month/calendar-body-month'
import CalendarBodyWeek from './week/calendar-body-week'
import CalendarBodyDay from './day/calendar-body-day'

export default function CalendarBody() {
  const { mode } = useCalendarContext()

  if (mode === 'week') return <CalendarBodyWeek />
  if (mode === 'day') return <CalendarBodyDay />
  return <CalendarBodyMonth />
}
