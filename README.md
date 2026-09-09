# 김대원 & 이준우의 코드 공유 사이트

Cloudflare Pages + Pages Functions + Workers KV로 동작하는 간단한 코드 공유 사이트입니다.

## 주요 기능

- CodeMirror 기반 코드 편집
- 브라우저 localStorage 기반 자동 임시저장
- 메인 편집기와 각 `/share/4자리ID`별 임시저장본 분리
- highlight.js + 보조 판별 로직 기반 언어 자동 인식
- 기본값이 `자동 인식`인 검색 가능한 커스텀 언어 드롭다운
- 자동 인식된 언어에 `인식됨` 표시
- 언어 직접 선택 가능
- `/share/4자리ID` 공유 링크 생성
- 공유 링크 기본값: `비밀번호 입력`
- 공유 링크 옵션: `비밀번호 없이 보기`
- `문자로 공유하기`: 코드 내용을 그대로 넣은 `.png` 확장자 파일 생성, 다운로드 및 Web Share API 공유 지원
- 문자 공유 안내는 최초 1회 자동 표시하고 이후 정보 아이콘에서 다시 확인 가능
- Cloudflare 환경변수 `ACCESS_PASSWORD` 기반 사이트 접속 보호
- `ACCESS_PASSWORD`를 삭제하거나 빈 값으로 두면 접속 비밀번호 비활성화

## Cloudflare Pages 배포

### 1. Pages 프로젝트 연결

이 GitHub 저장소를 Cloudflare Pages에 연결합니다.

- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `public`

`functions` 디렉터리는 Pages Functions로 자동 인식됩니다.

### 2. KV 생성 및 바인딩

4자리 공유 ID에 대응하는 코드를 저장하기 위해 Workers KV namespace가 필요합니다.

Cloudflare 대시보드에서 KV namespace를 만든 뒤 Pages 프로젝트의 **Settings → Bindings**에서 다음 이름으로 연결합니다.

- Binding name: `CODE_SHARES`

Production과 Preview 환경을 모두 사용할 경우 두 환경 모두 같은 이름으로 바인딩해야 합니다.

### 3. 접속 비밀번호 설정

Pages 프로젝트의 **Settings → Variables and Secrets**에서 아래 값을 추가합니다.

- Name: `ACCESS_PASSWORD`
- Value: 원하는 접속 비밀번호

비밀번호이므로 가능하면 일반 텍스트 변수보다 **Secret**으로 저장하는 것을 권장합니다.

`ACCESS_PASSWORD`가 존재하면:

- 메인 사이트 접속 시 비밀번호 필요
- 기본 공유 옵션인 `비밀번호 입력` 링크도 비밀번호 필요
- `비밀번호 없이 보기`로 만든 링크는 비밀번호 없이 열람 가능

`ACCESS_PASSWORD`를 삭제하거나 빈 값으로 설정하면 사이트 전체가 비밀번호 없이 열립니다.

## 문자로 공유하기 동작

`문자로 공유하기`가 만드는 파일은 실제 PNG 이미지 데이터가 아니라 현재 코드의 UTF-8 텍스트 데이터를 `.png` 확장자로 저장한 파일입니다. 따라서 이미지 앱에서는 비어 있거나 깨져 보일 수 있으며, 받는 사람이 파일 확장자를 `.png`에서 `.txt`로 바꾸면 코드 내용을 볼 수 있습니다.

지원되는 모바일 브라우저에서는 Web Share API를 사용해 기기의 공유 창을 바로 열 수 있습니다. 브라우저나 공유 대상 앱이 파일 공유를 지원하지 않는 경우에는 PNG 다운로드 기능을 사용하면 됩니다.

## 로컬 개발

Pages Functions까지 포함해 테스트하려면 Wrangler Pages 개발 서버를 사용합니다. 로컬 비밀번호는 `.dev.vars`에 넣을 수 있습니다.

```dotenv
ACCESS_PASSWORD="your-password"
```

`.dev.vars`와 `.env` 계열 파일은 `.gitignore`에 포함되어 저장소에 올라가지 않습니다.
