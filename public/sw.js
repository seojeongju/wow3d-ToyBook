/*
 * 토이북 서비스 워커: 오프라인 보기 (PRD R-03)
 * - 앱 화면(HTML·JS·CSS)·폰트·이미지·읽어 주기 음성은 한 번 받으면 기기에 보관
 * - 책장·책 데이터는 인터넷이 되면 새로 받고, 끊기면 보관해 둔 것으로 보여 줌
 * - 배포마다 BUILD_ID 가 바뀌어(scripts/prerender.mjs) 이전 보관본은 정리됨
 */
const BUILD_ID = '__BUILD_ID__';
const SHELL = `toybook-shell-${BUILD_ID}`;
const RUNTIME = `toybook-runtime-${BUILD_ID}`;
const PRECACHE = ['/', '/fonts/jua-ui.woff2', '/icon.svg', '/logo-440.webp', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('toybook-') && k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** 인터넷 먼저, 실패하면 보관본 */
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(RUNTIME);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(request)) || (await caches.match(request));
    if (hit) return hit;
    if (fallbackUrl) {
      const shell = await caches.match(fallbackUrl);
      if (shell) return shell;
    }
    return new Response(JSON.stringify({ error: '인터넷이 끊겨서 불러오지 못했어요' }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
}

/** 보관본 먼저 (이름에 해시가 붙은 파일·이미지·음성) */
async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(RUNTIME)).put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;

  // 로그인·가입 주소는 서비스 워커가 손대지 않음 (다른 회사 로그인 화면으로 넘어갔다 돌아옴)
  if (p.startsWith('/api/auth/')) return;

  // 화면 이동: 인터넷 먼저, 끊기면 같은 화면 보관본 → 첫 화면 틀
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/'));
    return;
  }

  // 아이·책 데이터: 인터넷 먼저 (끊기면 마지막으로 본 내용)
  if (p === '/api/children' || p.startsWith('/api/books')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 책 속 그림 파일
  if (p.startsWith('/api/files/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 그 밖의 API(음성 생성·업로드 등)는 보관하지 않음
  if (p.startsWith('/api/')) return;

  // 빌드 파일·폰트·이미지·미리 만든 음성
  if (p.startsWith('/assets/') || p.startsWith('/fonts/') || p.startsWith('/audio/') || /\.(webp|jpg|png|svg|woff2|mp3)$/.test(p)) {
    event.respondWith(cacheFirst(request));
  }
});
