export namespace main {
	
	export class AppSettings {
	    autoStart: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.autoStart = source["autoStart"];
	    }
	}
	export class CalendarEvent {
	    id: string;
	    title: string;
	    allDay: boolean;
	    start: string;
	    end: string;
	    recurrence: string;
	    recurrenceCustom: string;
	    location: string;
	    alert: string;
	    alertOffset: number;
	    color: string;
	    description: string;
	    syncStatus: string;
	    googleEventId: string;
	    googleCalendarId: string;
	    timeZone: string;
	    googleEtag: string;
	    googleUpdatedAt: string;
	    updatedAt: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new CalendarEvent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.allDay = source["allDay"];
	        this.start = source["start"];
	        this.end = source["end"];
	        this.recurrence = source["recurrence"];
	        this.recurrenceCustom = source["recurrenceCustom"];
	        this.location = source["location"];
	        this.alert = source["alert"];
	        this.alertOffset = source["alertOffset"];
	        this.color = source["color"];
	        this.description = source["description"];
	        this.syncStatus = source["syncStatus"];
	        this.googleEventId = source["googleEventId"];
	        this.googleCalendarId = source["googleCalendarId"];
	        this.timeZone = source["timeZone"];
	        this.googleEtag = source["googleEtag"];
	        this.googleUpdatedAt = source["googleUpdatedAt"];
	        this.updatedAt = source["updatedAt"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class GoogleSyncResult {
	    pulled: number;
	    pushed: number;
	    deleted: number;
	    syncToken: string;
	    calendarId: string;
	    fullSync: boolean;
	    errors: number;
	    errorMessage?: string;
	
	    static createFrom(source: any = {}) {
	        return new GoogleSyncResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pulled = source["pulled"];
	        this.pushed = source["pushed"];
	        this.deleted = source["deleted"];
	        this.syncToken = source["syncToken"];
	        this.calendarId = source["calendarId"];
	        this.fullSync = source["fullSync"];
	        this.errors = source["errors"];
	        this.errorMessage = source["errorMessage"];
	    }
	}
	export class GoogleTokenInfo {
	    connected: boolean;
	    expiresAt: string;
	    scope: string;
	    hasRefreshToken: boolean;
	    userEmail: string;
	    userName: string;
	    picture: string;
	    clientConfigured: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GoogleTokenInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connected = source["connected"];
	        this.expiresAt = source["expiresAt"];
	        this.scope = source["scope"];
	        this.hasRefreshToken = source["hasRefreshToken"];
	        this.userEmail = source["userEmail"];
	        this.userName = source["userName"];
	        this.picture = source["picture"];
	        this.clientConfigured = source["clientConfigured"];
	    }
	}
	export class OAuthTokens {
	    accessToken: string;
	    refreshToken: string;
	    expiry: string;
	    tokenType: string;
	    scope: string;
	    idToken?: string;
	
	    static createFrom(source: any = {}) {
	        return new OAuthTokens(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accessToken = source["accessToken"];
	        this.refreshToken = source["refreshToken"];
	        this.expiry = source["expiry"];
	        this.tokenType = source["tokenType"];
	        this.scope = source["scope"];
	        this.idToken = source["idToken"];
	    }
	}

}

