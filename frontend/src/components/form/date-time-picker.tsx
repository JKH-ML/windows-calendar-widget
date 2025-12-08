'use client'

import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface DateTimePickerProps {
  field: {
    value: string
    onChange: (value: string) => void
  }
}

// Simple, reliable datetime-local input (browser native)
export function DateTimePicker({ field }: DateTimePickerProps) {
  const { resolvedLanguage } = useLanguage()
  const [value, setValue] = useState<string>(field.value || '')

  useEffect(() => {
    setValue(field.value || '')
  }, [field.value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setValue(next)
    field.onChange(next ? new Date(next).toISOString() : '')
  }

  return (
    <input
      type="datetime-local"
      value={value ? value.slice(0, 16) : ''}
      onChange={handleChange}
      className={cn(
        'w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-border'
      )}
      placeholder={
        resolvedLanguage === 'ko' ? 'YYYY-MM-DD hh:mm' : 'MM/DD/YYYY hh:mm'
      }
    />
  )
}
