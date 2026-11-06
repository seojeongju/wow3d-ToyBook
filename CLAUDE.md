# 토이북(wow3d-Toybook) 개발 규칙

한국 어린이(3~12세)와 부모를 위한 AI 그림책 + 3D 피규어 서비스. 기획은 `docs/PRD_KO.md`.
스택: React + Vite (Cloudflare Pages), Pages Functions(`functions/`), D1, R2. 설명은 `README_KO.md`.

## 1. 모든 작업의 기본 원칙
- **한국어 우선**: 화면 문구·메타 정보·구조화 데이터는 자연스러운 한국어. 아이 화면은 쉬운 존댓말("~해요").
- **점토(클레이) 스타일**: 이미지·아이콘은 점토 3D 질감(`ClayArt`, `ClayIcon`). 이모지·평면 아이콘을 그림으로 쓰지 않음.
- **아이 안전·개인정보**: 아이 콘텐츠(책장·책·대시보드)는 검색에 노출하지 않음. 아이 실명·사진은 공개 페이지에 넣지 않음.

## 2. SEO · AEO · GEO (매 작업마다 확인 — 아주 중요)
검색엔진(SEO), AI 답변 엔진(AEO: 네이버 AI 브리핑, 구글 AI 개요), 생성형 검색(GEO: ChatGPT·Claude·Perplexity·Gemini)이 **자바스크립트 없이도** 내용을 읽고 인용할 수 있어야 한다.

### 공개 페이지(검색 노출 대상)를 만들거나 고칠 때
1. **미리 그리기(prerender)**: `src/seo.ts` 의 `PAGE_META` 에 경로를 추가하면 빌드(`npm run build`) 때 `scripts/prerender.mjs` 가 완성된 HTML 을 만든다. 빌드 후 `dist/<경로>.html`(홈은 `dist/index.html`)에 본문 글자가 들어 있는지 확인. 주소는 끝에 `/` 없이(`/about`) 씀. 미리 그리는 페이지는 첫 화면에서 `window`·`localStorage` 를 바로 쓰지 말 것(효과·이벤트 안에서만).
2. **페이지 정보**: `PAGE_META` 에 제목(브랜드 포함 60자 이내)·설명(80~160자) 작성 → `App.tsx` 의 `useSeo` 와 미리 그리기가 제목·설명·대표 주소(canonical)·공유 정보를 적용. 제목은 페이지마다 달라야 함.
3. **제목 구조**: 페이지당 `<h1>` 하나, 그 아래 `<h2>`·`<h3>` 순서대로. 섹션은 `<section>` + 제목.
4. **답이 되는 문장(AEO/GEO)**: 질문형 제목 아래 첫 문장에 바로 답("토이북은 ~예요"). 숫자·기준은 구체적으로(3~12세, 5·8·12cm). 확인되지 않은 수치·과장은 쓰지 않음.
5. **구조화 데이터(JSON-LD)**: 화면에 보이는 내용과 같은 데이터로 생성(`src/seo.ts` 의 함수 사용). FAQ → `FAQPage`, 단계 안내 → `HowTo`, 회사·서비스 → `Organization`·`WebSite`. 화면에 없는 내용을 구조화 데이터에만 넣지 않음.
6. **이미지**: 의미 있는 이미지는 한국어 `alt`, 장식은 `alt=""`/`aria-hidden`. 큰 이미지는 WebP, `width`·`height` 지정, 첫 화면 아래는 `loading="lazy"`.
7. **링크**: 공개 페이지 사이는 실제 `<a href>`(react-router `Link`)로 연결. 버튼으로만 이동하지 않음.
8. **사이트맵·robots·llms.txt**: 빌드 때 자동 생성(`PAGE_META`·`PRIVATE_PREFIXES` 기준). 서비스 설명·현재 상태가 바뀌면 `src/seo.ts` 의 `llmsTxt()` 내용도 갱신.
9. **도메인**: 대표 주소는 `VITE_SITE_URL`(기본 wow3d-toybook.pages.dev). 정식 도메인이 생기면 이 값만 바꾸고 네이버 서치어드바이저·구글 서치 콘솔에 사이트맵 제출.

### 비공개 페이지(아이·부모·관리자 화면)
- `PAGE_META` 에 없는 경로는 자동으로 noindex. 새 비공개 경로는 `src/seo.ts` 의 `PRIVATE_PREFIXES`(robots.txt)와 `public/_headers` 의 `X-Robots-Tag` 목록에도 추가.

### 성능(Core Web Vitals)
- 첫 화면 큰 이미지·폰트는 가볍게(이미지 WebP·적정 크기, 폰트 자체 호스팅). 새 라이브러리는 꼭 필요할 때만.
- 배포 전 `npm run build` 로 미리 그리기까지 통과해야 함.

## 3. 작업 방식
- 화면은 랜딩부터 하나씩 고도화. 큰 기능은 단계별로 나눠 진행(예: 우리 집 책장 1→1.5→2→3단계).
- 운영(`wow3d-toybook.pages.dev`)은 로그인 연동 전까지 보기 전용: 쓰기 API 는 `ALLOW_DEMO_WRITES=true`(로컬)에서만.
- 커밋 전 `npm run typecheck`·`npm run build` 통과, 화면은 스크린샷으로 확인.
- 이 환경에서 bash heredoc·백틱이 자주 깨지므로 긴 파일은 Write 도구로 작성.
