'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import {
  WindowSetPosition,
  WindowSetSize,
  WindowGetSize,
  WindowGetPosition,
  ScreenGetAll,
} from '../../../wailsjs/runtime/runtime'
import { useLanguage } from '@/components/language-provider'

const STORAGE_KEY = 'widget-position-size'

type PositionSizeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PositionSizeDialog({
  open,
  onOpenChange,
}: PositionSizeDialogProps) {
  const { resolvedLanguage } = useLanguage()
  const [width, setWidth] = useState<number>(890)
  const [height, setHeight] = useState<number>(800)
  const [x, setX] = useState<number>(1030)
  const [y, setY] = useState<number>(2)
  const [screen, setScreen] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  // Load saved state once
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.width) setWidth(parsed.width)
        if (parsed.height) setHeight(parsed.height)
        if (parsed.x !== undefined) setX(parsed.x)
        if (parsed.y !== undefined) setY(parsed.y)
      } catch {
        // ignore
      }
    }
  }, [])

  // Persist when values change
  useEffect(() => {
    const data = { width, height, x, y }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [width, height, x, y])

  useEffect(() => {
    if (!open) return
    async function fetchWindowState() {
      try {
        const size = await WindowGetSize()
        const pos = await WindowGetPosition()
        const screens = await ScreenGetAll()
        const screenInfo = screens?.find((s) => s.isPrimary) || screens?.[0]
        if (size) {
          setWidth(size.w)
          setHeight(size.h)
        }
        if (pos) {
          setX(pos.x)
          setY(pos.y)
        }
        if (screenInfo) {
          setScreen({ width: screenInfo.width, height: screenInfo.height })
        }
      } catch {
        // ignore
      }
    }
    fetchWindowState()
  }, [open])

  useEffect(() => {
    if (!open) return
    WindowSetSize(width, height)
  }, [width, height, open])

  useEffect(() => {
    if (!open) return
    WindowSetPosition(x, y)
  }, [x, y, open])

  const labels =
    resolvedLanguage === 'ko'
      ? {
          title: '위치와 크기 조정',
          width: '너비(px)',
          height: '높이(px)',
          x: 'X 좌표',
          y: 'Y 좌표',
          presets: '빠른 위치',
          presetNames: {
            tl: '왼쪽 위',
            bl: '왼쪽 아래',
            tr: '오른쪽 위',
            br: '오른쪽 아래',
            center: '가운데',
          },
        }
      : {
          title: 'Adjust position & size',
          width: 'Width (px)',
          height: 'Height (px)',
          x: 'X position',
          y: 'Y position',
          presets: 'Quick position',
          presetNames: {
            tl: 'Top left',
            bl: 'Bottom left',
            tr: 'Top right',
            br: 'Bottom right',
            center: 'Center',
          },
        }

  function applyPreset(preset: 'tl' | 'tr' | 'bl' | 'br' | 'center') {
    if (!screen.width || !screen.height) return
    const margin = 16
    const presets = {
      tl: { x: margin, y: margin },
      tr: { x: Math.max(screen.width - width - margin, margin), y: margin },
      bl: { x: margin, y: Math.max(screen.height - height - margin, margin) },
      br: {
        x: Math.max(screen.width - width - margin, margin),
        y: Math.max(screen.height - height - margin, margin),
      },
      center: {
        x: Math.max(Math.round((screen.width - width) / 2), margin),
        y: Math.max(Math.round((screen.height - height) / 2), margin),
      },
    }
    const target = presets[preset]
    setX(target.x)
    setY(target.y)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium space-y-1">
            <span>{labels.width}</span>
            <Input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              min={320}
            />
          </label>
          <label className="text-sm font-medium space-y-1">
            <span>{labels.height}</span>
            <Input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              min={320}
            />
          </label>
          <label className="text-sm font-medium space-y-1">
            <span>{labels.x}</span>
            <Input
              type="number"
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
            />
          </label>
          <label className="text-sm font-medium space-y-1">
            <span>{labels.y}</span>
            <Input
              type="number"
              value={y}
              onChange={(e) => setY(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{labels.presets}</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyPreset('tl')}
              className="rounded-md border px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {labels.presetNames.tl}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('tr')}
              className="rounded-md border px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {labels.presetNames.tr}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('center')}
              className="rounded-md border px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {labels.presetNames.center}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bl')}
              className="rounded-md border px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {labels.presetNames.bl}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('br')}
              className="rounded-md border px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {labels.presetNames.br}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
