import { CalendarContext } from './calendar-context'
import { CalendarEvent, Mode } from './calendar-types'
import { useState } from 'react'
import CalendarNewEventDialog from './dialog/calendar-new-event-dialog'
import CalendarManageEventDialog from './dialog/calendar-manage-event-dialog'
import CalendarDayEventsModal from './dialog/calendar-day-events-modal'

export default function CalendarProvider({
  events,
  setEvents,
  mode,
  setMode,
  date,
  setDate,
  weekStartsOn = 0,
  setWeekStartsOn,
  calendarIconIsToday = true,
  api,
  children,
}: {
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  mode: Mode
  setMode: (mode: Mode) => void
  date: Date
  setDate: (date: Date) => void
  weekStartsOn?: 0 | 1
  setWeekStartsOn?: (value: 0 | 1) => void
  calendarIconIsToday: boolean
  api?: {
    create: (event: CalendarEvent) => Promise<void>
    update: (event: CalendarEvent) => Promise<void>
    remove: (id: string) => Promise<void>
  }
  children: React.ReactNode
}) {
  const [newEventDialogOpen, setNewEventDialogOpen] = useState(false)
  const [manageEventDialogOpen, setManageEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [dayEventsModalOpen, setDayEventsModalOpen] = useState(false)

  return (
    <CalendarContext.Provider
      value={{
        events,
        setEvents,
        mode,
        setMode,
        date,
        setDate,
        weekStartsOn,
        setWeekStartsOn,
        calendarIconIsToday,
        newEventDialogOpen,
        setNewEventDialogOpen,
        manageEventDialogOpen,
        setManageEventDialogOpen,
        selectedEvent,
        setSelectedEvent,
        dayEventsModalOpen,
        setDayEventsModalOpen,
        api,
      }}
    >
      <CalendarNewEventDialog />
      <CalendarManageEventDialog />
      <CalendarDayEventsModal />
      {children}
    </CalendarContext.Provider>
  )
}
