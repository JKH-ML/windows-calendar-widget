type Props = {
  tone: 'info' | 'warn' | 'error'
  message: string
}

export default function StatusBanner({ tone, message }: Props) {
  const base =
    tone === 'error'
      ? 'border-destructive/60 bg-destructive/10 text-destructive'
      : tone === 'warn'
        ? 'border-amber-500/50 bg-amber-50 text-amber-700'
        : 'border-border bg-muted/30 text-foreground'
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${base}`}>
      {message}
    </div>
  )
}
