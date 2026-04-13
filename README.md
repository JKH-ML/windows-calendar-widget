# Calendar Widget

<p align="center">
  <img src="frontend/src/assets/images/logo_1024.png" alt="Calendar Widget logo" width="220" />
</p>

<p align="center">
  Windows용 경량 데스크탑 캘린더 위젯 — Google Calendar 양방향 동기화 지원<br/>
  A lightweight Windows desktop calendar widget with two-way Google Calendar sync
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white"/>
  <img src="https://img.shields.io/badge/Wails-CC0000?style=flat&logo=go&logoColor=white"/>
  <img src="https://img.shields.io/badge/SQLite-07405E?style=flat&logo=sqlite&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white"/>
</p>

> 이 프로젝트는 오픈소스로 무료이며, 누구나 코드를 자유롭게 사용·수정·재배포할 수 있습니다.  
> This project is open-source and free; you're welcome to use, modify, and redistribute the code.

---

## 목차 / Table of Contents

- [주요 기능](#주요-기능--features)
- [설치 (사용자)](#설치-사용자용--installation-end-users)
- [Google Calendar 연동](#google-calendar-연동--google-calendar-setup)
- [설정 및 사용법](#설정-및-사용법--settings--usage)
- [자동 업데이트](#자동-업데이트--auto-update)
- [개발자 가이드](#개발자-가이드--developer-guide)
- [데이터 저장 위치](#데이터-저장-위치--data-storage)
- [릴리즈](#릴리즈--releases)

---

## 주요 기능 / Features

| 기능 | 설명 |
|------|------|
| **달력 뷰** | 월간 / 주간 / 일간 세 가지 보기 전환 |
| **이벤트 관리** | 생성·수정·삭제, 종일 이벤트, 반복 일정(매일/매주/매월/매년/맞춤) |
| **Google Calendar 동기화** | 양방향 동기화 — 앱 포커스 시 자동, 또는 수동 동기화 버튼 |
| **공휴일 표시** | Google 공휴일 캘린더에서 자동 가져오기 (한국·미국·영국 지원) |
| **검색** | 제목·장소·메모로 이벤트 검색 |
| **테마** | 라이트 / 다크 / 시스템 자동 |
| **언어** | 한국어 / 영어 / 시스템 자동 (설정 저장됨) |
| **위치·크기 자유 조절** | 드래그 이동, 크기 직접 입력, 재시작 후에도 유지 |
| **자동 시작** | Windows 로그인 시 자동 실행 (켜기/끄기 선택 가능) |
| **자동 업데이트** | 새 버전 감지 → 한 번의 클릭으로 다운로드·교체·재시작 |
| **작업표시줄 숨김** | 트레이 없이 바탕화면에 상주, 작업표시줄에 표시 안 됨 |

---

## 설치 (사용자용) / Installation (End Users)

### 1. exe 다운로드

**릴리즈 페이지:** https://github.com/JKH-ML/windows-calendar-widget/releases

최신 버전의 `calendar-widget.exe`를 다운로드합니다.

### 2. 설치 위치

자동 업데이트가 정상 동작하려면 **반드시 아래 경로**에 설치해야 합니다.

```
%LOCALAPPDATA%\CalendarWidget\calendar-widget.exe
```

**설치 방법:**
1. Windows 탐색기 주소창에 `%LOCALAPPDATA%\CalendarWidget` 입력 후 Enter
2. 폴더가 없으면 새로 만들기
3. 다운로드한 `calendar-widget.exe`를 해당 폴더에 복사

> `%LOCALAPPDATA%`는 보통 `C:\Users\사용자명\AppData\Local`입니다.  
> 이 위치는 관리자 권한 없이 쓸 수 있어 자동 업데이트에 필수입니다.

### 3. 실행

`calendar-widget.exe`를 더블클릭하면 바탕화면에 위젯이 표시됩니다.

---

## Google Calendar 연동 / Google Calendar Setup

Google Calendar와 동기화하려면 Google Cloud Console에서 OAuth 클라이언트를 직접 발급해야 합니다.

### 1. Google Cloud Console 설정

1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **API 및 서비스 → 라이브러리**에서 **Google Calendar API** 활성화
4. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID** 클릭
5. 애플리케이션 유형: **데스크톱 앱** 선택
6. 생성 후 **클라이언트 ID**와 **클라이언트 보안 비밀** 복사

### 2. 앱에 입력

1. 앱 우측 상단 메뉴(☰) → **계정 설정** 클릭
2. **OAuth 클라이언트** 섹션에서 **수정** 버튼 클릭
3. Client ID, Client Secret 입력 후 저장
4. **Google Calendar 연동 시작** 버튼 클릭 → 브라우저에서 Google 로그인
5. 로그인 완료 후 앱이 자동으로 연결 상태를 감지

### 요청 권한 (Scope)

| 권한 | 용도 |
|------|------|
| `calendar.events` | 캘린더 이벤트 읽기·쓰기 |
| `userinfo.email` | 연결된 계정 이메일 표시 |
| `userinfo.profile` | 연결된 계정 이름·사진 표시 |

앱은 이벤트 데이터를 외부 서버로 전송하지 않으며, 모든 데이터는 로컬에만 저장됩니다.

---

## 설정 및 사용법 / Settings & Usage

### 헤더 버튼

| 버튼 | 기능 |
|------|------|
| 뷰 전환 (일/주/월) | 달력 보기 모드 변경 |
| ☁ (구름 아이콘) | Google 연결 상태 표시 / 계정 설정 열기 |
| ＋ | 새 이벤트 생성 |
| 🌙 / ☀ | 다크·라이트 테마 전환 |
| ☰ | 메뉴 열기 |

### 메뉴 항목

| 항목 | 기능 |
|------|------|
| 캘린더 위젯 닫기 | 앱 종료 |
| 위치와 크기 | 창 위치·크기 수동 설정 |
| 계정 설정 | Google 연동 / 로그아웃 / OAuth 클라이언트 설정 |
| 캘린더 설정 | 공휴일 국가·주 시작 요일·자동 시작 설정 |
| 언어 설정 | 한국어 / 영어 / 시스템 자동 |
| 일정 검색 | 제목·장소·메모로 이벤트 검색 |
| 문의하기 | 카카오 오픈채팅으로 문의 |

### 이벤트 생성·수정

- 달력의 날짜 칸 클릭 → 새 이벤트 생성 다이얼로그
- 이벤트 클릭 → 수정·삭제 다이얼로그
- 지원 필드: 제목, 시작·종료 시간, 색상, 종일 여부, 반복, 위치, 알림, 설명

### Google 동기화 동작 방식

- 앱 포커스 시 자동 동기화
- Google 로그인 직후 자동 동기화
- ☁ 버튼 옆 상태 아이콘으로 연결 여부 실시간 확인
- 동기화 실패 시 상단에 오류 배너 표시

---

## 자동 업데이트 / Auto-Update

새 버전이 출시되면 앱 시작 시 GitHub Releases를 확인하여 상단에 알림 배너를 표시합니다.

```
┌─────────────────────────────────────────────┐
│ 새 버전이 출시되었습니다.    [지금 업데이트] [✕] │
└─────────────────────────────────────────────┘
```

**"지금 업데이트"** 클릭 시:
1. 새 exe를 백그라운드에서 다운로드
2. 앱 종료 후 기존 exe를 새 exe로 자동 교체
3. 새 버전으로 재시작

> 자동 업데이트는 `%LOCALAPPDATA%\CalendarWidget\` 경로에 설치된 경우에만 정상 동작합니다.

---

## 개발자 가이드 / Developer Guide

### 요구사항

- Go 1.23+
- Node.js 20+
- [Wails CLI v2.11](https://wails.io/docs/gettingstarted/installation) (`go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0`)

### 로컬 개발 실행

```bash
git clone https://github.com/JKH-ML/windows-calendar-widget.git
cd windows-calendar-widget
wails dev
```

### 프로덕션 빌드

```bash
wails build -clean -platform windows/amd64
# 결과물: build/bin/calendar-widget.exe
```

### 환경 변수 (선택)

앱 UI에서 OAuth 설정을 입력하는 대신 환경 변수로 미리 지정할 수 있습니다.

| 변수 | 설명 |
|------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 |
| `GOOGLE_REDIRECT_URI` | OAuth 콜백 URI (기본값: `http://localhost:34115/oauth2/callback`) |

### 기술 스택

**백엔드 (Go)**
- [Wails v2](https://wails.io/) — Go + WebView2 기반 데스크탑 앱 프레임워크
- [modernc/sqlite](https://pkg.go.dev/modernc.org/sqlite) — CGO 없는 순수 Go SQLite 드라이버
- Google Calendar API v3 (직접 HTTP 호출, 외부 SDK 없음)

**프론트엔드 (React + TypeScript)**
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI 기반)
- Framer Motion — 뷰 전환 애니메이션
- date-fns — 날짜 연산
- react-hook-form + zod — 이벤트 폼 유효성 검사

### 새 버전 릴리즈

```bash
git add .
git commit -m "feat: ..."
git push origin main
git tag v1.x.x
git push origin v1.x.x
```

태그 push 시 GitHub Actions가 자동으로:
1. Windows AMD64 빌드 (`wails build`)
2. 빌드된 exe에 버전 주입 (`-ldflags "-X main.AppVersion=1.x.x"`)
3. GitHub Release 생성 + exe 업로드

---

## 데이터 저장 위치 / Data Storage

모든 데이터는 로컬에만 저장됩니다. 외부 서버로 전송되는 데이터는 없습니다.

| 파일 | 위치 | 내용 |
|------|------|------|
| `events.db` | `%AppData%\calendar-widget\` | 이벤트 데이터 (SQLite) |
| `google_tokens.json` | `%AppData%\calendar-widget\` | Google OAuth 토큰 |
| `settings.json` | `%AppData%\calendar-widget\` | 앱 설정 (자동 시작, OAuth 클라이언트 ID 등) |

로그아웃 시 `google_tokens.json`과 `events.db`의 캐시 데이터가 즉시 삭제됩니다.

개인정보처리방침: https://jkh-ml.github.io/windows-calendar-widget/privacy.html

---

## 릴리즈 / Releases

https://github.com/JKH-ML/windows-calendar-widget/releases

최신 릴리즈의 `calendar-widget.exe`를 다운로드하세요.
