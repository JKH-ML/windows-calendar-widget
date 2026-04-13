'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarEvent } from './calendar/calendar-types'
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
import StatusBanner from './status-banner'
import { GoogleTokenInfo } from '../../wailsjs/go/main/App'
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime'

const HOMEPAGE_URL = 'https://jkh-ml.github.io/windows-calendar-widget/'

export default function CalendarDemo() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [date, setDate] = useState<Date>(new Date())
  const [syncError, setSyncError] = useState<string | null>(null)
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)
  const isFocusSyncing = useRef(false)
  const { resolvedLanguage, t } = useLanguage()

  // 구글 연결 상태 확인 (배너 표시용)
  useEffect(() => {
    GoogleTokenInfo()
      .then((info) => setGoogleConnected(info.connected))
      .catch(() => setGoogleConnected(false))
  }, [])

  useEffect(() => {
    function handleConnected() { setGoogleConnected(true) }
    function handleCleared() { setGoogleConnected(false) }
    window.addEventListener('google-connected', handleConnected)
    window.addEventListener('local-data-cleared', handleCleared)
    return () => {
      window.removeEventListener('google-connected', handleConnected)
      window.removeEventListener('local-data-cleared', handleCleared)
    }
  }, [])
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
      setSyncError(null)
    } catch (error: any) {
      console.warn('Sync and load failed', error)
      // Google 미연동 상태의 실패는 예상된 동작이므로 에러 배너 표시 안 함
      if (googleConnected) {
        setSyncError(t('statusSyncFailed'))
      }
    } finally {
      syncingRef.current = false
    }
  }

  useEffect(() => {
    function handleClear() { setEvents([]) }
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
      mode="month"
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
        {syncError && (
          <div className="px-3 pt-2 flex items-center gap-2">
            <div className="flex-1">
              <StatusBanner tone="error" message={syncError} />
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm px-1"
              onClick={() => setSyncError(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div className="rounded-2xl border bg-card shadow-2xl shadow-black/5">
          <div className="flex flex-col">
            <CalendarBody />
          </div>
        </div>

        {googleConnected === false && (
          <div className="rounded-2xl border bg-muted/30 px-5 py-4 flex flex-col gap-2 text-sm">
            <p className="font-semibold text-foreground">
              {resolvedLanguage === 'ko'
                ? '📅 Google Calendar 연동 없이도 일정을 직접 추가하고 관리할 수 있습니다.'
                : '📅 You can add and manage events directly without Google Calendar.'}
            </p>
            <p className="text-muted-foreground">
              {resolvedLanguage === 'ko'
                ? 'Google Calendar와 연동하면 기존 일정을 자동으로 동기화할 수 있습니다. 우측 상단 메뉴 → 계정 설정에서 연동하세요.'
                : 'Connect Google Calendar to sync your existing events automatically. Go to menu → Account settings to connect.'}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                className="text-xs text-primary underline hover:opacity-70 transition-opacity"
                onClick={() => BrowserOpenURL(HOMEPAGE_URL)}
              >
                {resolvedLanguage === 'ko' ? '앱 소개 보기 →' : 'Learn more →'}
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground underline hover:opacity-70 transition-opacity"
                onClick={() => BrowserOpenURL(HOMEPAGE_URL + 'privacy.html')}
              >
                {resolvedLanguage === 'ko' ? '개인정보처리방침' : 'Privacy policy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </CalendarProvider>
  )
}
