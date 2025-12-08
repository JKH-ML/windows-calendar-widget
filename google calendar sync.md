# Google Calendar Sync Guide

실제 구현 시 고려해야 할 핵심 포인트를 정리했습니다.

## 필드 매핑
- 제목→`summary`, 설명→`description`, 위치→`location`, 색상→`colorId`
- 시간 이벤트: `start.dateTime` / `end.dateTime` + `timeZone`
- 종일 이벤트: `start.date` / `end.date` (끝은 다음날 00:00)
- 반복: `recurrence`(`RRULE`, `EXDATE`), 예외 인스턴스 처리
- 알림: `reminders.overrides`(분 단위), 기본 알림 사용 여부 플래그

## OAuth & 토큰
- 스코프 최소화: 예) `https://www.googleapis.com/auth/calendar.events`
- PKCE 코드 플로우 권장, 액세스/리프레시 토큰은 안전 저장(암호화 파일/OS 키체인)
- 만료/갱신/철회 처리, 다중 계정 지원 시 계정 선택/전환 UX 제공

## 로컬 DB 확장 예시
- `google_event_id`, `google_calendar_id`, `time_zone`
- `sync_status`: local/new/dirty/deleted/synced/conflict
- `google_etag`, `google_updated_at`
- 캘린더별 `sync_token`(delta sync용)

## 동기화 전략
- 단방향/양방향 명확화; 기본은 증분 동기화(`syncToken`) 사용
- 누락/토큰 만료 시 전체 재동기화로 폴백
- 충돌 정책: 최신 수정 우선, 혹은 사용자 선택. 조건부 요청(ETag / `If-Match`) 사용
- 삭제: Google은 `status=canceled`로 전달 → 로컬 소프트 삭제 처리

## 타임존/날짜
- 생성/수정 시 올바른 `timeZone` 지정. DST 변화 시각 주의
- 종일 이벤트는 `date`, 시간 이벤트는 `dateTime` 사용해 혼동 방지

## 알림/색상 매핑
- 로컬 알림 오프셋을 `reminders.overrides.minutes`로 변환
- 로컬 색상 ↔ Google `colorId` 매핑 테이블 정의

## 에러/백오프
- 쿼터/429/5xx 대응: 지수 백오프, 재시도 한도, 지연 큐
- 네트워크 불안정 시 오프라인 큐에 적재 후 재동기화
- 오류 로깅 시 토큰/PII 마스킹

## UX 가이드
- 연결/해제, 동기화 수동 버튼, 마지막 동기화 시각 표시
- 충돌/실패 알림, 읽기 전용 캘린더에 쓰기 금지 메시지
- 계정 전환, 로그아웃 시 토큰/캐시 정리

## 테스트 체크리스트
- 종일/시간 이벤트 생성·수정·삭제
- 반복 이벤트(예외 포함) 양방향 동기화
- 타임존/DST 경계 시각
- 오프라인 상태 변경 후 재동기화
- 권한 부족/읽기전용 캘린더 시나리오

## 오픈 질문(정의 필요)
- 단방향 vs 양방향? 어느 캘린더를 동기화할지 선택 UX?
- 충돌 시 자동 규칙 vs 사용자 선택?
- 색상/알림 매핑을 로컬 기준으로 할지, Google 기본값을 따를지?

## 현재 코드 베이스에 추가된 준비물
- DB: `google_event_id`, `google_calendar_id`, `time_zone`, `google_etag`, `google_updated_at` 컬럼을 자동 마이그레이션.
- 백엔드: OAuth 헬퍼(`GoogleAuthURL`, `GoogleExchangeCode`, `GoogleRefreshTokens`)와 파일 토큰 스토어(`~/.config/calendar-widget/google_tokens.json`), OAuth 설정은 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`로 주입.
- 프런트 타입: 이벤트 타입에 구글 관련 필드를 옵션으로 포함.
- 기본 스코프: `calendar.events`, `openid`, `userinfo.email`, `userinfo.profile` (프로필 노출/로그인 상태 표시용)
