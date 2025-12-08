export type CalendarProps = {
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  mode: Mode
  setMode: (mode: Mode) => void
  date: Date
  setDate: (date: Date) => void
  weekStartsOn?: 0 | 1
  setWeekStartsOn?: (value: 0 | 1) => void
  calendarIconIsToday?: boolean
  api?: {
    create: (event: CalendarEvent) => Promise<void>
    update: (event: CalendarEvent) => Promise<void>
    remove: (id: string) => Promise<void>
  }
}

export type CalendarContextType = Omit<CalendarProps, 'weekStartsOn'> & {
  weekStartsOn: 0 | 1
  newEventDialogOpen: boolean
  setNewEventDialogOpen: (open: boolean) => void
  manageEventDialogOpen: boolean
  setManageEventDialogOpen: (open: boolean) => void
  selectedEvent: CalendarEvent | null
  setSelectedEvent: (event: CalendarEvent | null) => void
  dayEventsModalOpen: boolean
  setDayEventsModalOpen: (open: boolean) => void
}
export type CalendarEvent = {
  id: string
  title: string
  allDay: boolean
  color: string
  start: Date
  end: Date
  recurrence: string
  recurrenceCustom?: string
  location?: string
  alert: string
  alertOffset?: number
  description?: string
  syncStatus?: string
  googleEventId?: string
  googleCalendarId?: string
  timeZone?: string
  googleEtag?: string
  googleUpdatedAt?: string
}

export const calendarModes = ['day', 'week', 'month'] as const
export type Mode = (typeof calendarModes)[number]
