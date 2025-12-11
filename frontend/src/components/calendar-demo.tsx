'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarEvent, Mode } from './calendar/calendar-types'
import CalendarProvider from './calendar/calendar-provider'
import CalendarBody from './calendar/body/calendar-body'
import Header from './header/header'
import {
  ListEvents,
  CreateEvent,
  UpdateEvent,
  DeleteEvent,
  GoogleSync,
  GoogleListHolidays,
} from '../../wailsjs/go/main/App'
import { pushLocalChanges } from '@/lib/sync-client'
import { useLanguage } from './language-provider'
import { useHolidaySettings } from './hooks/use-holiday-settings'

export default function CalendarDemo() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [mode] = useState<Mode>('month')
  const [date, setDate] = useState<Date>(new Date())
  const isFocusSyncing = useRef(false)
  const { resolvedLanguage } = useLanguage()
  const {
    countryCode,
    setCountryCode,
    weekStartsOn,
    setWeekStartsOn,
  } = useHolidaySettings()
  const syncingRef = useRef(false)

  async function syncAndLoad() {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      await GoogleSync()
      const data = await ListEvents()
      const holidays = await GoogleListHolidays(countryCode || resolvedLanguage)
      setEvents(
        [...data, ...holidays].map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }))
      )
    } catch (error) {
      console.warn('Sync and load failed', error)
    } finally {
      syncingRef.current = false
    }
  }

  useEffect(() => {
    function handleClear() {
      setEvents([])
    }
    window.addEventListener('local-data-cleared', handleClear)
    return () => window.removeEventListener('local-data-cleared', handleClear)
  }, [])

  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await ListEvents()
        let holidays: any[] = []
        try {
          holidays = await GoogleListHolidays(countryCode || resolvedLanguage)
        } catch (error) {
          // Ignore holiday sync failures silently; Google auth may be missing.
          holidays = []
        }
        setEvents(
          [
            ...data,
            ...holidays,
          ].map((e: any) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          }))
        )
      } catch (error) {
        console.error('Failed to load events', error)
      }
    }
    fetchEvents()
  }, [resolvedLanguage, countryCode])

  useEffect(() => {
    async function syncOnFocus() {
      if (isFocusSyncing.current) return
      isFocusSyncing.current = true
      try {
        await syncAndLoad()
      } finally {
        isFocusSyncing.current = false
      }
    }
    window.addEventListener('focus', syncOnFocus)
    return () => {
      window.removeEventListener('focus', syncOnFocus)
    }
  }, [countryCode, resolvedLanguage])

  useEffect(() => {
    const onConnected = () => {
      void syncAndLoad()
    }
    window.addEventListener('google-connected', onConnected)
    return () => window.removeEventListener('google-connected', onConnected)
  }, [countryCode, resolvedLanguage])

  const api = {
    async create(event: CalendarEvent) {
      const created = await CreateEvent({
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
      } as any)
      setEvents((prev) => [
        ...prev,
        { ...created, start: new Date(created.start), end: new Date(created.end) },
      ])
      void pushLocalChanges()
    },
    async update(event: CalendarEvent) {
      const updated = await UpdateEvent({
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
      } as any)
      setEvents((prev) =>
        prev.map((e) =>
          e.id === updated.id
            ? { ...updated, start: new Date(updated.start), end: new Date(updated.end) }
            : e
        )
      )
      void pushLocalChanges()
    },
    async remove(id: string) {
      await DeleteEvent(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
      void pushLocalChanges()
    },
  }

  return (
    <CalendarProvider
      events={events}
      setEvents={setEvents}
      mode={mode}
      setMode={() => {}}
      date={date}
      setDate={setDate}
      weekStartsOn={weekStartsOn}
      setWeekStartsOn={(v) => setWeekStartsOn(v)}
      calendarIconIsToday
      api={api}
    >
      <div className="flex flex-col gap-0">
        <Header
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          weekStartsOn={weekStartsOn}
          setWeekStartsOn={(v) => setWeekStartsOn(v)}
        />
        <div className="rounded-2xl border bg-card shadow-2xl shadow-black/5">
          <div className="flex flex-col">
            <CalendarBody />
          </div>
        </div>
      </div>
    </CalendarProvider>
  )
}
