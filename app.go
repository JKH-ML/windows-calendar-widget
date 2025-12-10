package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	_ "modernc.org/sqlite"
)

// App struct
type App struct {
	ctx    context.Context
	db     *sql.DB
	google *GoogleSyncService
	cbOnce sync.Once
	settings AppSettings
}

type syncStateStore struct {
	db *sql.DB
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Ensure the widget is not topmost so it won't cover other windows.
	wailsruntime.WindowSetAlwaysOnTop(ctx, false)
	if runtime.GOOS == "windows" {
		// Hide from taskbar (tray-only feel) by adjusting window styles.
		go func() {
			// small delay to allow window to exist
			time.Sleep(300 * time.Millisecond)
			if err := hideFromTaskbar("calendar widget"); err != nil {
				fmt.Printf("hideFromTaskbar: %v\n", err)
			}
		}()
	}
	if err := a.initDB(); err != nil {
		fmt.Printf("failed to init db: %v\n", err)
	}
	if err := a.loadSettings(); err != nil {
		fmt.Printf("failed to load settings: %v\n", err)
	}
	if err := a.applyAutoStart(a.settings.AutoStart); err != nil {
		fmt.Printf("failed to apply autostart: %v\n", err)
	}
	if err := a.initGoogleSync(); err != nil {
		fmt.Printf("google sync unavailable: %v\n", err)
	}
}

// Greet returns a greeting for the given name
// GoogleAuthURL builds an OAuth consent URL for Google Calendar.
func (a *App) GoogleAuthURL(state string) (string, error) {
	if a.google == nil {
		return "", errors.New("google sync not initialised")
	}
	return a.google.BuildAuthURL(state)
}

// GoogleExchangeCode exchanges an auth code for tokens and stores them.
func (a *App) GoogleExchangeCode(code string) (OAuthTokens, error) {
	if a.google == nil {
		return OAuthTokens{}, errors.New("google sync not initialised")
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	return a.google.ExchangeCode(ctx, code)
}

// GoogleRefreshTokens refreshes tokens using the stored refresh token.
func (a *App) GoogleRefreshTokens() (OAuthTokens, error) {
	if a.google == nil {
		return OAuthTokens{}, errors.New("google sync not initialised")
	}
	existing, err := a.google.LoadTokens()
	if err != nil {
		return OAuthTokens{}, fmt.Errorf("load tokens: %w", err)
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	return a.google.Refresh(ctx, existing.RefreshToken)
}

// GoogleTokenInfo returns current token/user summary.
func (a *App) GoogleTokenInfo() (GoogleTokenInfo, error) {
	info := GoogleTokenInfo{
		ClientConfigured: a.google != nil && a.google.HasClientConfig(),
	}
	if a.google == nil {
		return info, errors.New("google sync not initialised")
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	tokens, err := a.google.EnsureAccessToken(ctx)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return info, nil
		}
		return info, err
	}
	info.Connected = true
	info.ExpiresAt = tokens.Expiry
	info.Scope = tokens.Scope
	info.HasRefreshToken = tokens.RefreshToken != ""

	if user, err := a.google.FetchUserInfo(ctx, tokens.AccessToken); err == nil {
		info.UserEmail = user.Email
		info.UserName = user.Name
		info.Picture = user.Picture
	}

	return info, nil
}

// GoogleLogout clears stored tokens.
func (a *App) GoogleLogout() error {
	if a.google == nil {
		return errors.New("google sync not initialised")
	}
	return a.google.ClearTokens()
}

// startAuthCallbackServer listens on the redirect URI for OAuth codes and exchanges them automatically.
func (a *App) startAuthCallbackServer() error {
	if a.google == nil || !a.google.HasClientConfig() {
		return nil
	}
	redirect := a.google.cfg.RedirectURI
	u, err := url.Parse(redirect)
	if err != nil {
		return fmt.Errorf("parse redirect uri: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("unsupported redirect scheme: %s", u.Scheme)
	}
	_, port, err := net.SplitHostPort(u.Host)
	if err != nil {
		return fmt.Errorf("parse host: %w", err)
	}
	if port == "" {
		return fmt.Errorf("redirect uri missing port: %s", u.Host)
	}

	path := u.Path
	if path == "" {
		path = "/"
	}

	mux := http.NewServeMux()
	handler := func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "missing code", http.StatusBadRequest)
			return
		}
		ctx := r.Context()
		if _, err := a.google.ExchangeCode(ctx, code); err != nil {
			http.Error(w, "failed to exchange code: "+err.Error(), http.StatusBadGateway)
			return
		}
		fmt.Fprint(w, `<html><body><h3>Google Calendar 연결 완료</h3><p>이 창을 닫고 앱으로 돌아가세요.</p></body></html>`)
	}
	// Handle both exact path and root (for safety if Google trims path).
	mux.HandleFunc(path, handler)
	if path != "/" {
		mux.HandleFunc("/", handler)
	}

	server := &http.Server{
		Addr:    net.JoinHostPort("", port),
		Handler: mux,
	}
	// Allow re-use of the port even if recently closed.
	ln, err := net.Listen("tcp", server.Addr)
	if err != nil {
		if strings.Contains(err.Error(), "address already in use") {
			fmt.Printf("oauth callback server: port %s in use, fallback to manual code paste\n", port)
			return nil
		}
		return err
	}
	go func() {
		if err := server.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			fmt.Printf("oauth callback server error: %v\n", err)
		}
	}()
	return nil
}

// GoogleSync performs pull/push sync with Google Calendar (primary calendar).
func (a *App) GoogleSync() (GoogleSyncResult, error) {
	if a.db == nil {
		return GoogleSyncResult{}, errors.New("db not initialised")
	}
	if a.google == nil {
		return GoogleSyncResult{}, errors.New("google sync not initialised")
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	calendarID := "primary"
	syncToken, _ := a.syncStateGet("google_sync_token")
	fullSync := syncToken == ""

	events, nextSyncToken, err := a.google.ListEvents(ctx, calendarID, syncToken)
	if err != nil {
		return GoogleSyncResult{CalendarID: calendarID, ErrorMessage: err.Error(), FullSync: fullSync}, err
	}
	result := GoogleSyncResult{CalendarID: calendarID, FullSync: fullSync, SyncToken: nextSyncToken}

	// Pull: apply Google events to local DB
	for _, ge := range events {
		if err := a.applyGoogleEvent(ge); err != nil {
			result.Errors++
			result.ErrorMessage = err.Error()
			continue
		}
		if ge.Status == "cancelled" {
			result.Deleted++
		} else {
			result.Pulled++
		}
	}
	if nextSyncToken != "" {
		_ = a.syncStateSet("google_sync_token", nextSyncToken)
	}

	// Push local changes
	pushed, perr := a.pushLocalChanges(ctx, calendarID)
	result.Pushed = pushed
	if perr != nil {
		if result.ErrorMessage == "" {
			result.ErrorMessage = perr.Error()
		}
		result.Errors++
		return result, perr
	}

	return result, nil
}

// GooglePush pushes local changes without pulling updates (lightweight).
func (a *App) GooglePush() (GoogleSyncResult, error) {
	if a.db == nil {
		return GoogleSyncResult{}, errors.New("db not initialised")
	}
	if a.google == nil {
		return GoogleSyncResult{}, errors.New("google sync not initialised")
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	calendarID := "primary"
	pushed, err := a.pushLocalChanges(ctx, calendarID)
	result := GoogleSyncResult{CalendarID: calendarID, FullSync: false, Pushed: pushed}
	if err != nil {
		result.Errors = 1
		result.ErrorMessage = err.Error()
		return result, err
	}
	return result, nil
}

func holidayCalendarID(locale string) string {
	l := strings.ToLower(locale)
	switch l {
	case "ko", "ko-kr", "kr":
		return "ko.south_korea#holiday@group.v.calendar.google.com"
	case "en-gb", "en-uk", "gb", "uk":
		return "en.uk#holiday@group.v.calendar.google.com"
	case "en-au", "au", "en-nz", "nz":
		return "en.australian#holiday@group.v.calendar.google.com"
	case "en-ca", "ca":
		return "en.ca#holiday@group.v.calendar.google.com"
	case "en-in", "in":
		return "en.indian#holiday@group.v.calendar.google.com"
	case "en", "en-us", "us":
		return "en.usa#holiday@group.v.calendar.google.com"
	default:
		return "en.usa#holiday@group.v.calendar.google.com"
	}
}

// Observances/non-public days we don't want to surface as "red day" holidays.
var skipHolidayTitles = map[string]bool{
	"식목일":       true,
	"노동절":       true,
	"어버이날":      true,
	"스승의날":      true,
	"제헌절":       true,
	"국군의 날":     true,
	"국군의날":      true,
	"크리스마스 이브": true,
	"섣달 그믐날":    true,
	// English fallbacks in case Google serves en titles.
	"arbor day":      true,
	"labor day":      true,
	"parents' day":   true,
	"parents day":    true,
	"teachers' day":  true,
	"teachers day":   true,
	"constitution day": true,
	"armed forces day": true,
	"christmas eve":  true,
	"new year's eve": true,
}

// GoogleListHolidays fetches public holiday events for the current year from Google's holiday calendar.
func (a *App) GoogleListHolidays(locale string) ([]CalendarEvent, error) {
	if a.google == nil {
		return nil, errors.New("google sync not initialised")
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	calID := holidayCalendarID(locale)
	now := time.Now()
	start := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	// Include next year to cover upcoming holidays (e.g., when viewing late in the year).
	end := start.AddDate(2, 0, 0)
	items, err := a.google.ListEventsRange(ctx, calID, start.Format(time.RFC3339), end.Format(time.RFC3339))
	if err != nil {
		return nil, err
	}
	var out []CalendarEvent
	for _, ge := range items {
		if skipHolidayTitles[strings.ToLower(strings.TrimSpace(ge.Summary))] {
			continue
		}
		// Holidays are all-day; Google provides date (end is exclusive).
		dateStr := firstNonEmpty(ge.Start.Date, ge.Start.DateTime)
		if dateStr == "" {
			continue
		}
		startTime, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			continue
		}
		out = append(out, CalendarEvent{
			ID:          fmt.Sprintf("holiday-%s", ge.ID),
			Title:       ge.Summary,
			AllDay:      true,
			Start:       startTime.Format(time.RFC3339),
			End:         startTime.Format(time.RFC3339),
			Recurrence:  "none",
			Location:    ge.Location,
			// Force a red hue for holidays regardless of Google colorId.
			Color:       "11",
			Description: ge.Description,
			SyncStatus:  "holiday",
			TimeZone:    firstNonEmpty(ge.Start.TimeZone, "UTC"),
			GoogleETag:  ge.Etag,
			GoogleEventID: ge.ID,
			GoogleCalendarID: calID,
		})
	}
	return out, nil
}

func (a *App) applyGoogleEvent(ge GoogleEvent) error {
	if a.db == nil {
		return errors.New("db not initialised")
	}

	var existingID, existingSyncStatus string
	if err := a.db.QueryRow(`SELECT id, sync_status FROM events WHERE google_event_id = ? LIMIT 1`, ge.ID).Scan(&existingID, &existingSyncStatus); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	// Avoid overwriting unsynced local edits; mark conflict instead.
	if existingID != "" && (existingSyncStatus == "new" || existingSyncStatus == "dirty" || existingSyncStatus == "local") {
		_, _ = a.db.Exec(`UPDATE events SET sync_status='conflict', google_etag=?, google_updated_at=? WHERE id=?`, ge.Etag, ge.Updated, existingID)
		return nil
	}

	if ge.Status == "cancelled" {
		if existingID != "" {
			_, err := a.db.Exec(`UPDATE events SET sync_status='deleted' WHERE id = ?`, existingID)
			return err
		}
		return nil
	}

	eventID := existingID
	if eventID == "" {
		eventID = fmt.Sprintf("google-%s", ge.ID)
	}

	start := firstNonEmpty(ge.Start.DateTime, ge.Start.Date)
	end := firstNonEmpty(ge.End.DateTime, ge.End.Date)
	if start == "" || end == "" {
		return fmt.Errorf("google event missing time: %s", ge.ID)
	}

	recurrence := ""
	recurrenceCustom := ""
	if len(ge.Recurrence) > 0 {
		recurrence = "rrule"
		recurrenceCustom = strings.Join(ge.Recurrence, "\n")
	}

	_, err := a.db.Exec(`
		INSERT INTO events (id, title, all_day, start, end, recurrence, recurrence_custom, location, alert, alert_offset, color, description, sync_status, google_event_id, google_calendar_id, time_zone, google_etag, google_updated_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'none', 0, ?, ?, 'synced', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET
			title=excluded.title,
			all_day=excluded.all_day,
			start=excluded.start,
			end=excluded.end,
			recurrence=excluded.recurrence,
			recurrence_custom=excluded.recurrence_custom,
			location=excluded.location,
			color=excluded.color,
			description=excluded.description,
			sync_status='synced',
			google_event_id=excluded.google_event_id,
			google_calendar_id=excluded.google_calendar_id,
			time_zone=excluded.time_zone,
			google_etag=excluded.google_etag,
			google_updated_at=excluded.google_updated_at,
			updated_at=excluded.updated_at
	`, eventID, ge.Summary, boolToInt(ge.Start.Date != ""), start, end, recurrence, recurrenceCustom, ge.Location, ge.ColorID, ge.Description, ge.ID, "primary", ge.Start.TimeZone, ge.Etag, ge.Updated)
	return err
}

func (a *App) pushLocalChanges(ctx context.Context, calendarID string) (int, error) {
	if a.db == nil {
		return 0, errors.New("db not initialised")
	}
		rows, err := a.db.Query(`SELECT id, title, all_day, start, end, COALESCE(recurrence,''), COALESCE(recurrence_custom,''), COALESCE(location,''), alert, alert_offset, COALESCE(color,''), COALESCE(description,''), sync_status, COALESCE(google_event_id,''), COALESCE(google_calendar_id,''), COALESCE(time_zone,''), COALESCE(google_etag,'') FROM events WHERE sync_status IN ('new','dirty','deleted','local')`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	pushed := 0
	for rows.Next() {
		var e CalendarEvent
		var allDay int
		var start, end time.Time
			if err := rows.Scan(&e.ID, &e.Title, &allDay, &start, &end, &e.Recurrence, &e.RecurrenceEx, &e.Location, &e.Alert, &e.AlertOffset, &e.Color, &e.Description, &e.SyncStatus, &e.GoogleEventID, &e.GoogleCalendarID, &e.TimeZone, &e.GoogleETag); err != nil {
				return pushed, err
			}
		e.AllDay = allDay == 1
			if e.SyncStatus == "deleted" {
				if e.GoogleEventID != "" {
					if err := a.google.DeleteEvent(ctx, calendarID, e.GoogleEventID); err != nil {
						return pushed, err
					}
				}
				if _, err := a.db.Exec(`DELETE FROM events WHERE id = ?`, e.ID); err != nil {
					return pushed, err
				}
				pushed++
				continue
			}

			gEvent := calendarToGoogle(e, start, end)
			var remote GoogleEvent
				if e.GoogleEventID == "" {
					r, err := a.google.CreateEvent(ctx, calendarID, gEvent)
					if err != nil {
						return pushed, err
					}
				remote = r
				pushed++
				_, _ = a.db.Exec(`UPDATE events SET google_event_id=?, google_calendar_id=?, google_etag=?, google_updated_at=?, sync_status='synced' WHERE id=?`, r.ID, calendarID, r.Etag, r.Updated, e.ID)
				} else {
					r, err := a.google.UpdateEvent(ctx, calendarID, e.GoogleEventID, e.GoogleETag, gEvent)
					if err != nil {
						if errors.Is(err, errGoogleConflict) {
							// Remote has changed; flag conflict and continue without overwriting.
							_, _ = a.db.Exec(`UPDATE events SET sync_status='conflict' WHERE id=?`, e.ID)
							continue
						}
						if errors.Is(err, errGoogleNotFound) {
							// Remote was deleted; recreate as new.
							r, err = a.google.CreateEvent(ctx, calendarID, gEvent)
							if err != nil {
								return pushed, err
							}
							remote = r
							pushed++
							_, _ = a.db.Exec(`UPDATE events SET google_event_id=?, google_calendar_id=?, google_etag=?, google_updated_at=?, sync_status='synced' WHERE id=?`, r.ID, calendarID, r.Etag, r.Updated, e.ID)
							continue
					}
					return pushed, err
				}
				remote = r
				pushed++
				_, _ = a.db.Exec(`UPDATE events SET google_etag=?, google_updated_at=?, sync_status='synced' WHERE id=?`, r.Etag, r.Updated, e.ID)
		}
		_ = remote // reserved for future use
	}
	return pushed, nil
}

func calendarToGoogle(e CalendarEvent, start, end time.Time) GoogleEvent {
	allDay := e.AllDay || e.Recurrence == "allday"
	colorID := ""
	if c := strings.TrimSpace(e.Color); c != "" {
		if isValidGoogleColor(c) {
			colorID = c
		}
	}
	timezone := e.TimeZone
	if strings.TrimSpace(timezone) == "" {
		timezone = "UTC"
	}
	startTime := GoogleEventTime{}
	endTime := GoogleEventTime{}
	if allDay {
		startTime.Date = start.Format("2006-01-02")
		endTime.Date = end.Format("2006-01-02")
	} else {
		startTime.DateTime = start.Format(time.RFC3339)
		endTime.DateTime = end.Format(time.RFC3339)
		startTime.TimeZone = timezone
		endTime.TimeZone = timezone
	}
	var recurrence []string
	if e.Recurrence != "" && e.Recurrence != "none" && e.Recurrence != "rrule" {
		recurrence = []string{e.Recurrence}
	} else if e.Recurrence == "rrule" && e.RecurrenceEx != "" {
		recurrence = strings.Split(e.RecurrenceEx, "\n")
	}
	return GoogleEvent{
		Summary:     e.Title,
		Description: e.Description,
		Location:    e.Location,
		ColorID:     colorID,
		Start:       startTime,
		End:         endTime,
		Recurrence:  recurrence,
	}
}

func isValidGoogleColor(id string) bool {
	switch id {
	case "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11":
		return true
	}
	return false
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func (a *App) initGoogleSync() error {
	appDir, err := appConfigDir()
	if err != nil {
		return err
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
	if redirectURI == "" {
		redirectURI = "http://localhost:34115/oauth2/callback"
	}

	a.google = NewGoogleSyncService(GoogleOAuthConfig{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  redirectURI,
		Scopes: []string{
			"https://www.googleapis.com/auth/calendar.events",
			"openid",
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
	}, &FileTokenStore{
		path: filepath.Join(appDir, "google_tokens.json"),
	})

	if !a.google.HasClientConfig() {
		return errors.New("set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET to enable Google Calendar")
	}
	// Fire up a local callback server to capture OAuth codes automatically.
	a.cbOnce.Do(func() {
		go func() {
			if err := a.startAuthCallbackServer(); err != nil {
				fmt.Printf("oauth callback server: %v\n", err)
			}
		}()
	})
	return nil
}

// CalendarEvent represents a stored event
type CalendarEvent struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	AllDay           bool   `json:"allDay"`
	Start            string `json:"start"`
	End              string `json:"end"`
	Recurrence       string `json:"recurrence"`
	RecurrenceEx     string `json:"recurrenceCustom"`
	Location         string `json:"location"`
	Alert            string `json:"alert"`
	AlertOffset      int    `json:"alertOffset"`
	Color            string `json:"color"`
	Description      string `json:"description"`
	SyncStatus       string `json:"syncStatus"`
	GoogleEventID    string `json:"googleEventId"`
	GoogleCalendarID string `json:"googleCalendarId"`
	TimeZone         string `json:"timeZone"`
	GoogleETag       string `json:"googleEtag"`
	GoogleUpdatedAt  string `json:"googleUpdatedAt"`
	UpdatedAt        string `json:"updatedAt"`
	CreatedAt        string `json:"createdAt"`
}

// GoogleTokenInfo represents the current login state.
type GoogleTokenInfo struct {
	Connected        bool   `json:"connected"`
	ExpiresAt        string `json:"expiresAt"`
	Scope            string `json:"scope"`
	HasRefreshToken  bool   `json:"hasRefreshToken"`
	UserEmail        string `json:"userEmail"`
	UserName         string `json:"userName"`
	Picture          string `json:"picture"`
	ClientConfigured bool   `json:"clientConfigured"`
}

func (a *App) initDB() error {
	appDir, err := appConfigDir()
	if err != nil {
		return err
	}
	dbPath := filepath.Join(appDir, "events.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}
	// Reduce sqlite busy errors.
	if _, err := db.Exec(`PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;`); err != nil {
		fmt.Printf("warn: failed to set sqlite pragmas: %v\n", err)
	}
	a.db = db
	schema := `
	CREATE TABLE IF NOT EXISTS events (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		all_day INTEGER NOT NULL DEFAULT 0,
		start TIMESTAMP NOT NULL,
		end TIMESTAMP NOT NULL,
		recurrence TEXT NOT NULL DEFAULT 'none',
		recurrence_custom TEXT,
		location TEXT,
		alert TEXT NOT NULL DEFAULT 'none',
		alert_offset INTEGER NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT 'sky',
		description TEXT,
		sync_status TEXT NOT NULL DEFAULT 'local',
		google_event_id TEXT,
		google_calendar_id TEXT,
		time_zone TEXT,
		google_etag TEXT,
		google_updated_at TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err = db.Exec(schema)
	if err != nil {
		return err
	}
	if err := ensureEventsColumns(db); err != nil {
		return err
	}
	return ensureSyncStateTable(db)
}

func (a *App) ListEvents() ([]CalendarEvent, error) {
	if a.db == nil {
		return nil, errors.New("db not initialised")
	}
	rows, err := a.db.Query(`SELECT id, title, all_day, start, end, COALESCE(recurrence,'none'), COALESCE(recurrence_custom,''), COALESCE(location,''), alert, alert_offset, COALESCE(color,''), COALESCE(description,''), sync_status, COALESCE(google_event_id,''), COALESCE(google_calendar_id,''), COALESCE(time_zone,''), COALESCE(google_etag,''), google_updated_at, updated_at, created_at FROM events ORDER BY start ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []CalendarEvent
	for rows.Next() {
		var e CalendarEvent
		var allDay int
		var start, end, updatedAt, createdAt time.Time
		var googleUpdatedAt sql.NullTime
		if err := rows.Scan(&e.ID, &e.Title, &allDay, &start, &end, &e.Recurrence, &e.RecurrenceEx, &e.Location, &e.Alert, &e.AlertOffset, &e.Color, &e.Description, &e.SyncStatus, &e.GoogleEventID, &e.GoogleCalendarID, &e.TimeZone, &e.GoogleETag, &googleUpdatedAt, &updatedAt, &createdAt); err != nil {
			return nil, err
		}
		e.AllDay = allDay == 1
		e.Start = start.Format(time.RFC3339)
		e.End = end.Format(time.RFC3339)
		if googleUpdatedAt.Valid {
			e.GoogleUpdatedAt = googleUpdatedAt.Time.Format(time.RFC3339)
		}
		e.UpdatedAt = updatedAt.Format(time.RFC3339)
		e.CreatedAt = createdAt.Format(time.RFC3339)
		events = append(events, e)
	}
	return events, nil
}

// SearchEvents returns events that match the query within the given time window.
// start/end are RFC3339 strings; if empty, defaults to a broad window around "now".
func (a *App) SearchEvents(query, start, end string, limit int) ([]CalendarEvent, error) {
	if a.db == nil {
		return nil, errors.New("db not initialised")
	}

	// Very wide defaults so search is not artificially limited.
	startTime := time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
	endTime := time.Date(2100, 1, 1, 0, 0, 0, 0, time.UTC)

	if strings.TrimSpace(start) != "" {
		parsed, err := time.Parse(time.RFC3339, start)
		if err != nil {
			return nil, fmt.Errorf("invalid start: %w", err)
		}
		startTime = parsed
	}
	if strings.TrimSpace(end) != "" {
		parsed, err := time.Parse(time.RFC3339, end)
		if err != nil {
			return nil, fmt.Errorf("invalid end: %w", err)
		}
		endTime = parsed
	}
	// ensure end is after start
	if !endTime.After(startTime) {
		endTime = startTime.Add(24 * time.Hour)
	}
	if limit <= 0 || limit > 200 {
		limit = 100
	}

	terms := []string{}
	for _, part := range strings.Fields(strings.ToLower(query)) {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		terms = append(terms, part)
	}

	sqlStr := `
		SELECT id, title, all_day, start, end, COALESCE(recurrence,'none'), COALESCE(recurrence_custom,''), COALESCE(location,''), alert, alert_offset, COALESCE(color,''), COALESCE(description,''), sync_status, COALESCE(google_event_id,''), COALESCE(google_calendar_id,''), COALESCE(time_zone,''), COALESCE(google_etag,''), google_updated_at, updated_at, created_at
		FROM events
		WHERE sync_status != 'deleted' AND start BETWEEN ? AND ?
	`
	args := []interface{}{startTime, endTime}

	for range terms {
		sqlStr += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(location) LIKE ?)"
	}

	sqlStr += " ORDER BY start ASC LIMIT ?"
	for _, term := range terms {
		pattern := "%" + term + "%"
		args = append(args, pattern, pattern, pattern)
	}
	args = append(args, limit)

	rows, err := a.db.Query(sqlStr, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []CalendarEvent
	for rows.Next() {
		var e CalendarEvent
		var allDay int
		var startVal, endVal, updatedAt, createdAt time.Time
		var googleUpdatedAt sql.NullTime
		if err := rows.Scan(&e.ID, &e.Title, &allDay, &startVal, &endVal, &e.Recurrence, &e.RecurrenceEx, &e.Location, &e.Alert, &e.AlertOffset, &e.Color, &e.Description, &e.SyncStatus, &e.GoogleEventID, &e.GoogleCalendarID, &e.TimeZone, &e.GoogleETag, &googleUpdatedAt, &updatedAt, &createdAt); err != nil {
			return nil, err
		}
		e.AllDay = allDay == 1
		e.Start = startVal.Format(time.RFC3339)
		e.End = endVal.Format(time.RFC3339)
		if googleUpdatedAt.Valid {
			e.GoogleUpdatedAt = googleUpdatedAt.Time.Format(time.RFC3339)
		}
		e.UpdatedAt = updatedAt.Format(time.RFC3339)
		e.CreatedAt = createdAt.Format(time.RFC3339)
		events = append(events, e)
	}
	return events, nil
}

func (a *App) CreateEvent(e CalendarEvent) (CalendarEvent, error) {
	if a.db == nil {
		return CalendarEvent{}, errors.New("db not initialised")
	}
	if e.ID == "" {
		e.ID = fmt.Sprintf("evt-%d", time.Now().UnixNano())
	}
	startTime, endTime, err := parseEventTimes(e)
	if err != nil {
		return CalendarEvent{}, err
	}
	if e.TimeZone == "" {
		e.TimeZone = "UTC"
	}
	now := time.Now()
	e.CreatedAt = now.Format(time.RFC3339)
	e.UpdatedAt = now.Format(time.RFC3339)
	if e.SyncStatus == "" {
		e.SyncStatus = "local"
	}
	_, err = a.db.Exec(
		`INSERT INTO events (id, title, all_day, start, end, recurrence, recurrence_custom, location, alert, alert_offset, color, description, sync_status, google_event_id, google_calendar_id, time_zone, google_etag, google_updated_at, updated_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID,
		e.Title,
		boolToInt(e.AllDay),
		startTime,
		endTime,
		e.Recurrence,
		e.RecurrenceEx,
		e.Location,
		e.Alert,
		e.AlertOffset,
		e.Color,
		e.Description,
		e.SyncStatus,
		e.GoogleEventID,
		e.GoogleCalendarID,
		e.TimeZone,
		e.GoogleETag,
		nil,
		now,
		now,
	)
	return e, err
}

func (a *App) UpdateEvent(e CalendarEvent) (CalendarEvent, error) {
	if a.db == nil {
		return CalendarEvent{}, errors.New("db not initialised")
	}
	if e.ID == "" {
		return CalendarEvent{}, errors.New("id required")
	}
	var dbGoogleEventID, dbGoogleCalendarID, dbTimeZone, dbGoogleETag sql.NullString
	var dbGoogleUpdatedAt sql.NullTime
	if err := a.db.QueryRow(
		`SELECT google_event_id, google_calendar_id, time_zone, google_etag, google_updated_at FROM events WHERE id = ?`,
		e.ID,
	).Scan(&dbGoogleEventID, &dbGoogleCalendarID, &dbTimeZone, &dbGoogleETag, &dbGoogleUpdatedAt); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return CalendarEvent{}, fmt.Errorf("lookup event: %w", err)
	}
	startTime, endTime, err := parseEventTimes(e)
	if err != nil {
		return CalendarEvent{}, err
	}
	if e.GoogleEventID == "" && dbGoogleEventID.Valid {
		e.GoogleEventID = dbGoogleEventID.String
	}
	if e.GoogleCalendarID == "" && dbGoogleCalendarID.Valid {
		e.GoogleCalendarID = dbGoogleCalendarID.String
	}
	if e.GoogleETag == "" && dbGoogleETag.Valid {
		e.GoogleETag = dbGoogleETag.String
	}
	var googleUpdatedAt *time.Time
	if e.GoogleUpdatedAt != "" {
		parsed, err := time.Parse(time.RFC3339, e.GoogleUpdatedAt)
		if err != nil {
			return CalendarEvent{}, fmt.Errorf("invalid googleUpdatedAt: %w", err)
		}
		googleUpdatedAt = &parsed
	} else if dbGoogleUpdatedAt.Valid {
		val := dbGoogleUpdatedAt.Time
		e.GoogleUpdatedAt = val.Format(time.RFC3339)
		googleUpdatedAt = &val
	}
		if e.TimeZone == "" {
			if dbTimeZone.Valid && dbTimeZone.String != "" {
				e.TimeZone = dbTimeZone.String
			} else {
				e.TimeZone = "UTC"
			}
		}
	now := time.Now()
	e.UpdatedAt = now.Format(time.RFC3339)
	if e.SyncStatus == "" || e.SyncStatus == "synced" {
		// Mark updates as dirty so they are pushed on next sync.
		e.SyncStatus = "dirty"
	}
	res, err := a.db.Exec(
		`UPDATE events SET title=?, all_day=?, start=?, end=?, recurrence=?, recurrence_custom=?, location=?, alert=?, alert_offset=?, color=?, description=?, sync_status=?, google_event_id=?, google_calendar_id=?, time_zone=?, google_etag=?, google_updated_at=?, updated_at=? WHERE id=?`,
		e.Title,
		boolToInt(e.AllDay),
		startTime,
		endTime,
		e.Recurrence,
		e.RecurrenceEx,
		e.Location,
		e.Alert,
		e.AlertOffset,
		e.Color,
		e.Description,
		e.SyncStatus,
		e.GoogleEventID,
		e.GoogleCalendarID,
		e.TimeZone,
		e.GoogleETag,
		googleUpdatedAt,
		now,
		e.ID,
	)
	if err != nil {
		return CalendarEvent{}, err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return CalendarEvent{}, errors.New("event not found")
	}
	return e, nil
}

func (a *App) DeleteEvent(id string) error {
	if a.db == nil {
		return errors.New("db not initialised")
	}
	if id == "" {
		return errors.New("id required")
	}
	_, err := a.db.Exec(`UPDATE events SET sync_status='deleted' WHERE id = ?`, id)
	return err
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func parseEventTimes(e CalendarEvent) (time.Time, time.Time, error) {
	// All-day events should not drift across timezones; parse the date part only.
	if e.AllDay || strings.EqualFold(e.Recurrence, "allday") {
		startDate := strings.Split(e.Start, "T")[0]
		endDate := strings.Split(e.End, "T")[0]
		if startDate == "" {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid start: %s", e.Start)
		}
		if endDate == "" {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid end: %s", e.End)
		}
		s, err := time.ParseInLocation("2006-01-02", startDate, time.UTC)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid start: %w", err)
		}
		en, err := time.ParseInLocation("2006-01-02", endDate, time.UTC)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid end: %w", err)
		}
		return s, en, nil
	}

	startTime, err := time.Parse(time.RFC3339, e.Start)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid start: %w", err)
	}
	endTime, err := time.Parse(time.RFC3339, e.End)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid end: %w", err)
	}
	return startTime, endTime, nil
}

func appConfigDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	appDir := filepath.Join(configDir, "calendar-widget")
	if err := os.MkdirAll(appDir, 0o755); err != nil {
		return "", err
	}
	return appDir, nil
}

func ensureEventsColumns(db *sql.DB) error {
	rows, err := db.Query(`PRAGMA table_info(events)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	columns := make(map[string]bool)
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull int
		var dflt sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return err
		}
		columns[name] = true
	}

	additions := map[string]string{
		"google_event_id":    "TEXT",
		"google_calendar_id": "TEXT",
		"time_zone":          "TEXT",
		"google_etag":        "TEXT",
		"google_updated_at":  "TIMESTAMP",
	}

	for col, definition := range additions {
		if columns[col] {
			continue
		}
		if _, err := db.Exec(fmt.Sprintf("ALTER TABLE events ADD COLUMN %s %s", col, definition)); err != nil {
			return fmt.Errorf("add column %s: %w", col, err)
		}
	}

	return nil
}

func ensureSyncStateTable(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS sync_state (
		key TEXT PRIMARY KEY,
		value TEXT
	);
	`
	_, err := db.Exec(schema)
	return err
}

func (a *App) syncStateGet(key string) (string, error) {
	if a.db == nil {
		return "", errors.New("db not initialised")
	}
	var val sql.NullString
	if err := a.db.QueryRow(`SELECT value FROM sync_state WHERE key = ?`, key).Scan(&val); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	if val.Valid {
		return val.String, nil
	}
	return "", nil
}

func (a *App) syncStateSet(key, value string) error {
	if a.db == nil {
		return errors.New("db not initialised")
	}
	_, err := a.db.Exec(`
		INSERT INTO sync_state (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value=excluded.value
	`, key, value)
	return err
}

// Settings and autostart management

type AppSettings struct {
	AutoStart bool `json:"autoStart"`
}

func defaultSettings() AppSettings {
	return AppSettings{
		AutoStart: true,
	}
}

func (a *App) settingsPath() (string, error) {
	appDir, err := appConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(appDir, "settings.json"), nil
}

func (a *App) loadSettings() error {
	path, err := a.settingsPath()
	if err != nil {
		return err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			a.settings = defaultSettings()
			return a.saveSettings(a.settings)
		}
		return err
	}
	var cfg AppSettings
	if err := json.Unmarshal(data, &cfg); err != nil {
		return err
	}
	a.settings = cfg
	return nil
}

func (a *App) saveSettings(cfg AppSettings) error {
	path, err := a.settingsPath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// GetSettings returns persisted app settings.
func (a *App) GetSettings() (AppSettings, error) {
	if a.settings == (AppSettings{}) {
		if err := a.loadSettings(); err != nil {
			return AppSettings{}, err
		}
	}
	return a.settings, nil
}

// UpdateSettings saves new settings and applies side effects like autostart.
func (a *App) UpdateSettings(cfg AppSettings) (AppSettings, error) {
	if err := a.applyAutoStart(cfg.AutoStart); err != nil {
		return AppSettings{}, err
	}
	if err := a.saveSettings(cfg); err != nil {
		return AppSettings{}, err
	}
	a.settings = cfg
	return cfg, nil
}

func (a *App) applyAutoStart(enabled bool) error {
	if runtime.GOOS != "windows" {
		return nil
	}
	// Skip autostart writes during dev to avoid polluting Startup with wails-base-fresh-dev.exe.
	if env := strings.ToLower(strings.TrimSpace(os.Getenv("WAILS_ENV"))); env == "dev" {
		return nil
	}
	if exe, _ := os.Executable(); strings.Contains(strings.ToLower(exe), "wails-base-fresh") {
		return nil
	}
	appData := os.Getenv("APPDATA")
	if strings.TrimSpace(appData) == "" {
		return errors.New("APPDATA not set")
	}
	startupDir := filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
	if err := os.MkdirAll(startupDir, 0o755); err != nil {
		return fmt.Errorf("make startup dir: %w", err)
	}
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("find executable: %w", err)
	}
	batPath := filepath.Join(startupDir, "calendar-widget-start.bat")
	if enabled {
		if target, _ := readStartupTarget(batPath); target != "" {
			if strings.EqualFold(filepath.Clean(target), filepath.Clean(exePath)) {
				return nil
			}
			if _, err := os.Stat(target); err != nil && errors.Is(err, os.ErrNotExist) {
				// stale entry, overwrite below
			}
		}
		content := fmt.Sprintf(`@echo off
start "" "%s"
`, exePath)
		return os.WriteFile(batPath, []byte(content), 0o644)
	}
	if err := os.Remove(batPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

// readStartupTarget extracts the target path from an existing autostart .bat.
func readStartupTarget(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(strings.ToLower(line), "start") {
			continue
		}
		parts := strings.SplitN(line, "\"", 3)
		if len(parts) >= 3 && strings.TrimSpace(parts[1]) != "" {
			return parts[1], nil
		}
		fields := strings.Fields(line)
		if len(fields) >= 2 {
			return fields[len(fields)-1], nil
		}
	}
	return "", nil
}
