'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/language-provider'
import { useWidgetVisibility } from '@/components/widget-visibility-context'
import { BrowserOpenURL, Quit } from '../../../wailsjs/runtime/runtime'
import PositionSizeDialog from './position-size-dialog'
import AccountDialog from './account-dialog'
import CalendarSettingsDialog from './calendar-settings-dialog'
import SearchDialog from './search-dialog'

type Props = {
  countryCode: string
  setCountryCode: (code: string) => void
  weekStartsOn: 0 | 1
  setWeekStartsOn: (value: 0 | 1) => void
}

export default function HeaderMenu({
  countryCode,
  setCountryCode,
  weekStartsOn,
  setWeekStartsOn,
}: Props) {
  const [open, setOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [positionDialogOpen, setPositionDialogOpen] = useState(false)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const {
    language,
    resolvedLanguage,
    setLanguage,
    t,
  } = useLanguage()
  const { closeWidget } = useWidgetVisibility()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!open) setLanguageOpen(false)
  }, [open])

  const languageLabel =
    language === 'auto'
      ? t('languageAuto')
      : language === 'ko'
        ? t('languageKorean')
        : t('languageEnglish')

  return (
    <div className="relative" ref={containerRef}>
      <Button
        size="icon"
        variant="outline"
        className="h-7 w-7 p-1"
        aria-label={t('menuButtonAria')}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Menu className="h-4 w-4" aria-hidden />
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
            onClick={() => {
              closeWidget()
              Quit()
              setOpen(false)
            }}
            type="button"
          >
            {t('menuClose')}
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
            onClick={() => {
              setPositionDialogOpen(true)
              setOpen(false)
            }}
            type="button"
          >
            {t('menuPosition')}
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
            onClick={() => {
              setAccountDialogOpen(true)
              setOpen(false)
            }}
            type="button"
          >
            {t('menuAccount')}
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
            onClick={() => {
              setCalendarDialogOpen(true)
              setOpen(false)
            }}
            type="button"
          >
            {t('menuCalendar')}
          </button>
          <div className="flex flex-col">
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
              onClick={() => setLanguageOpen((prev) => !prev)}
              type="button"
            >
              <span>{t('menuLanguage')}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {languageLabel}
              </span>
            </button>
            {languageOpen && (
              <div className="flex flex-col gap-1 px-2 pb-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                  onClick={() => {
                    setLanguage('auto')
                    setLanguageOpen(false)
                    setOpen(false)
                  }}
                  aria-pressed={language === 'auto'}
                >
                  <span className="text-xs">
                    {language === 'auto' ? '✓' : ''}
                  </span>
                  <span>자동 선택</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                  onClick={() => {
                    setLanguage('en')
                    setLanguageOpen(false)
                    setOpen(false)
                  }}
                  aria-pressed={language === 'en'}
                >
                  <span className="text-xs">{language === 'en' ? '✓' : ''}</span>
                  <span>{t('languageEnglish')}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                  onClick={() => {
                    setLanguage('ko')
                    setLanguageOpen(false)
                    setOpen(false)
                  }}
                  aria-pressed={language === 'ko'}
                >
                  <span className="text-xs">{language === 'ko' ? '✓' : ''}</span>
                  <span>{t('languageKorean')}</span>
                </button>
              </div>
            )}
          </div>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
            onClick={() => {
              setSearchDialogOpen(true)
              setOpen(false)
            }}
            type="button"
          >
            {t('menuSearch')}
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
            onClick={() => {
              BrowserOpenURL('https://open.kakao.com/me/maplestudy')
              setOpen(false)
            }}
            type="button"
          >
            {t('menuContact')}
          </button>
        </div>
      )}
      <PositionSizeDialog
        open={positionDialogOpen}
        onOpenChange={setPositionDialogOpen}
      />
      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
      />
      <CalendarSettingsDialog
        open={calendarDialogOpen}
        onOpenChange={setCalendarDialogOpen}
        value={countryCode}
        onChange={setCountryCode}
        weekStartsOn={weekStartsOn}
        onChangeWeekStartsOn={(v) => setWeekStartsOn(v)}
      />
      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />
    </div>
  )
}
