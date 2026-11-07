# 토이북 ToyBook (by wow3d)

AI 동화책 만들기 + 캐릭터 3D 프린팅 웹앱. 설계 문서는 [`docs/PRD_KO.md`](docs/PRD_KO.md) (v0.2) 를 따릅니다.

- 화면: React + Vite (Cloudflare **Pages** 에 정적 배포)
- API: Cloudflare **Pages Functions** (`functions/api/*`)
- DB: Cloudflare **D1** (바인딩 이름 `DB`, DB 이름 `toybook-db`)
- 파일(삽화·3D 모델): Cloudflare **R2** (바인딩 이름 `BUCKET`, 버킷 이름 `toybook-files`)

## 지금 들어 있는 것 (뼈대 v0.1)

| 화면 / API | 내용 |
|---|---|
| `/` 누가 볼까요? | 아이 프로필 선택 — 닉네임·아바타·연령 모드 (PRD 9.1~9.2) |
| `/shelf/:childId` 우리 집 책장 | 내 책 목록, 하단 큰 메뉴 4개 |
| `/book/:bookId` 동화 극장 | 한 쪽씩 넘기기, 🔊 읽어 주기(브라우저 TTS) |
| `/parent` 부모 잠금 | 한글로 쓴 덧셈 문제("삼십칠 더하기 사십팔") 통과 후 부모 모드 (PRD 9.4) |
| `GET /api/health` | D1·R2 연결 확인 |
| `GET /api/children` | 아이 프로필 목록 |
| `GET/POST /api/books`, `GET /api/books/:id` | 책 목록·생성·조회 (D1) |
| `POST /api/upload`, `GET /api/files/*` | 이미지·GLB 업로드/다운로드 (R2, 가족별 폴더 분리) |
| `/api/auth/{kakao|naver|google}/start·callback`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/signup` | 간편 가입·로그인, 약관 동의, 로그아웃, 가입 그만두기 (`functions/_lib/auth.ts`) |
| `/api/children` (POST), `/api/children/:id` (PATCH·DELETE), `/api/parent/pin·unlock·lock`, `/api/account` (PATCH·DELETE) | 아이 프로필 만들기·고치기·지우기, 부모 PIN·부모 모드, 내 정보·탈퇴 (부모 모드에서만, `functions/_lib/parent.ts`) |
| `migrations/0001_init.sql` | 부모·아이·캐릭터·책·페이지·3D모델·갖고싶어요·주문 테이블 |

아직 없는 것: AI 글·삽화 생성, 이미지→3D, 주문·결제.

## 내 PC에서 실행하기 (Windows)

준비물: [Node.js 22 LTS](https://nodejs.org/)

```powershell
cd D:\Program_DEV\wow3d-ToyBook
npm install
npm run db:migrate:local     # 로컬 D1 에 테이블 만들기
npm run db:seed:local        # 데모 아이·책 넣기
copy .dev.vars.example .dev.vars   # 로컬 비밀값 (책 생성·업로드 허용 포함)
npm run preview              # 빌드 후 http://localhost:8788 에서 화면+API 함께 실행
```

로컬 D1·R2 는 `.wrangler/` 폴더 안에 흉내 내서 만들어지므로 Cloudflare 계정 없이도 돌아갑니다.

## Cloudflare 배포 (운영 중)

- 주소: **https://wow3d-toybook.pages.dev**
- 리소스 (모두 APAC): Pages 프로젝트 `wow3d-toybook`, D1 `toybook-db`, R2 `toybook-files`. 바인딩은 `wrangler.toml` 에서 자동 적용
- 쓰기 API(책 생성·업로드)는 **가입을 마친 로그인 계정**만 쓸 수 있습니다. 로그인하지 않으면 데모 계정을 보기 전용으로 둘러봅니다. 로컬에서는 `ALLOW_DEMO_WRITES=true` 로 로그인 없이도 쓸 수 있고, 운영 환경 변수에는 넣지 마세요.
- 운영 DB 에는 지금 데모 데이터(`seed/demo.sql`)가 들어 있습니다. 로그인 연동 후 실제 가입을 받기 전에 지웁니다.

### 간편 가입 키 등록 (카카오·네이버·구글)

키가 없는 로그인 수단은 로그인 화면에 "준비 중"으로 보입니다. 각 개발자 센터에서 앱을 만들고 **돌아올 주소(Redirect URI)** 를 등록한 뒤, Cloudflare Pages > 설정 > 환경 변수에 **암호화(Secret)** 로 넣고 다시 배포하세요.

| 수단 | 만드는 곳 | 돌아올 주소 (운영) | 환경 변수 |
|---|---|---|---|
| 카카오 | developers.kakao.com > 내 애플리케이션 > 카카오 로그인 켜기, 동의 항목: 닉네임(필수)·카카오계정 이메일(선택) | `https://wow3d-toybook.pages.dev/api/auth/kakao/callback` | `KAKAO_REST_API_KEY`, (보안 > Client Secret 을 켰다면) `KAKAO_CLIENT_SECRET` |
| 네이버 | developers.naver.com > 애플리케이션 등록 > 네이버 로그인, 제공 정보: 별명·이메일 | `https://wow3d-toybook.pages.dev/api/auth/naver/callback` | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` |
| 구글 | console.cloud.google.com > API 및 서비스 > OAuth 동의 화면 + 사용자 인증 정보(웹 애플리케이션) | `https://wow3d-toybook.pages.dev/api/auth/google/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

- **나이 확인(만 14세 미만 가입 막기)**: 카카오는 동의 항목에서 "출생 연도" 또는 "연령대"를, 네이버는 제공 정보에서 "출생연도"를 켜 두면 가입 때 확인합니다(저장하지 않음). 정보가 없으면(구글 등) 가입 화면의 "만 14세 이상" 확인으로 받습니다.
- 로컬에서 시험할 때는 같은 앱에 `http://localhost:8788/api/auth/{kakao|naver|google}/callback` 도 등록하고 `.dev.vars` 에 키를 넣으세요.
- 키 없이 가입 흐름만 볼 때는 `.dev.vars` 의 `ALLOW_DEV_LOGIN=true` 로 "시험용 로그인"이 나타납니다. **운영에는 절대 넣지 마세요.**
- 가입 흐름: 간편 로그인 → `/signup` 약관 동의(필수: 만 14세 이상 보호자·이용약관·개인정보 수집·이용·아이 정보 법정대리인 동의 / 선택: 소식 받기) → 가입 완료. 동의 전에 그만두면 받은 정보를 바로 지웁니다.

### 보호자 본인인증 (포트원 V2)

법정대리인 동의 확인용. 키가 없으면 꺼져 있고(동의 체크로만 받음), 아래 세 값을 Cloudflare 환경 변수(암호화)에 넣으면 가입 마지막 단계와 "우리 아이" 화면에 본인인증이 켜집니다. 켜지면 인증을 마친 보호자만 아이 프로필을 만들 수 있습니다.

| 환경 변수 | 어디서 |
|---|---|
| `PORTONE_API_SECRET` | 포트원 콘솔 > 연동 정보 > V2 API Secret |
| `PORTONE_STORE_ID` | 포트원 콘솔 > 연동 정보 > 상점 아이디 |
| `PORTONE_IDV_CHANNEL_KEY` | 포트원 콘솔 > 채널 관리 > 본인인증 채널(다날 휴대폰 본인인증, KG이니시스 통합인증 등)의 채널 키 |

- 결과에서 성인(만 19세 이상)인지만 확인하고 이름·전화번호·생년월일·CI 는 저장하지 않습니다 (`functions/_lib/verify.ts`).
- 처음 켤 때 실제 휴대폰으로 PC·휴대폰 각각 한 번씩 인증해 보세요. 인증 창이 막히면 `public/_headers` 의 CSP(`cdn.portone.io`, `*.portone.io`, `*.iamport.kr`)를 확인합니다.
- 로컬에서는 `ALLOW_DEV_LOGIN=true` 이면 시험용 본인인증(확인 = 성인, 취소 = 미성년)이 나옵니다.

### 자동 배포 (GitHub Actions)

`main` 에 push 하면 `.github/workflows/deploy.yml` 이 타입 검사 → 빌드 → D1 마이그레이션 → Pages 배포를 합니다.
처음 한 번 GitHub 저장소 **Settings > Secrets and variables > Actions > New repository secret** 에 두 값을 등록해야 합니다 (없으면 배포 단계는 건너뜀).

| 이름 | 값 |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | `85c8e953bdefb825af5374f0d66ca5dc` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare 대시보드 > 내 프로필 > API 토큰 > 토큰 만들기 > 사용자 지정 토큰. 권한: **계정 · Cloudflare Pages · 편집**, **계정 · D1 · 편집** |

### 손으로 배포

```powershell
npx wrangler login
npm run db:migrate:remote   # 새 마이그레이션이 있을 때
npm run deploy
```

API 키(Claude, 이미지, Meshy 등)는 Pages 프로젝트 > 설정 > 변수 및 비밀에 **암호화**로 추가합니다 (`.dev.vars.example` 참고).

## 폴더 구조

```
docs/PRD_KO.md        기획서 (PRD v0.2)
functions/            Pages Functions (API)
  _lib/               공통 (Env 타입, 응답 헬퍼, 로그인 자리)
  api/                /api/* 경로
migrations/           D1 스키마
seed/                 로컬 데모 데이터
public/               PWA manifest, 보안 헤더
src/                  화면 (React)
  pages/              ProfileSelect, Bookshelf, BookViewer, ParentGate
  styles.css          디자인 토큰 (PRD 8.3 크림 배경·파스텔·주황 강조, 64px 버튼)
wrangler.toml         Cloudflare 설정 (D1·R2 바인딩)
.github/workflows/    main push → Cloudflare Pages 자동 배포
```

## 다음 개발 순서 (PRD 13장 MVP 기준)

1. 회원가입 다음 단계: 포트원 본인인증 키 등록 후 실제 인증 시험, PIN 잊었을 때 다시 로그인으로 재설정, 운영 DB 데모 데이터 정리 (1·2단계 간편 가입·약관 동의·아이 프로필·부모 PIN·탈퇴는 완료)
2. 이야기 공방: Claude API 로 줄거리·본문 생성, 이미지 API 로 삽화 생성 → R2 저장
3. 마법 상자: Meshy/Tripo API 로 이미지→3D (Cloudflare Queues 로 비동기 처리), three.js 뷰어
4. 장난감 공장: "갖고 싶어요" → 부모 승인 → 결제(포트원/토스) → wow3d pro 주문 전달
