import { useCalendarContext } from '../../calendar-context'
import { startOfWeek, addDays } from 'date-fns'
import CalendarBodyMarginDayMargin from '../day/calendar-body-margin-day-margin'
import CalendarBodyDayContent from '../day/calendar-body-day-content'
export default function CalendarBodyWeek() {
  const { date, weekStartsOn } = useCalendarContext()

  const weekStart = startOfWeek(date, { weekStartsOn })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="flex divide-x flex-grow overflow-hidden">
      <div className="flex flex-col flex-grow divide-y overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="relative flex flex-1 divide-x flex-col md:flex-row">
            <CalendarBodyMarginDayMargin className="hidden md:block" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="flex flex-1 divide-x md:divide-x-0"
              >
                <CalendarBodyMarginDayMargin className="block md:hidden" />
                <CalendarBodyDayContent date={day} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
