import { Button } from '@/components/ui/button'
import { CalendarPlus } from 'lucide-react'
import { useCalendarContext } from '../../calendar-context'
import { useLanguage } from '@/components/language-provider'

export default function CalendarHeaderActionsAdd() {
  const { setNewEventDialogOpen } = useCalendarContext()
  const { t } = useLanguage()
  return (
    <Button
      className="flex items-center justify-center h-7 w-7 p-1 disabled:opacity-100"
      variant="outline"
      size="icon"
      onClick={() => setNewEventDialogOpen(true)}
      aria-label={t('addEventAria')}
    >
      <CalendarPlus className="h-4 w-4" />
    </Button>
  )
}
