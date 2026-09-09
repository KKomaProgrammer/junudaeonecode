# 김대원 & 이준우의 코드 공유 사이트

Cloudflare Pages + Pages Functions + Workers KV로 동작하는 간단한 코드 공유 사이트입니다.

## 주요 기능

- CodeMirror 기반 코드 편집
- highlight.js 기반 언어 자동 감지
- 자동 감지된 언어 옆에 `인식됨` 표시
- 언어 직접 선택 및 자동 감지 재활성화
- `/share/4자리ID` 공유 링크 생성
- 공유 링크 기본값: `비밀번호 입력`
- 공유 링크 옵션: `비밀번호 없이 보기`
- Cloudflare 환경변수 `ACCESS_PASSWORD` 기반 사이트 접속 보호
- `ACCESS_PASSWORD`를 삭제하거나 빈 값으로 두면 접속 비밀번호 비활성화

## Cloudflare Pages 배포

### 1. Pages 프로젝트 연결

이 GitHub 저장소를 Cloudflare Pages에 연결합니다.

- Framework preset: `None`
- Build command: 비움
- Build output directory: `public`

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

## 로컬 개발

Pages Functions까지 포함해 테스트하려면 Wrangler Pages 개발 서버를 사용합니다. 로컬 비밀번호는 `.dev.vars`에 넣을 수 있습니다.

```dotenv
ACCESS_PASSWORD="your-password"
```

`.dev.vars`와 `.env` 계열 파일은 `.gitignore`에 포함되어 저장소에 올라가지 않습니다.
