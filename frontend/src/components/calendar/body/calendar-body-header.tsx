import { format, isSameDay } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useLanguage } from '@/components/language-provider'

export default function CalendarBodyHeader({
  date,
  onlyDay = false,
}: {
  date: Date
  onlyDay?: boolean
}) {
  const { locale, resolvedLanguage } = useLanguage()
  const isToday = isSameDay(date, new Date())

  return (
    <div className="flex items-center justify-center gap-1 py-2 w-full sticky top-0 bg-background z-10 border-b">
      <span
        className={cn(
          'text-xs font-medium',
          isToday ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {format(date, 'EEE', { locale })}
      </span>
      {!onlyDay && (
        <span
          className={cn(
            'text-xs font-medium',
            isToday ? 'text-primary font-bold' : 'text-foreground'
          )}
        >
          {resolvedLanguage === 'ko'
            ? format(date, 'd일', { locale })
            : format(date, 'dd', { locale })}
        </span>
      )}
    </div>
  )
}
