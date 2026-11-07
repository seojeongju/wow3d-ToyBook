import { useEffect } from 'react';

/**
 * SEO · AEO · GEO 정보의 단일 출처.
 * - PAGE_META 에 있는 경로 = 공개 페이지: 빌드 때 미리 그려(prerender) 검색·AI 로봇이 JS 없이 읽음, 사이트맵에 포함
 * - 그 밖의 경로 = 아이·부모·관리자 화면: noindex
 * 도메인을 바꾸면 VITE_SITE_URL 환경 변수만 바꾸면 됨 (예: https://toybook.co.kr)
 */
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://wow3d-toybook.pages.dev').replace(/\/$/, '');

export const BRAND = '와우쓰리디 토이북';
export const BRAND_EN = 'wow3d-Toybook';

export interface PageMeta {
  /** 브라우저 탭·검색 결과 제목 (60자 이내) */
  title: string;
  /** 검색 결과 설명 (80~160자) */
  description: string;
  /** 공유 미리보기 제목·설명 (없으면 title/description) */
  ogTitle?: string;
  ogDescription?: string;
  /** 사이트맵 우선순위·변경 주기 */
  priority?: number;
  changefreq?: 'daily' | 'weekly' | 'monthly';
}

/** 공개 페이지 목록 (여기에 추가하면 미리 그리기·사이트맵·llms.txt 에 자동 반영) */
export const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: '와우쓰리디 토이북 | 우리 아이 맞춤 AI 그림책과 3D 피규어',
    description:
      '우리 아이가 주인공인 그림책을 AI로 만들고, 책 속 캐릭터를 3D 피규어로 받아 보세요. 3~12세 어린이와 부모님을 위한 한국어 그림책 서비스, 토이북.',
    ogTitle: 'wow3d-Toybook · 세상에 단 한 권뿐인 우리 아이 책, 화면 밖 3D 장난감으로',
    ogDescription: 'AI 맞춤 동화책 제작부터 음성 읽어 주기, 캐릭터 3D 피규어 출력·배송까지 한 번에 연결한 온 가족 동화 공방.',
    priority: 1,
    changefreq: 'weekly',
  },
  '/about': {
    title: '토이북은 어떤 서비스인가요? | 와우쓰리디 토이북 소개',
    description:
      '토이북은 3D프린팅 회사 wow3d가 만든 3~12세 어린이 그림책 서비스예요. AI 맞춤 그림책, 읽어 주기, 3D 피규어까지 무엇을 할 수 있는지 소개해요.',
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/figure': {
    title: '그림책 캐릭터 3D 피규어 만들기 안내 | 와우쓰리디 토이북',
    description:
      '책 속 캐릭터가 5·8·12cm 3D 피규어가 되기까지. 3D 미리 보기, 출력 가능성 검사, wow3d 작업자 검수, 국내 출력·배송 과정과 아이 안전 안내를 정리했어요.',
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/safety': {
    title: '아이 안전·개인정보 보호 약속 | 와우쓰리디 토이북',
    description:
      '토이북은 아이 실명과 연락처를 받지 않고, 아이 사진을 AI 학습에 쓰지 않으며, 광고·채팅 없이 결제는 부모 잠금 뒤에 둬요. 어린이 안전 약속을 확인하세요.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/faq': {
    title: '자주 묻는 질문 | 와우쓰리디 토이북 어린이 그림책',
    description:
      '몇 살부터 쓸 수 있는지, 아이 사진은 안전한지, 피규어 크기와 주문, 사용 기기와 요금까지 토이북에 대해 부모님이 자주 묻는 질문에 답했어요.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/privacy': {
    title: '개인정보처리방침 | 와우쓰리디 토이북',
    description:
      '토이북이 처리하는 정보와 목적, 만 14세 미만 아동 개인정보 보호, 보관 기간과 파기, 처리 위탁과 국외 이전, 이용자 권리를 안내해요. 정식 출시 전 초안이에요.',
    priority: 0.3,
    changefreq: 'monthly',
  },
  '/terms': {
    title: '이용약관 | 와우쓰리디 토이북',
    description:
      '토이북 서비스 내용, 보호자 회원과 아동 이용, 만든 그림책과 캐릭터의 권리, 주문 제작 피규어의 청약철회 안내를 담은 이용약관이에요. 정식 출시 전 초안이에요.',
    priority: 0.3,
    changefreq: 'monthly',
  },
  '/licenses': {
    title: '오픈소스 라이선스 | 와우쓰리디 토이북',
    description:
      '토이북이 사용하는 React, React Router, 프리텐다드, 배민 주아체 등 오픈소스 소프트웨어와 글꼴의 저작권자와 라이선스(MIT, SIL Open Font License) 안내예요.',
    priority: 0.2,
    changefreq: 'monthly',
  },
};

export const PUBLIC_ROUTES = Object.keys(PAGE_META);

/** 검색에서 빼야 하는 화면 (아이 콘텐츠·개인 화면). robots.txt·_headers 와 맞춤 */
export const PRIVATE_PREFIXES = ['/profiles', '/shelf/', '/book/', '/parent', '/dashboard', '/admin', '/login', '/signup', '/api/'];

/** 공유 미리보기 이미지 1200×630 (scripts/optimize-images.mjs 로 생성) */
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

/* ───────── 화면별 제목·설명 적용 (브라우저에서만) ───────── */

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/** 경로에 맞는 제목·설명·대표 주소·검색 허용 여부를 문서 머리에 적용 */
export function useSeo(pathname: string) {
  useEffect(() => {
    const meta = PAGE_META[pathname];
    if (meta) {
      document.title = meta.title;
      setMeta('name', 'description', meta.description);
      setMeta('name', 'robots', 'index, follow, max-image-preview:large');
      setMeta('property', 'og:title', meta.ogTitle ?? meta.title);
      setMeta('property', 'og:description', meta.ogDescription ?? meta.description);
      setMeta('property', 'og:url', SITE_URL + pathname);
      setCanonical(SITE_URL + pathname);
    } else {
      // 아이·부모·관리자 화면은 검색·AI 수집에서 제외
      document.title = BRAND;
      setMeta('name', 'robots', 'noindex, nofollow');
    }
  }, [pathname]);
}

/* ───────── 구조화 데이터 (JSON-LD) ─────────
   화면에 보이는 내용과 같은 데이터로 만들 것 (화면에 없는 내용을 넣지 않음) */

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: BRAND,
    alternateName: [BRAND_EN, '토이북', 'wow3d'],
    url: SITE_URL,
    logo: OG_IMAGE,
    description: '3D프린팅 회사 wow3d가 운영하는 어린이 맞춤 AI 그림책·캐릭터 피규어 서비스',
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: BRAND,
    alternateName: BRAND_EN,
    url: SITE_URL,
    inLanguage: 'ko-KR',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export function webAppLd(description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: BRAND,
    url: SITE_URL,
    applicationCategory: 'EducationalApplication',
    operatingSystem: '웹 브라우저 (PC·태블릿·스마트폰)',
    inLanguage: 'ko-KR',
    description,
    audience: { '@type': 'PeopleAudience', suggestedMinAge: 3, suggestedMaxAge: 12 },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export function webPageLd(path: string, name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}${path}#webpage`,
    url: SITE_URL + path,
    name,
    description,
    inLanguage: 'ko-KR',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE_URL + it.path })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function howToLd(name: string, steps: { title: string; body: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    inLanguage: 'ko-KR',
    step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body })),
  };
}

/* ───────── llms.txt (생성형 AI 가 읽는 사이트 요약, GEO) ───────── */

export function llmsTxt(): string {
  const pages = PUBLIC_ROUTES.map((p) => `- [${PAGE_META[p].title}](${SITE_URL}${p}): ${PAGE_META[p].description}`).join('\n');
  return `# ${BRAND} (${BRAND_EN})

> 3D프린팅 회사 wow3d가 운영하는 한국 어린이(3~12세)와 부모님을 위한 서비스입니다. 아이가 주인공인 그림책을 AI로 만들어 읽고, 책 속 캐릭터를 3D 피규어로 받아 볼 수 있어요.

## 핵심 정보
- 대상: 3~12세 어린이와 부모님 (나이에 따라 새싹 3~5세, 꼬마 작가 6~8세, 작가 9~12세 화면)
- 그림책: 8·12·16쪽, 아이 이름·좋아하는 것·생활 주제(양치하기, 정리정돈 등)를 반영
- 동화 극장: 한 쪽씩 넘기며 읽고 한국어로 읽어 주기
- 피규어: 5·8·12cm, wow3d 작업자가 검수 후 국내에서 출력·배송
- 안전: 아이 실명·연락처를 받지 않음, 아이 사진·그림은 가족만 보고 AI 학습에 쓰지 않음, 광고·채팅 없음, 결제는 부모 잠금 뒤
- 현재 상태: 미리 보기 단계. 데모 그림책 읽기와 읽어 주기를 제공하고, 부모님 회원가입은 카카오·네이버·구글 간편 가입으로 준비 중이며, 책 만들기·3D 미리 보기·피규어 주문은 차례로 열릴 예정

## 공개 페이지
${pages}
`;
}
