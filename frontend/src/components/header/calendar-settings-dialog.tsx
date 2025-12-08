import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/language-provider'
import { GetSettings, UpdateSettings } from '../../../wailsjs/go/main/App'
import type { main } from '../../../wailsjs/go/models'
import StatusBanner from '../status-banner'

const countryOptions = [
  { code: 'KR', label: '대한민국', calendarId: 'ko.south_korea#holiday@group.v.calendar.google.com' },
  { code: 'US', label: '미국', calendarId: 'en.usa#holiday@group.v.calendar.google.com' },
  { code: 'GB', label: '영국', calendarId: 'en.uk#holiday@group.v.calendar.google.com' },
] as const

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (code: string) => void
  weekStartsOn: 0 | 1
  onChangeWeekStartsOn: (value: 0 | 1) => void
}

export default function CalendarSettingsDialog({
  open,
  onOpenChange,
  value,
  onChange,
  weekStartsOn,
  onChangeWeekStartsOn,
}: Props) {
  const { resolvedLanguage } = useLanguage()
  const [selected, setSelected] = useState<string>(value || 'KR')
  const [selectedWeekStart, setSelectedWeekStart] = useState<'sunday' | 'monday'>(
    weekStartsOn === 1 ? 'monday' : 'sunday'
  )
  const [autoStart, setAutoStart] = useState(true)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelected(value || 'KR')
    setSelectedWeekStart(weekStartsOn === 1 ? 'monday' : 'sunday')
  }, [value, open, weekStartsOn])

  useEffect(() => {
    if (!open) return
    async function load() {
      setLoadingSettings(true)
      setError(null)
      try {
        const s: main.AppSettings = await GetSettings()
        setAutoStart(s.autoStart ?? true)
      } catch (err: any) {
        setError(err?.message ?? String(err))
      } finally {
        setLoadingSettings(false)
      }
    }
    void load()
  }, [open])

  const title = resolvedLanguage === 'ko' ? '캘린더 설정' : 'Calendar settings'
  const desc =
    resolvedLanguage === 'ko'
      ? '공휴일 국가, 주 시작 요일, 시작 시 자동 실행을 설정하세요.'
      : 'Choose holiday country, week start, and auto-launch behavior.'
  const saveLabel = resolvedLanguage === 'ko' ? '저장' : 'Save'
  const weekStartLabel =
    resolvedLanguage === 'ko' ? '주 시작 요일' : 'Week starts on'
  const autoStartLabel =
    resolvedLanguage === 'ko' ? 'Windows 시작 시 자동 실행' : 'Launch at Windows startup'
  const autoStartDesc =
    resolvedLanguage === 'ko'
      ? '로그인 후 자동으로 위젯을 실행합니다.'
      : 'Start the widget automatically after you log in.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {error && <StatusBanner tone="error" message={error} />}
          <div className="flex flex-col gap-2">
            <Label htmlFor="country-select">
              {resolvedLanguage === 'ko' ? '공휴일 국가' : 'Holiday country'}
            </Label>
            <select
              id="country-select"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-start-toggle" className="font-semibold">
                {autoStartLabel}
              </Label>
              <input
                id="auto-start-toggle"
                type="checkbox"
                className="h-4 w-4"
                checked={autoStart}
                disabled={loadingSettings}
                onChange={(e) => setAutoStart(e.target.checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">{autoStartDesc}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="week-start-select">{weekStartLabel}</Label>
            <select
              id="week-start-select"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedWeekStart}
              onChange={(e) =>
                setSelectedWeekStart(
                  e.target.value === 'monday' ? 'monday' : 'sunday'
                )
              }
            >
              <option value="sunday">
                {resolvedLanguage === 'ko' ? '일요일' : 'Sunday'}
              </option>
              <option value="monday">
                {resolvedLanguage === 'ko' ? '월요일' : 'Monday'}
              </option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {resolvedLanguage === 'ko' ? '취소' : 'Cancel'}
            </Button>
            <Button
              disabled={loadingSettings}
              onClick={() => {
                onChange(selected)
                onChangeWeekStartsOn(selectedWeekStart === 'monday' ? 1 : 0)
                void UpdateSettings({ autoStart })
                onOpenChange(false)
              }}
            >
              {saveLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
