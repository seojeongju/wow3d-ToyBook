// 빌드 후 실행: 공개 페이지를 완성된 HTML 로 미리 그리고 robots.txt · sitemap.xml · llms.txt 를 만든다.
// 검색엔진(네이버 Yeti, 구글)과 AI 수집 로봇(GPTBot, ClaudeBot, PerplexityBot 등)이 자바스크립트 없이도 내용을 읽게 하기 위함.
// 공개 페이지 목록·제목·설명은 src/seo.ts 의 PAGE_META 한 곳에서 관리.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = path.resolve('dist');
const SSR = path.resolve('dist-ssr');

const mod = await import(pathToFileURL(path.join(SSR, 'entry-server.js')).href);
const { render, PAGE_META, PUBLIC_ROUTES, PRIVATE_PREFIXES, SITE_URL, OG_IMAGE, BRAND, llmsTxt } = mod;

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
if (!template.includes('<!--seo-->') || !template.includes('<div id="root"></div>')) {
  throw new Error('index.html 에 <!--seo--> 표시 또는 빈 #root 가 없습니다');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function headFor(route) {
  const m = PAGE_META[route];
  const url = SITE_URL + route;
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="ko_KR" />`,
    `<meta property="og:site_name" content="${esc(BRAND)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(m.ogTitle ?? m.title)}" />`,
    `<meta property="og:description" content="${esc(m.ogDescription ?? m.description)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');
}

let pages = 0;
for (const route of PUBLIC_ROUTES) {
  const body = render(route);
  if (!body || body.length < 500) throw new Error(`${route} 미리 그리기 결과가 비어 있습니다`);
  const html = template
    .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, `<!--seo-->\n    ${headFor(route)}\n    <!--/seo-->`)
    .replace('<div id="root"></div>', `<div id="root" data-prerendered="${route}">${body}</div>`);
  // Cloudflare Pages 는 about.html 을 /about 으로 바로 내보냄 (about/index.html 이면 /about/ 로 308 이동이 생겨 대표 주소와 어긋남)
  const out = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.replace(/^\//, '') + '.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  pages++;
}

// robots.txt: 공개 페이지는 검색·AI 수집 모두 허용, 아이·부모·관리자 화면은 제외
const AI_BOTS = ['Yeti', 'Daumoa', 'Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended'];
const disallow = PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`).join('\n');
const robots = [
  `# ${BRAND} — 공개 소개 페이지는 검색·AI 수집을 허용하고, 아이·부모·관리자 화면은 제외합니다.`,
  ...AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /\n${disallow}\n`),
  `User-agent: *\nAllow: /\n${disallow}\n`,
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  '',
].join('\n');
fs.writeFileSync(path.join(DIST, 'robots.txt'), robots);

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
const urls = PUBLIC_ROUTES.map((r) => {
  const m = PAGE_META[r];
  return `  <url>\n    <loc>${SITE_URL}${r}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${m.changefreq ?? 'monthly'}</changefreq>\n    <priority>${(m.priority ?? 0.5).toFixed(1)}</priority>\n  </url>`;
}).join('\n');
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

// llms.txt (생성형 AI 용 사이트 요약)
fs.writeFileSync(path.join(DIST, 'llms.txt'), llmsTxt());

fs.rmSync(SSR, { recursive: true, force: true });
console.log(`미리 그리기 완료: 페이지 ${pages}개, robots.txt · sitemap.xml · llms.txt 생성 (${SITE_URL})`);
