import { useEffect, useState } from 'react'

const STORAGE_KEY = 'holiday-country-code'
const WEEK_START_KEY = 'calendar-week-start'

export function useHolidaySettings() {
  const [countryCode, setCountryCodeState] = useState<string>('KR')
  const [weekStartsOn, setWeekStartsOnState] = useState<0 | 1>(0) // 0: Sunday, 1: Monday

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setCountryCodeState(stored)
    }
    const storedWeekStart = localStorage.getItem(WEEK_START_KEY)
    if (storedWeekStart === 'monday') {
      setWeekStartsOnState(1)
    } else if (storedWeekStart === 'sunday') {
      setWeekStartsOnState(0)
    }
  }, [])

  function setCountryCode(code: string) {
    setCountryCodeState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }

  function setWeekStartsOn(value: 0 | 1) {
    setWeekStartsOnState(value)
    localStorage.setItem(WEEK_START_KEY, value === 1 ? 'monday' : 'sunday')
  }

  return {
    countryCode,
    setCountryCode,
    weekStartsOn,
    setWeekStartsOn,
  }
}
