import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/components/language-provider'
import {
  GoogleAuthURL,
  GoogleExchangeCode,
  GoogleLogout,
  GoogleTokenInfo,
} from '../../../wailsjs/go/main/App'
import type { main } from '../../../wailsjs/go/models'
import { BrowserOpenURL } from '../../../wailsjs/runtime/runtime'
import GoogleStatusBadge from './google-status-badge'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AccountDialog({ open, onOpenChange }: Props) {
  const { locale, t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<main.GoogleTokenInfo | null>(null)
  const [code, setCode] = useState('')
  const [authRequested, setAuthRequested] = useState(false)

  const formattedExpiry = useMemo(() => {
    if (!info?.expiresAt) return ''
    try {
      return format(new Date(info.expiresAt), 'yyyy-MM-dd HH:mm', { locale })
    } catch {
      return info.expiresAt
    }
  }, [info?.expiresAt, locale])

  useEffect(() => {
    if (!open) return
    void refreshInfo()
  }, [open])

  async function refreshInfo() {
    setLoading(true)
    setError(null)
    try {
      const data = await GoogleTokenInfo()
      setInfo(data)
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  async function startAuth() {
    setError(null)
    setAuthRequested(true)
    try {
      const url = await GoogleAuthURL(Date.now().toString())
      BrowserOpenURL(url)
    } catch (err: any) {
      setError(err?.message ?? String(err))
    }
  }

  async function submitCode() {
    const trimmed = code.trim()
    if (!trimmed) {
      setError(t('accountEnterCodePlaceholder'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await GoogleExchangeCode(trimmed)
      setCode('')
      setAuthRequested(false)
      await refreshInfo()
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    setLoading(true)
    setError(null)
    try {
      await GoogleLogout()
      await refreshInfo()
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  const notConfigured = !!(info && !info.clientConfigured)
  const connected = info?.connected

  useEffect(() => {
    if (!open || !authRequested) return
    const id = setInterval(async () => {
      try {
        const data = await GoogleTokenInfo()
        setInfo(data)
        if (data.connected) {
          setAuthRequested(false)
        }
      } catch (err: any) {
        setError(err?.message ?? String(err))
      }
    }, 3000)
    return () => clearInterval(id)
  }, [open, authRequested])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle>{t('menuAccount')}</DialogTitle>
              <DialogDescription>
                {connected
                  ? t('accountConnectedStatus')
                  : t('accountDisconnectedStatus')}
              </DialogDescription>
            </div>
            <GoogleStatusBadge />
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {notConfigured && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <div className="font-medium">{t('accountNotConfigured')}</div>
            <div className="text-muted-foreground">
              {t('accountNotConfiguredDesc')}
            </div>
          </div>
        )}

        {connected && info && (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              {info.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={info.picture}
                  alt="avatar"
                  className="h-10 w-10 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted text-sm font-semibold uppercase">
                  {(info.userName || info.userEmail || '?').slice(0, 2)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">
                  {info.userName || t('accountUnknownUser')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {info.userEmail || t('accountUnknownEmail')}
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {t('accountExpiresAt')}: {formattedExpiry || '—'}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {t('accountScope')}: {info.scope || '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('accountRefreshToken')}:{' '}
                {info.hasRefreshToken ? t('accountYes') : t('accountNo')}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                disabled={loading}
              >
                {t('accountLogoutButton')}
              </Button>
            </div>
          </div>
        )}

        {!connected && (
          <div className="flex flex-col gap-3">
            <div className="text-sm text-muted-foreground">
              {t('accountConnectHelp')}
            </div>
            <Button onClick={startAuth} disabled={loading || notConfigured}>
              {t('accountStartSync')}
            </Button>
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('accountEnterCodePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
              />
              <Button
                variant="outline"
                onClick={submitCode}
                disabled={loading || !authRequested}
              >
                {t('accountSubmitCode')}
              </Button>
            </div>
            {!authRequested && (
              <div className="text-xs text-muted-foreground">
                {t('accountCodeHint')}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
