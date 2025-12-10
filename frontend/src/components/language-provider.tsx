'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { enUS, ko } from 'date-fns/locale'
import type { Locale } from 'date-fns'

export type Language = 'auto' | 'en' | 'ko'
type ResolvedLanguage = 'en' | 'ko'

const translations = {
  en: {
    menuClose: 'Close calendar widget',
    menuPosition: 'Position & size',
    menuAccount: 'Account settings',
    menuCalendar: 'Calendar settings',
    menuLanguage: 'Language',
    menuSearch: 'Search events',
    menuContact: 'Contact us',
    searchTitle: 'Search events',
    searchPlaceholder: 'Search by title, description, or location',
    searchNoResults: 'No matching events found',
    searchError: 'Search failed. Please try again.',
    searchOpen: 'Open',
    languageAuto: 'Auto',
    languageEnglish: 'English',
    languageKorean: 'Korean',
    languageSystemPrefix: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    themeSelectAria: 'Select theme',
    addEventAria: 'Add event',
    menuButtonAria: 'Open menu',
    eventsTitle: 'Events',
    noEvents: 'No events today...',
    dialogCreateTitle: 'Create event',
    dialogManageTitle: 'Manage event',
    dialogFieldTitle: 'Title',
    dialogFieldStart: 'Start',
    dialogFieldEnd: 'End',
    dialogFieldColor: 'Color',
    dialogSubmitCreate: 'Create event',
    dialogSubmitUpdate: 'Update event',
    dialogDelete: 'Delete',
    dialogDeleteConfirmTitle: 'Delete event',
    dialogDeleteConfirmDescription:
      'Are you sure you want to delete this event? This action cannot be undone.',
    dialogCancel: 'Cancel',
    accountConnectedStatus: 'Google Calendar is connected.',
    accountDisconnectedStatus: 'Not connected to Google Calendar.',
    accountNotConfigured: 'Client ID/Secret not configured',
    accountNotConfiguredDesc:
      'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.',
    accountUnknownUser: 'Unknown user',
    accountUnknownEmail: 'No email',
    accountExpiresAt: 'Access token expires',
    accountScope: 'Scope',
    accountRefreshToken: 'Refresh token',
    accountYes: 'Yes',
    accountNo: 'No',
    accountLogoutButton: 'Log out',
    accountConnectHelp:
      'Start Google login to connect your calendar. After login, paste the code below.',
    accountStartSync: 'Connect Google Calendar',
    accountEnterCodePlaceholder: 'Paste auth code here',
    accountSubmitCode: 'Submit code',
    accountCodeHint:
      'Press "Connect Google Calendar" first to open the browser and get the code.',
    syncResult: 'Sync Calendar',
    statusConnected: 'Google connected',
    statusDisconnected: 'Google not connected',
    statusNotConfigured: 'Client ID/Secret missing',
    statusError: 'Connection error',
    statusHolidayAuthNeeded: 'Connect Google to show holidays.',
    statusSyncFailed: 'Sync failed. Please retry.',
    statusConflictBadge: 'Conflict',
    statusConflictHint:
      'This event differs between local and Google. Decide which version to keep.',
  },
  ko: {
    menuClose: '캘린더 위젯 닫기',
    menuPosition: '위치와 크기',
    menuAccount: '계정 설정',
    menuCalendar: '캘린더 설정',
    menuLanguage: '언어 설정',
    menuSearch: '일정 검색',
    menuContact: '문의하기',
    searchTitle: '일정 검색',
    searchPlaceholder: '제목, 장소, 메모로 검색하세요',
    searchNoResults: '일치하는 일정이 없습니다.',
    searchError: '검색에 실패했습니다. 다시 시도해 주세요.',
    searchOpen: '열기',
    languageAuto: '자동 선택',
    languageEnglish: '영어',
    languageKorean: '한국어',
    languageSystemPrefix: '시스템',
    themeLight: '라이트',
    themeDark: '다크',
    themeSystem: '시스템',
    themeSelectAria: '테마 선택',
    addEventAria: '일정 추가',
    menuButtonAria: '메뉴 열기',
    eventsTitle: '일정',
    noEvents: '오늘 일정이 없습니다.',
    dialogCreateTitle: '일정 생성',
    dialogManageTitle: '일정 관리',
    dialogFieldTitle: '제목',
    dialogFieldStart: '시작',
    dialogFieldEnd: '종료',
    dialogFieldColor: '색상',
    dialogSubmitCreate: '일정 생성',
    dialogSubmitUpdate: '일정 업데이트',
    dialogDelete: '삭제',
    dialogDeleteConfirmTitle: '일정 삭제',
    dialogDeleteConfirmDescription:
      '이 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    dialogCancel: '취소',
    accountConnectedStatus: 'Google Calendar에 연결됨.',
    accountDisconnectedStatus: '아직 Google Calendar와 연동되지 않았습니다.',
    accountNotConfigured: '클라이언트 ID/Secret 미설정',
    accountNotConfiguredDesc:
      'GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 설정해야 로그인할 수 있습니다.',
    accountUnknownUser: '알 수 없는 사용자',
    accountUnknownEmail: '이메일 없음',
    accountExpiresAt: '액세스 토큰 만료',
    accountScope: '스코프',
    accountRefreshToken: '리프레시 토큰',
    accountYes: '예',
    accountNo: '아니오',
    accountLogoutButton: '로그아웃',
    accountConnectHelp:
      '브라우저에서 Google 로그인을 진행한 후, 발급된 코드를 아래에 붙여넣으세요.',
    accountStartSync: 'Google Calendar 연동 시작',
    accountEnterCodePlaceholder: '인증 코드를 여기에 붙여넣기',
    accountSubmitCode: '코드 제출',
    accountCodeHint:
      '"Google Calendar 연동 시작"을 먼저 눌러 브라우저에서 코드를 받아주세요.',
    syncResult: '캘린더 동기화',
    statusConnected: 'Google 연동됨',
    statusDisconnected: 'Google 미연동',
    statusNotConfigured: '클라이언트 ID/Secret 필요',
    statusError: '연결 오류',
    statusHolidayAuthNeeded: '공휴일 표시를 위해 Google 연동이 필요합니다.',
    statusSyncFailed: '동기화에 실패했습니다. 다시 시도해 주세요.',
    statusConflictBadge: '충돌',
    statusConflictHint:
      '이 이벤트가 로컬과 Google에 다르게 존재합니다. 어떤 값을 유지할지 결정해 주세요.',
  },
}

type TranslationKey = keyof typeof translations.en

type LanguageContextValue = {
  language: Language
  resolvedLanguage: ResolvedLanguage
  systemLanguage: ResolvedLanguage
  setLanguage: React.Dispatch<React.SetStateAction<Language>>
  locale: Locale
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
)

function detectSystemLanguage(): ResolvedLanguage {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language?.toLowerCase() ?? ''
  return lang.startsWith('ko') ? 'ko' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('auto')
  const [systemLanguage, setSystemLanguage] =
    useState<ResolvedLanguage>('en')

  useEffect(() => {
    setSystemLanguage(detectSystemLanguage())
  }, [])

  const resolvedLanguage =
    language === 'auto' ? systemLanguage : language

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      resolvedLanguage,
      systemLanguage,
      setLanguage,
      locale: resolvedLanguage === 'ko' ? ko : enUS,
      t: (key: TranslationKey) => translations[resolvedLanguage][key],
    }),
    [language, resolvedLanguage, systemLanguage]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
