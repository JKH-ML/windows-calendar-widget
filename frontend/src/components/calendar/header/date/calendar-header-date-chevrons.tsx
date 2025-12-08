import { Button } from '@/components/ui/button'
import { useCalendarContext } from '../../calendar-context'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { useLanguage } from '@/components/language-provider'

export default function CalendarHeaderDateChevrons() {
  const { date, setDate } = useCalendarContext()
  const { locale, resolvedLanguage } = useLanguage()

  function handleDateBackward() {
    setDate(subMonths(date, 1))
  }

  function handleDateForward() {
    setDate(addMonths(date, 1))
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="h-7 w-7 p-1"
        onClick={handleDateBackward}
      >
        <ChevronLeft className="min-w-5 min-h-5" />
      </Button>

      <span className="min-w-[140px] text-center font-medium">
        {resolvedLanguage === 'ko'
          ? format(date, 'yyyy년 M월 d일', { locale })
          : format(date, 'MMMM d, yyyy', { locale })}
      </span>

      <Button
        variant="outline"
        className="h-7 w-7 p-1"
        onClick={handleDateForward}
      >
        <ChevronRight className="min-w-5 min-h-5" />
      </Button>
    </div>
  )
}
