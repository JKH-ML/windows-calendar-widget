import { useCalendarContext } from '../calendar-context'
import CalendarBodyMonth from './month/calendar-body-month'

export default function CalendarBody() {
  useCalendarContext()

  return <CalendarBodyMonth />
}
