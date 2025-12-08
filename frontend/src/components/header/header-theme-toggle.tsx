'use client'

import { useEffect, useRef, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'

export function HeaderThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { t } = useLanguage()

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

  const options: {
    label: string
    value: 'light' | 'dark' | 'system'
    icon: JSX.Element
  }[] = [
    { label: t('themeLight'), value: 'light', icon: <Sun size={16} strokeWidth={2} /> },
    { label: t('themeDark'), value: 'dark', icon: <Moon size={16} strokeWidth={2} /> },
    {
      label: t('themeSystem'),
      value: 'system',
      icon: <Monitor size={16} strokeWidth={2} />,
    },
  ]

  return (
    <div className="relative" ref={containerRef}>
      <Button
        size="icon"
        variant="outline"
        className="h-7 w-7 p-1"
        aria-label={t('themeSelectAria')}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Sun
          size={14}
          strokeWidth={2}
          className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          aria-hidden="true"
        />
        <Moon
          size={14}
          strokeWidth={2}
          className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          aria-hidden="true"
        />
        <span className="sr-only">Toggle theme</span>
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setTheme(option.value)
                setOpen(false)
              }}
              aria-pressed={theme === option.value}
            >
              {option.icon}
              <span>{option.label}</span>
              {theme === option.value && (
                <span className="ml-auto text-[11px] font-medium text-primary">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
