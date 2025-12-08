# calendar widget

## Local development

1. Create a `.env.local` in the project root (this file is gitignored):
   ```bash
   GOOGLE_CLIENT_ID=your-local-client-id
   GOOGLE_CLIENT_SECRET=your-local-client-secret
   ```
2. Load env vars (e.g. `export $(cat .env.local | xargs)`) or use a tool like `direnv`/`dotenv`.
3. Run the app: `wails dev` (or `npm run dev` for the frontend).

> Keep secrets out of the repo. `.env.local` is ignored by git; never commit real keys.

## GitHub Actions / release

Workflow: `.github/workflows/release.yml`

- Trigger: pushing a tag starting with `v` (e.g. `v1.0.0`).
- Runner: `windows-latest`.
- Steps:
  1) Checkout repo
  2) Setup Go (from `go.mod`)
  3) Setup Node 20 (npm cache on `frontend/package-lock.json`)
  4) `npm ci` in `frontend/`
  5) Install Wails CLI (`wails@v2.11.0`)
  6) `wails build -clean -platform windows/amd64`
7) Upload `build/bin/calendar-widget.exe` as artifact
8) Create GitHub Release with the exe attached

Secrets needed (Repository Settings → Secrets → Actions):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

These are injected as env vars in the workflow:
```yaml
env:
  GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
  GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
```

Backend should read them via `os.Getenv(...)`; keep them out of frontend bundles.

## Google Calendar integration considerations (future)

- **Auth & tokens**: OAuth 2.0 with minimal scopes; store tokens securely (encrypted file/OS keychain). Handle refresh/ revoke. Multi-account?
- **Data mapping**: Map to Google fields: `summary(title)`, `start/end` (all-day: `date`; timed: `dateTime` + `timeZone`), `location`, `description`, `colorId`, `recurrence` (RRULE/EXDATE), `reminders`. Align local `color` to Google palette.
- **Schema updates**: Add `googleEventId`, `googleCalendarId`, `timeZone`, `syncStatus` (local/new/dirty/deleted/synced/conflict), per-calendar `syncToken` for delta sync.
- **Sync strategy**: Decide one-way vs two-way. Use `syncToken` for incremental fetch. Conflict resolution (local `updated_at` vs Google `updated`). Handle canceled events (soft delete).
- **Calendars & permissions**: Choose which calendars to sync; respect ACL and color per calendar.
- **Timezones**: Persist TZ to avoid drift; all-day vs timed event handling.
- **Reminders**: Map local alert offsets to Google reminders (multiple/custom).
- **Quotas/retries**: Rate limits/backoff; offline queue for pending writes.
- **UX**: Sync status/last sync indicator, manual sync button, account connect/disconnect, conflict resolution UI.

## Next steps / ideas

- Add conflict resolution UI for `sync_status='conflict'` (choose local vs remote).
- Surface sync errors/toasts instead of alerts; retry queue for offline mode.
- Auto-pull on interval (e.g., every few minutes) with exponential backoff on failure.
- Expose country selection (already in calendar settings) alongside other calendar toggles (e.g., enable/disable holidays).
- Add E2E smoke test for create/update/delete + Google push.
