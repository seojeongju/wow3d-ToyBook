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
| `migrations/0001_init.sql` | 부모·아이·캐릭터·책·페이지·3D모델·갖고싶어요·주문 테이블 |

아직 없는 것: 실제 로그인(지금은 데모 부모 계정 고정), AI 글·삽화 생성, 이미지→3D, 주문·결제.

## 내 PC에서 실행하기 (Windows)

준비물: [Node.js 22 LTS](https://nodejs.org/)

```powershell
cd D:\Program_DEV\wow3d-ToyBook
npm install
npm run db:migrate:local     # 로컬 D1 에 테이블 만들기
npm run db:seed:local        # 데모 아이·책 넣기
npm run preview              # 빌드 후 http://localhost:8788 에서 화면+API 함께 실행
```

로컬 D1·R2 는 `.wrangler/` 폴더 안에 흉내 내서 만들어지므로 Cloudflare 계정 없이도 돌아갑니다.

## Cloudflare 에 배포하기

1. 로그인: `npx wrangler login`
2. D1 만들기: `npx wrangler d1 create toybook-db` → 출력된 `database_id` 를 `wrangler.toml` 에 붙여 넣기
3. R2 만들기: `npx wrangler r2 bucket create toybook-files`
4. 운영 DB 에 테이블 만들기: `npm run db:migrate:remote`
5. 배포 방법 중 하나 선택
   - **직접 올리기:** `npm run deploy` (처음 한 번은 Pages 프로젝트 이름을 물어봄 → `wow3d-toybook`)
   - **GitHub 연결(권장):** 이 폴더를 GitHub 저장소에 올리고, Cloudflare 대시보드 > Workers & Pages > 만들기 > Pages > Git 연결. 빌드 명령 `npm run build`, 출력 폴더 `dist`. 이후 push 할 때마다 자동 배포
6. Pages 프로젝트 > 설정 > 바인딩에서 D1 `DB` → `toybook-db`, R2 `BUCKET` → `toybook-files` 가 연결됐는지 확인 (`wrangler.toml` 이 있으면 자동 적용)
7. API 키는 Pages > 설정 > 환경 변수에 **암호화**로 추가 (`.dev.vars.example` 참고)

> 데모 데이터(`seed/demo.sql`)는 운영 DB 에는 넣지 마세요.

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
```

## 다음 개발 순서 (PRD 13장 MVP 기준)

1. 카카오 로그인 + 부모 PIN + 아이 프로필 관리 (`functions/_lib/http.ts` 의 `getParentId` 교체)
2. 이야기 공방: Claude API 로 줄거리·본문 생성, 이미지 API 로 삽화 생성 → R2 저장
3. 마법 상자: Meshy/Tripo API 로 이미지→3D (Cloudflare Queues 로 비동기 처리), three.js 뷰어
4. 장난감 공장: "갖고 싶어요" → 부모 승인 → 결제(포트원/토스) → wow3d pro 주문 전달
