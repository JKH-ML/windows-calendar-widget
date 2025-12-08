import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { HeaderThemeToggle } from './header-theme-toggle'
import CalendarHeaderDateChevrons from '@/components/calendar/header/date/calendar-header-date-chevrons'
import CalendarHeaderActionsAdd from '@/components/calendar/header/actions/calendar-header-actions-add'
import CalendarHeaderActionsSync from '@/components/calendar/header/actions/calendar-header-actions-sync'
import { useCalendarContext } from '@/components/calendar/calendar-context'
import HeaderMenu from './header-menu'
import { useLanguage } from '../language-provider'

type Props = {
  countryCode: string
  setCountryCode: (code: string) => void
  weekStartsOn: 0 | 1
  setWeekStartsOn: (value: 0 | 1) => void
}

export default function Header({
  countryCode,
  setCountryCode,
  weekStartsOn,
  setWeekStartsOn,
}: Props) {
  const { setDate } = useCalendarContext()
  const [now, setNow] = useState(new Date())
  const { locale } = useLanguage()

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center px-3 py-2">
      <button
        type="button"
        onClick={() => setDate(new Date())}
        className="text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {format(now, 'yyyy-MM-dd (EEE) a hh:mm', { locale })}
      </button>
      <div className="flex items-center justify-center gap-3">
        <CalendarHeaderDateChevrons />
      </div>
      <div className="flex items-center justify-end gap-2">
        <CalendarHeaderActionsSync />
        <CalendarHeaderActionsAdd />
        <HeaderThemeToggle />
        <HeaderMenu
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          weekStartsOn={weekStartsOn}
          setWeekStartsOn={setWeekStartsOn}
        />
      </div>
    </div>
  )
}
