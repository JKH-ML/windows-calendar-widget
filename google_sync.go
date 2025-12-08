package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var (
	errGoogleNotFound = errors.New("google event not found")
	errGoogleGone     = errors.New("google event deleted")
	errGoogleConflict = errors.New("google event conflict")
)

// GoogleOAuthConfig holds OAuth client details.
type GoogleOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	Scopes       []string
}

// OAuthTokens represents OAuth token data.
type OAuthTokens struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	Expiry       string `json:"expiry"` // RFC3339 string to keep bindings simple
	TokenType    string `json:"tokenType"`
	Scope        string `json:"scope"`
	IDToken      string `json:"idToken,omitempty"`
}

// GoogleUserInfo represents user profile data from Google.
type GoogleUserInfo struct {
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verifiedEmail"`
	Name          string `json:"name"`
	GivenName     string `json:"givenName"`
	FamilyName    string `json:"familyName"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

// GoogleEventTime represents Google Calendar event time format.
type GoogleEventTime struct {
	Date     string `json:"date,omitempty"`
	DateTime string `json:"dateTime,omitempty"`
	TimeZone string `json:"timeZone,omitempty"`
}

// GoogleEvent represents a subset of Google Calendar event fields.
type GoogleEvent struct {
	ID          string          `json:"id,omitempty"`
	Status      string          `json:"status,omitempty"`
	Summary     string          `json:"summary,omitempty"`
	Description string          `json:"description,omitempty"`
	Location    string          `json:"location,omitempty"`
	ColorID     string          `json:"colorId,omitempty"`
	Start       GoogleEventTime `json:"start,omitempty"`
	End         GoogleEventTime `json:"end,omitempty"`
	Recurrence  []string        `json:"recurrence,omitempty"`
	Reminders   struct {
		UseDefault bool `json:"useDefault,omitempty"`
	} `json:"reminders,omitempty"`
	Updated string `json:"updated,omitempty"`
	Etag    string `json:"etag,omitempty"`
}

// GoogleSyncResult summarizes a sync session.
type GoogleSyncResult struct {
	Pulled       int    `json:"pulled"`
	Pushed       int    `json:"pushed"`
	Deleted      int    `json:"deleted"`
	SyncToken    string `json:"syncToken"`
	CalendarID   string `json:"calendarId"`
	FullSync     bool   `json:"fullSync"`
	Errors       int    `json:"errors"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}

// TokenStore persists tokens locally.
type TokenStore interface {
	Save(OAuthTokens) error
	Load() (OAuthTokens, error)
	Delete() error
}

// FileTokenStore stores tokens in a JSON file.
type FileTokenStore struct {
	path string
}

func (f *FileTokenStore) Save(tokens OAuthTokens) error {
	data, err := json.MarshalIndent(tokens, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(f.path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(f.path, data, 0o600)
}

func (f *FileTokenStore) Load() (OAuthTokens, error) {
	data, err := os.ReadFile(f.path)
	if err != nil {
		return OAuthTokens{}, err
	}
	var tokens OAuthTokens
	if err := json.Unmarshal(data, &tokens); err != nil {
		return OAuthTokens{}, err
	}
	return tokens, nil
}

func (f *FileTokenStore) Delete() error {
	if err := os.Remove(f.path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

// GoogleSyncService handles OAuth flows and HTTP calls to Google.
type GoogleSyncService struct {
	cfg        GoogleOAuthConfig
	httpClient *http.Client
	store      TokenStore
}

func NewGoogleSyncService(cfg GoogleOAuthConfig, store TokenStore) *GoogleSyncService {
	client := &http.Client{Timeout: 10 * time.Second}
	return &GoogleSyncService{
		cfg:        cfg,
		httpClient: client,
		store:      store,
	}
}

func (g *GoogleSyncService) HasClientConfig() bool {
	return g.cfg.ClientID != "" && g.cfg.ClientSecret != "" && g.cfg.RedirectURI != ""
}

// BuildAuthURL builds the OAuth authorization URL.
func (g *GoogleSyncService) BuildAuthURL(state string) (string, error) {
	if !g.HasClientConfig() {
		return "", errors.New("google client config not set")
	}
	if len(g.cfg.Scopes) == 0 {
		return "", errors.New("no scopes configured")
	}
	v := url.Values{
		"client_id":     {g.cfg.ClientID},
		"redirect_uri":  {g.cfg.RedirectURI},
		"response_type": {"code"},
		"scope":         {strings.Join(g.cfg.Scopes, " ")},
		"access_type":   {"offline"},
		"prompt":        {"consent"},
	}
	if state != "" {
		v.Set("state", state)
	}
	return "https://accounts.google.com/o/oauth2/v2/auth?" + v.Encode(), nil
}

// ExchangeCode exchanges an auth code for tokens.
func (g *GoogleSyncService) ExchangeCode(ctx context.Context, code string) (OAuthTokens, error) {
	if code == "" {
		return OAuthTokens{}, errors.New("code required")
	}
	return g.tokenRequest(ctx, url.Values{
		"code":          {code},
		"client_id":     {g.cfg.ClientID},
		"client_secret": {g.cfg.ClientSecret},
		"redirect_uri":  {g.cfg.RedirectURI},
		"grant_type":    {"authorization_code"},
	})
}

// Refresh refreshes an access token using a refresh token.
func (g *GoogleSyncService) Refresh(ctx context.Context, refreshToken string) (OAuthTokens, error) {
	if refreshToken == "" {
		return OAuthTokens{}, errors.New("refresh token required")
	}
	return g.tokenRequest(ctx, url.Values{
		"refresh_token": {refreshToken},
		"client_id":     {g.cfg.ClientID},
		"client_secret": {g.cfg.ClientSecret},
		"grant_type":    {"refresh_token"},
	})
}

func (g *GoogleSyncService) tokenRequest(ctx context.Context, payload url.Values) (OAuthTokens, error) {
	if !g.HasClientConfig() {
		return OAuthTokens{}, errors.New("google client config not set")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(payload.Encode()))
	if err != nil {
		return OAuthTokens{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return OAuthTokens{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return OAuthTokens{}, fmt.Errorf("token request failed: %s", resp.Status)
	}

	var raw struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int64  `json:"expires_in"`
		TokenType    string `json:"token_type"`
		Scope        string `json:"scope"`
		IDToken      string `json:"id_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return OAuthTokens{}, err
	}
	tokens := OAuthTokens{
		AccessToken:  raw.AccessToken,
		RefreshToken: raw.RefreshToken,
		TokenType:    raw.TokenType,
		Scope:        raw.Scope,
		IDToken:      raw.IDToken,
		Expiry:       time.Now().Add(time.Duration(raw.ExpiresIn) * time.Second).Format(time.RFC3339),
	}
	if tokens.RefreshToken == "" {
		// Keep existing refresh token if Google omits it on refresh.
		if stored, err := g.store.Load(); err == nil && stored.RefreshToken != "" {
			tokens.RefreshToken = stored.RefreshToken
		}
	}
	if g.store != nil {
		if err := g.store.Save(tokens); err != nil {
			return OAuthTokens{}, fmt.Errorf("save tokens: %w", err)
		}
	}
	return tokens, nil
}

// LoadTokens loads tokens from the store.
func (g *GoogleSyncService) LoadTokens() (OAuthTokens, error) {
	if g.store == nil {
		return OAuthTokens{}, errors.New("no token store configured")
	}
	return g.store.Load()
}

// EnsureAccessToken loads tokens and refreshes if needed.
func (g *GoogleSyncService) EnsureAccessToken(ctx context.Context) (OAuthTokens, error) {
	tokens, err := g.LoadTokens()
	if err != nil {
		return OAuthTokens{}, err
	}
	expired, err := isExpired(tokens.Expiry)
	if err != nil {
		return OAuthTokens{}, err
	}
	if expired {
		if tokens.RefreshToken == "" {
			return OAuthTokens{}, errors.New("token expired and no refresh token")
		}
		return g.Refresh(ctx, tokens.RefreshToken)
	}
	return tokens, nil
}

// FetchUserInfo fetches profile info using the access token.
func (g *GoogleSyncService) FetchUserInfo(ctx context.Context, accessToken string) (GoogleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return GoogleUserInfo{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := g.httpClient.Do(req)
	if err != nil {
		return GoogleUserInfo{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return GoogleUserInfo{}, fmt.Errorf("userinfo failed: %s", resp.Status)
	}
	var u GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return GoogleUserInfo{}, err
	}
	return u, nil
}

// ClearTokens removes stored tokens.
func (g *GoogleSyncService) ClearTokens() error {
	if g.store == nil {
		return errors.New("no token store configured")
	}
	return g.store.Delete()
}

// ListEvents fetches events with optional sync token.
func (g *GoogleSyncService) ListEvents(ctx context.Context, calendarID string, syncToken string) ([]GoogleEvent, string, error) {
	tokens, err := g.EnsureAccessToken(ctx)
	if err != nil {
		return nil, "", err
	}
	var events []GoogleEvent
	nextPage := ""
	fullSync := syncToken == ""
	for {
		params := url.Values{}
		if syncToken != "" {
			params.Set("syncToken", syncToken)
		} else {
			params.Set("singleEvents", "true")
			params.Set("showDeleted", "true")
			params.Set("maxResults", "2500")
		}
		if nextPage != "" {
			params.Set("pageToken", nextPage)
		}
		reqURL := fmt.Sprintf("https://www.googleapis.com/calendar/v3/calendars/%s/events?%s", url.PathEscape(calendarID), params.Encode())
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
		if err != nil {
			return nil, "", err
		}
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		resp, err := g.httpClient.Do(req)
		if err != nil {
			return nil, "", err
		}
		if resp.StatusCode == http.StatusGone {
			// syncToken expired; require full sync
			resp.Body.Close()
			if fullSync {
				return nil, "", fmt.Errorf("sync token expired")
			}
			return g.ListEvents(ctx, calendarID, "")
		}
		if resp.StatusCode >= 400 {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return nil, "", fmt.Errorf("list events failed: %s %s", resp.Status, string(body))
		}
		var payload struct {
			Items     []GoogleEvent `json:"items"`
			NextPage  string        `json:"nextPageToken"`
			SyncToken string        `json:"nextSyncToken"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			resp.Body.Close()
			return nil, "", err
		}
		resp.Body.Close()
		events = append(events, payload.Items...)
		if payload.NextPage != "" {
			nextPage = payload.NextPage
			continue
		}
		if payload.SyncToken != "" {
			return events, payload.SyncToken, nil
		}
		return events, "", nil
	}
}

// ListEventsRange fetches events in a date range.
func (g *GoogleSyncService) ListEventsRange(ctx context.Context, calendarID string, timeMin, timeMax string) ([]GoogleEvent, error) {
	tokens, err := g.EnsureAccessToken(ctx)
	if err != nil {
		return nil, err
	}
	params := url.Values{}
	params.Set("singleEvents", "true")
	params.Set("showDeleted", "false")
	params.Set("maxResults", "2500")
	if timeMin != "" {
		params.Set("timeMin", timeMin)
	}
	if timeMax != "" {
		params.Set("timeMax", timeMax)
	}

	reqURL := fmt.Sprintf("https://www.googleapis.com/calendar/v3/calendars/%s/events?%s", url.PathEscape(calendarID), params.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list events failed: %s %s", resp.Status, string(body))
	}
	var payload struct {
		Items []GoogleEvent `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload.Items, nil
}

// CreateEvent creates a Google Calendar event.
func (g *GoogleSyncService) CreateEvent(ctx context.Context, calendarID string, ev GoogleEvent) (GoogleEvent, error) {
	return g.writeEvent(ctx, http.MethodPost, calendarID, "", "", ev)
}

// UpdateEvent updates an existing Google Calendar event with optional ETag match.
func (g *GoogleSyncService) UpdateEvent(ctx context.Context, calendarID, eventID, etag string, ev GoogleEvent) (GoogleEvent, error) {
	return g.writeEvent(ctx, http.MethodPatch, calendarID, eventID, etag, ev)
}

// DeleteEvent deletes an event.
func (g *GoogleSyncService) DeleteEvent(ctx context.Context, calendarID, eventID string) error {
	tokens, err := g.EnsureAccessToken(ctx)
	if err != nil {
		return err
	}
	reqURL := fmt.Sprintf("https://www.googleapis.com/calendar/v3/calendars/%s/events/%s", url.PathEscape(calendarID), url.PathEscape(eventID))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, reqURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	resp, err := g.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		return nil
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete event failed: %s %s", resp.Status, string(body))
	}
	return nil
}

func (g *GoogleSyncService) writeEvent(ctx context.Context, method, calendarID, eventID, ifMatch string, ev GoogleEvent) (GoogleEvent, error) {
	tokens, err := g.EnsureAccessToken(ctx)
	if err != nil {
		return GoogleEvent{}, err
	}
	payload, err := json.Marshal(ev)
	if err != nil {
		return GoogleEvent{}, err
	}
	target := fmt.Sprintf("https://www.googleapis.com/calendar/v3/calendars/%s/events", url.PathEscape(calendarID))
	if eventID != "" {
		target = target + "/" + url.PathEscape(eventID)
	}
	req, err := http.NewRequestWithContext(ctx, method, target, strings.NewReader(string(payload)))
	if err != nil {
		return GoogleEvent{}, err
	}
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	if ifMatch != "" {
		req.Header.Set("If-Match", ifMatch)
	}
	resp, err := g.httpClient.Do(req)
	if err != nil {
		return GoogleEvent{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		return GoogleEvent{}, errGoogleNotFound
	}
	if resp.StatusCode == http.StatusPreconditionFailed {
		return GoogleEvent{}, errGoogleConflict
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return GoogleEvent{}, fmt.Errorf("write event failed: %s %s", resp.Status, string(body))
	}
	var out GoogleEvent
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return GoogleEvent{}, err
	}
	return out, nil
}

func isExpired(expiry string) (bool, error) {
	if expiry == "" {
		return false, nil
	}
	t, err := time.Parse(time.RFC3339, expiry)
	if err != nil {
		return false, err
	}
	// consider token expired if within 30 seconds of expiry
	return time.Now().Add(30 * time.Second).After(t), nil
}
