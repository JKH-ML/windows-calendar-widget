import * as React from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { colorOptions } from '../calendar/calendar-tailwind-classes'

interface ColorPickerProps {
  field: {
    value: string
    onChange: (value: string) => void
  }
}

export function ColorPicker({ field }: ColorPickerProps) {
  return (
    <RadioGroup
      onValueChange={field.onChange}
      value={field.value}
      className="flex gap-2"
    >
      {colorOptions.map((color) => (
        <RadioGroupItem
          key={color.value}
          value={color.value}
          id={color.value}
          className={cn(
            'size-7 border-0 shadow-none transition-all duration-200 ring-1 ring-border/60'
          )}
          style={{ backgroundColor: color.hex, color: color.hex }}
          aria-label={color.label}
        />
      ))}
    </RadioGroup>
  )
}
