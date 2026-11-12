/**
 * 퍼블릭 도메인 고전 동화 → 토이북 도서관 큐레이션.
 * - 주 소스: childrenstory.org (짧은 동화/이솝 JSON·Markdown)
 * - 보조: Gutendex (Project Gutenberg 메타, 가용 시)
 * - 원문을 그대로 보여 주지 않고, 한국어 연령 맞춤 그림책으로 다시 쓴 뒤 market_listings(library)에 게시
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from './env';
import { newId } from './http';
import { ensureMarketSchema } from './market';
import { ART, BG, STORY_MODEL, storyMode } from './story';
import { checkChildSafeText } from './safety';

export type CatalogProvider = 'childrenstory' | 'gutendex';
export type CatalogStatus = 'discovered' | 'imported' | 'rewritten' | 'published' | 'rejected' | 'error';
export type AgeBand = '3-5' | '6-8' | '9-12';

export interface CatalogSourceRow {
  id: string;
  provider: CatalogProvider;
  external_id: string;
  title_original: string;
  authors_json: string;
  language: string;
  license: string;
  source_url: string | null;
  download_url: string | null;
  subjects_json: string;
  word_count: number | null;
  raw_excerpt: string | null;
  status: CatalogStatus;
  book_id: string | null;
  listing_id: string | null;
  category: string;
  age_band: AgeBand;
  title_ko: string | null;
  summary_ko: string | null;
  author_credit: string | null;
  cover_emoji: string;
  error_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogSearchHit {
  provider: CatalogProvider;
  externalId: string;
  title: string;
  authors: string[];
  sourceUrl: string;
  downloadUrl: string | null;
  subjects: string[];
  wordCount: number | null;
  language: string;
  license: string;
  categoryHint: string;
}

export interface WrittenCatalogBook {
  title: string;
  summary: string;
  cover_art: string;
  category: string;
  author_credit: string;
  pages: { text: string; art: string; bg: string }[];
}

const CURATOR_ID = 'market-curator';
const EXCERPT_MAX = 12_000;
const UA = 'ToyBookCatalogBot/1.0 (kids library curation; +https://wow3d-toybook.pages.dev)';

/** 파일럿용 안전한 짧은 이솝·동화 (잔인 장면이 적고 교훈이 분명한 편) */
export const PILOT_SLUGS: { slug: string; category: string; ageBand: AgeBand }[] = [
  { slug: 'the-lion-and-the-mouse', category: '전래·명작', ageBand: '3-5' },
  { slug: 'the-hare-and-the-tortoise', category: '전래·명작', ageBand: '3-5' },
  { slug: 'the-grasshopper-and-the-ants', category: '생활습관', ageBand: '6-8' },
  { slug: 'the-town-mouse-and-the-country-mouse', category: '감정', ageBand: '6-8' },
  { slug: 'the-fox-and-the-grapes', category: '감정', ageBand: '6-8' },
  { slug: 'the-north-wind-and-the-sun', category: '전래·명작', ageBand: '6-8' },
  { slug: 'the-shepherds-boy-and-the-wolf', category: '생활습관', ageBand: '6-8' },
  { slug: 'the-goose-that-laid-the-golden-eggs', category: '전래·명작', ageBand: '6-8' },
  { slug: 'the-crow-and-the-pitcher', category: '우주·과학', ageBand: '6-8' },
  { slug: 'the-dog-and-the-shadow', category: '감정', ageBand: '6-8' },
  { slug: 'the-travelling-musicians', category: '모험', ageBand: '6-8' },
  { slug: 'the-ant', category: '생활습관', ageBand: '3-5' },
];

let schemaReady = false;

export async function ensureCatalogSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS catalog_sources (
      id              TEXT PRIMARY KEY,
      provider        TEXT NOT NULL CHECK (provider IN ('childrenstory', 'gutendex')),
      external_id     TEXT NOT NULL,
      title_original  TEXT NOT NULL,
      authors_json    TEXT NOT NULL DEFAULT '[]',
      language        TEXT NOT NULL DEFAULT 'en',
      license         TEXT NOT NULL DEFAULT 'PD',
      source_url      TEXT,
      download_url    TEXT,
      subjects_json   TEXT NOT NULL DEFAULT '[]',
      word_count      INTEGER,
      raw_excerpt     TEXT,
      status          TEXT NOT NULL DEFAULT 'discovered'
                        CHECK (status IN ('discovered', 'imported', 'rewritten', 'published', 'rejected', 'error')),
      book_id         TEXT,
      listing_id      TEXT,
      category        TEXT NOT NULL DEFAULT '전래·명작',
      age_band        TEXT NOT NULL DEFAULT '6-8' CHECK (age_band IN ('3-5', '6-8', '9-12')),
      title_ko        TEXT,
      summary_ko      TEXT,
      author_credit   TEXT,
      cover_emoji     TEXT NOT NULL DEFAULT '📘',
      error_note      TEXT,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      UNIQUE (provider, external_id)
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_catalog_sources_status ON catalog_sources(status, updated_at DESC)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_catalog_sources_book ON catalog_sources(book_id)`),
    env.DB.prepare(
      `INSERT OR IGNORE INTO parents (id, display_name, email, status) VALUES ('market-curator', '토이북 동화도서관', null, 'active')`,
    ),
  ]);
  schemaReady = true;
}

function nowIso(): string {
  return new Date().toISOString();
}

function pageCountForBand(_band: AgeBand): number {
  return 8;
}

function guessCategory(subjects: string[], fallback = '전래·명작'): string {
  const hay = subjects.join(' ').toLowerCase();
  if (/bedtime|sleep|night|잠자리/.test(hay)) return '잠자리';
  if (/habit|manners|work|ant|양치|습관/.test(hay)) return '생활습관';
  if (/feel|friend|kind|heart|감정/.test(hay)) return '감정';
  if (/science|nature|crow|pitcher|우주|과학/.test(hay)) return '우주·과학';
  if (/adventure|travel|quest|모험/.test(hay)) return '모험';
  return fallback;
}

async function fetchText(url: string, maxChars = EXCERPT_MAX): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/plain, text/markdown, text/html;q=0.5, */*;q=0.1' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`원문을 받지 못했어요 (${res.status})`);
  const text = await res.text();
  return text.replace(/\r\n/g, '\n').slice(0, maxChars);
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/^#+\s+/gm, '')
    .replace(/^\*.*\*\s*$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ───────── childrenstory.org ───────── */

interface ChildrenStoryEntry {
  title: string;
  slug: string;
  category: string;
  source?: string;
  author?: string;
  words?: number;
  url: string;
  markdown: string;
}

interface ChildrenStoryCatalog {
  stories: ChildrenStoryEntry[];
}

let childrenCache: { at: number; data: ChildrenStoryCatalog } | null = null;

async function loadChildrenCatalog(): Promise<ChildrenStoryCatalog> {
  if (childrenCache && Date.now() - childrenCache.at < 6 * 3600_000) return childrenCache.data;
  const res = await fetch('https://childrenstory.org/api/stories.json', {
    headers: { 'user-agent': UA, accept: 'application/json' },
  });
  if (!res.ok) throw new Error('childrenstory 목록을 불러오지 못했어요');
  const data = (await res.json()) as ChildrenStoryCatalog;
  if (!Array.isArray(data.stories)) throw new Error('childrenstory 응답 형식이 달라요');
  childrenCache = { at: Date.now(), data };
  return data;
}

function mapChildrenHit(s: ChildrenStoryEntry): CatalogSearchHit {
  const subjects = [s.category, s.source].filter(Boolean) as string[];
  return {
    provider: 'childrenstory',
    externalId: s.slug,
    title: s.title,
    authors: s.author ? [s.author] : [],
    sourceUrl: s.url,
    downloadUrl: s.markdown,
    subjects,
    wordCount: s.words ?? null,
    language: 'en',
    license: 'PD',
    categoryHint: guessCategory(subjects, s.category === 'fables' ? '전래·명작' : '전래·명작'),
  };
}

export async function searchChildrenStory(opts: {
  q?: string;
  category?: string;
  maxWords?: number;
  limit?: number;
}): Promise<CatalogSearchHit[]> {
  const cat = await loadChildrenCatalog();
  const q = opts.q?.trim().toLowerCase();
  const limit = Math.min(opts.limit ?? 40, 80);
  const maxWords = opts.maxWords ?? 1800;
  const category = opts.category?.trim();

  return cat.stories
    .filter((s) => {
      if (category && s.category !== category) return false;
      if (typeof s.words === 'number' && s.words > maxWords) return false;
      if (!q) return true;
      const hay = `${s.title} ${s.author ?? ''} ${s.source ?? ''} ${s.slug}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, limit)
    .map(mapChildrenHit);
}

/* ───────── Gutendex (보조) ───────── */

interface GutendexBook {
  id: number;
  title: string;
  authors?: { name: string }[];
  subjects?: string[];
  bookshelves?: string[];
  languages?: string[];
  copyright?: boolean | null;
  formats?: Record<string, string>;
}

function pickGutendexTextUrl(formats: Record<string, string> | undefined): string | null {
  if (!formats) return null;
  const keys = Object.keys(formats);
  const prefer =
    keys.find((k) => k.startsWith('text/plain') && k.includes('utf-8')) ||
    keys.find((k) => k.startsWith('text/plain')) ||
    keys.find((k) => k.startsWith('text/html'));
  return prefer ? formats[prefer] : null;
}

export async function searchGutendex(opts: { q?: string; topic?: string; limit?: number }): Promise<CatalogSearchHit[]> {
  const params = new URLSearchParams();
  params.set('copyright', 'false');
  params.set('languages', 'en');
  if (opts.q?.trim()) params.set('search', opts.q.trim());
  params.set('topic', opts.topic?.trim() || 'children');
  const url = `https://gutendex.com/books?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Gutendex 검색 실패 (${res.status})`);
  const ctype = res.headers.get('content-type') ?? '';
  if (!ctype.includes('json')) throw new Error('Gutendex 가 JSON 대신 다른 응답을 보냈어요');
  const body = (await res.json()) as { results?: GutendexBook[] };
  const limit = Math.min(opts.limit ?? 30, 60);
  return (body.results ?? [])
    .filter((b) => b.copyright === false || b.copyright == null)
    .slice(0, limit)
    .map((b) => {
      const subjects = [...(b.subjects ?? []), ...(b.bookshelves ?? [])];
      return {
        provider: 'gutendex' as const,
        externalId: String(b.id),
        title: b.title,
        authors: (b.authors ?? []).map((a) => a.name),
        sourceUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
        downloadUrl: pickGutendexTextUrl(b.formats),
        subjects,
        wordCount: null,
        language: (b.languages ?? ['en'])[0] ?? 'en',
        license: 'PD',
        categoryHint: guessCategory(subjects),
      };
    });
}

export async function searchCatalog(
  provider: CatalogProvider | 'all',
  opts: { q?: string; category?: string; limit?: number },
): Promise<{ hits: CatalogSearchHit[]; warnings: string[] }> {
  const warnings: string[] = [];
  const hits: CatalogSearchHit[] = [];

  if (provider === 'childrenstory' || provider === 'all') {
    try {
      hits.push(...(await searchChildrenStory(opts)));
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : 'childrenstory 검색 실패');
    }
  }
  if (provider === 'gutendex' || provider === 'all') {
    try {
      hits.push(...(await searchGutendex({ q: opts.q, limit: opts.limit })));
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : 'Gutendex 검색 실패');
    }
  }
  return { hits, warnings };
}

/* ───────── DB helpers ───────── */

export async function listCatalogSources(
  env: Env,
  opts: { status?: string; limit?: number } = {},
): Promise<CatalogSourceRow[]> {
  await ensureCatalogSchema(env);
  const limit = Math.min(opts.limit ?? 80, 200);
  if (opts.status) {
    const { results } = await env.DB.prepare(
      `SELECT * FROM catalog_sources WHERE status = ? ORDER BY updated_at DESC LIMIT ?`,
    )
      .bind(opts.status, limit)
      .all<CatalogSourceRow>();
    return results;
  }
  const { results } = await env.DB.prepare(`SELECT * FROM catalog_sources ORDER BY updated_at DESC LIMIT ?`)
    .bind(limit)
    .all<CatalogSourceRow>();
  return results;
}

export async function getCatalogSource(env: Env, id: string): Promise<CatalogSourceRow | null> {
  await ensureCatalogSchema(env);
  return env.DB.prepare(`SELECT * FROM catalog_sources WHERE id = ?`).bind(id).first<CatalogSourceRow>();
}

async function upsertDiscovered(env: Env, hit: CatalogSearchHit, extras?: { category?: string; ageBand?: AgeBand }): Promise<CatalogSourceRow> {
  await ensureCatalogSchema(env);
  const existing = await env.DB.prepare(`SELECT * FROM catalog_sources WHERE provider = ? AND external_id = ?`)
    .bind(hit.provider, hit.externalId)
    .first<CatalogSourceRow>();
  if (existing) return existing;

  const id = newId();
  const authors = JSON.stringify(hit.authors);
  const subjects = JSON.stringify(hit.subjects);
  const category = extras?.category || hit.categoryHint || '전래·명작';
  const ageBand = extras?.ageBand || '6-8';
  const credit = hit.authors[0] ? `${hit.authors[0]} · 퍼블릭 도메인` : '퍼블릭 도메인 고전';
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO catalog_sources
     (id, provider, external_id, title_original, authors_json, language, license, source_url, download_url,
      subjects_json, word_count, status, category, age_band, author_credit, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discovered', ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      hit.provider,
      hit.externalId,
      hit.title.slice(0, 200),
      authors,
      hit.language,
      hit.license,
      hit.sourceUrl,
      hit.downloadUrl,
      subjects,
      hit.wordCount,
      category,
      ageBand,
      credit,
      now,
      now,
    )
    .run();
  return (await getCatalogSource(env, id))!;
}

export async function importSourceText(env: Env, sourceId: string): Promise<CatalogSourceRow> {
  const row = await getCatalogSource(env, sourceId);
  if (!row) throw new Error('인제스트 항목을 찾을 수 없어요');
  if (!row.download_url) throw new Error('원문 다운로드 주소가 없어요');

  try {
    const raw = await fetchText(row.download_url);
    const excerpt = row.provider === 'childrenstory' ? stripMarkdown(raw) : raw;
    if (excerpt.length < 80) throw new Error('원문이 너무 짧아요');
    const now = nowIso();
    await env.DB.prepare(
      `UPDATE catalog_sources SET raw_excerpt = ?, status = 'imported', error_note = NULL, updated_at = ? WHERE id = ?`,
    )
      .bind(excerpt.slice(0, EXCERPT_MAX), now, sourceId)
      .run();
    return (await getCatalogSource(env, sourceId))!;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '원문 가져오기 실패';
    await env.DB.prepare(`UPDATE catalog_sources SET status = 'error', error_note = ?, updated_at = ? WHERE id = ?`)
      .bind(msg.slice(0, 300), nowIso(), sourceId)
      .run();
    throw new Error(msg);
  }
}

/* ───────── 한국어 그림책 변환 ───────── */

const REWRITE_SYSTEM = `당신은 한국 어린이(3~12세)를 위한 그림책 작가예요.
퍼블릭 도메인 고전 동화·이솝 우화를 바탕으로, 토이북 도서관에 올릴 한국어 그림책으로 다시 써요.

반드시 지킬 것:
- 원문을 직역하지 말고, 어린이에게 맞게 다정하고 쉬운 한국어 동화체로 다시 써요 (~했어요, ~했답니다).
- 폭력·잔인·죽음·복수·무서운 장면을 넣지 않아요. 갈등은 작고 따뜻하게 풀려요.
- 원작 캐릭터·줄거리의 핵심만 살리고, 디즈니 등 특정 스튜디오 그림체·캐릭터는 흉내 내지 않아요.
- 광고·상표·외부 링크·개인정보는 넣지 않아요.
- 쪽마다 점토 그림책 장면에 맞는 짧은 글을 써요.
- author_credit 에는 원작자(번역자)와 "토이북 다시쓰기"를 함께 밝혀요.
- category 는 다음 중 하나: 모험, 생활습관, 우주·과학, 잠자리, 감정, 전래·명작`;

const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    cover_art: { type: 'string', enum: [...ART] },
    category: { type: 'string', enum: ['모험', '생활습관', '우주·과학', '잠자리', '감정', '전래·명작'] },
    author_credit: { type: 'string' },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          art: { type: 'string', enum: [...ART] },
          bg: { type: 'string', enum: [...BG] },
        },
        required: ['text', 'art', 'bg'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'summary', 'cover_art', 'category', 'author_credit', 'pages'],
  additionalProperties: false,
};

function modeRule(band: AgeBand): string {
  if (band === '3-5') return '한 쪽에 1~2문장, 40자 안팎. 아주 쉬운 낱말, 흉내 말.';
  if (band === '9-12') return '한 쪽에 3~4문장, 140자 안팎. 감정과 작은 배움을 담기.';
  return '한 쪽에 2~3문장, 80자 안팎. 쉬운 낱말, 대화 조금.';
}

function devRewrite(row: CatalogSourceRow): WrittenCatalogBook {
  const title = row.title_ko || `${row.title_original} (다시 쓴 이야기)`;
  const artPool = ['🐻', '🐰', '🌳', '⭐', '🌙', '✨', '🐣', '💜'] as const;
  const pages = Array.from({ length: pageCountForBand(row.age_band) }, (_, i) => ({
    text:
      i === 0
        ? `옛날 옛적, '${row.title_original}' 이야기가 작은 마을에 전해졌어요. 오늘은 그 이야기를 다정하게 다시 들려줄게요.`
        : i === pageCountForBand(row.age_band) - 1
          ? `이야기를 들은 친구들은 서로 도와 주는 마음이 소중하다는 걸 알게 되었답니다. 내일은 또 어떤 고전 동화가 찾아올까요?`
          : `이야기 속 친구들이 함께 힘을 모아 작은 문제를 풀어 나갔어요. (${i + 1}번째 장면)`,
    art: artPool[i % artPool.length],
    bg: BG[i % BG.length],
  }));
  return {
    title: title.slice(0, 40),
    summary: `퍼블릭 도메인 고전 '${row.title_original}'을 어린이 그림책으로 다시 쓴 시험용 이야기예요.`,
    cover_art: '📘',
    category: row.category || '전래·명작',
    author_credit: row.author_credit || '퍼블릭 도메인 · 토이북 다시쓰기',
    pages,
  };
}

async function claudeRewrite(env: Env, row: CatalogSourceRow): Promise<WrittenCatalogBook> {
  const pages = pageCountForBand(row.age_band);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 90_000 });
  const prompt = `아래 퍼블릭 도메인 원문을 바탕으로 한국어 그림책 ${pages}쪽을 만들어 주세요.
원제: ${row.title_original}
원작 표기: ${row.author_credit || '퍼블릭 도메인'}
나이대: ${row.age_band}
글쓰기 규칙: ${modeRule(row.age_band)}
희망 분류: ${row.category}

[원문 발췌]
${(row.raw_excerpt || '').slice(0, 8000)}`;

  const res = await client.beta.messages.create({
    model: STORY_MODEL,
    max_tokens: 12000,
    system: REWRITE_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: REWRITE_SCHEMA } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  if (res.stop_reason === 'refusal') throw new Error('이 원문은 어린이 그림책으로 바꾸기 어려워요');
  const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  const data = JSON.parse(text) as WrittenCatalogBook;
  const cleanedPages = (data.pages ?? [])
    .filter((p) => p.text?.trim())
    .slice(0, pages)
    .map((p, i) => ({
      text: p.text.trim().slice(0, 400),
      art: (ART as readonly string[]).includes(p.art) ? p.art : '📘',
      bg: (BG as readonly string[]).includes(p.bg) ? p.bg : BG[i % BG.length],
    }));
  if (cleanedPages.length < 4) throw new Error('그림책 쪽수가 부족해요');
  return {
    title: (data.title || row.title_original).slice(0, 40),
    summary: (data.summary || '').slice(0, 200),
    cover_art: (ART as readonly string[]).includes(data.cover_art) ? data.cover_art : '📘',
    category: data.category || row.category || '전래·명작',
    author_credit: (data.author_credit || `${row.author_credit || '퍼블릭 도메인'} · 토이북 다시쓰기`).slice(0, 80),
    pages: cleanedPages,
  };
}

export async function rewriteSource(env: Env, sourceId: string): Promise<{ source: CatalogSourceRow; book: WrittenCatalogBook }> {
  let row = await getCatalogSource(env, sourceId);
  if (!row) throw new Error('인제스트 항목을 찾을 수 없어요');
  if (!row.raw_excerpt) {
    row = await importSourceText(env, sourceId);
  }

  const mode = storyMode(env);
  if (mode === 'off') throw new Error('이야기 공방 AI 키가 없어 변환할 수 없어요');

  try {
    const book = mode === 'dev' ? devRewrite(row) : await claudeRewrite(env, row);
    const safe = checkChildSafeText(book.title, book.summary, book.author_credit, ...book.pages.map((p) => p.text));
    if (!safe.ok) throw new Error(safe.reason);

    const now = nowIso();
    await env.DB.prepare(
      `UPDATE catalog_sources
          SET title_ko = ?, summary_ko = ?, author_credit = ?, cover_emoji = ?, category = ?,
              status = 'rewritten', error_note = NULL, updated_at = ?
        WHERE id = ?`,
    )
      .bind(book.title, book.summary, book.author_credit, book.cover_art, book.category, now, sourceId)
      .run();

    // 변환 결과를 raw_excerpt 뒤에 JSON으로 잠시 보관하지 않고, publish 때 다시 쓰므로
    // rewritten 본문은 별도 컬럼 없이 publish 직전 재생성하거나, pages를 summary에 넣지 않음.
    // publish API가 rewrite 결과를 받거나 재실행하도록 — 여기서는 book을 반환하고,
    // 호출측이 publishCatalogBook에 넘기게 함. 재게시 편의를 위해 pages JSON을 error_note 금지.
    // → rewritten_json 컬럼이 없으므로 D1에 임시로 subjects_json 덮지 말고, book_id 없는 rewritten만 유지.
    // 운영 편의를 위해 raw_excerpt는 유지하고, publish 시 rewrite를 다시 하지 않도록
    // layout용으로 books draft를 바로 만들어 둔다.
    await ensureMarketSchema(env);
    const bookId = row.book_id || `cat-book-${sourceId.slice(0, 8)}-${newId().slice(0, 8)}`;
    const stmts: D1PreparedStatement[] = [
      env.DB.prepare(
        `INSERT INTO books (id, parent_id, child_id, title, format, cover_emoji, status, updated_at)
         VALUES (?, ?, NULL, ?, 'picture', ?, 'done', ?)
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, cover_emoji = excluded.cover_emoji, status = 'done', updated_at = excluded.updated_at`,
      ).bind(bookId, CURATOR_ID, book.title, book.cover_art, now),
      env.DB.prepare(`DELETE FROM book_pages WHERE book_id = ?`).bind(bookId),
    ];
    book.pages.forEach((p, idx) => {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO book_pages (id, book_id, page_no, text, layout_json) VALUES (?, ?, ?, ?, ?)`,
        ).bind(`${bookId}-p${idx + 1}`, bookId, idx + 1, p.text, JSON.stringify({ emoji: p.art, bg: p.bg, source: 'catalog' })),
      );
    });
    stmts.push(
      env.DB.prepare(`UPDATE catalog_sources SET book_id = ?, updated_at = ? WHERE id = ?`).bind(bookId, now, sourceId),
    );
    await env.DB.batch(stmts);

    return { source: (await getCatalogSource(env, sourceId))!, book };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '변환 실패';
    await env.DB.prepare(`UPDATE catalog_sources SET status = 'error', error_note = ?, updated_at = ? WHERE id = ?`)
      .bind(msg.slice(0, 300), nowIso(), sourceId)
      .run();
    throw new Error(msg);
  }
}

export async function publishSource(env: Env, sourceId: string): Promise<CatalogSourceRow> {
  await ensureMarketSchema(env);
  const row = await getCatalogSource(env, sourceId);
  if (!row) throw new Error('인제스트 항목을 찾을 수 없어요');
  if (!row.book_id || !row.title_ko) {
    await rewriteSource(env, sourceId);
  }
  const fresh = (await getCatalogSource(env, sourceId))!;
  if (!fresh.book_id) throw new Error('변환된 책이 없어요');

  const listingId = fresh.listing_id || `cat-list-${fresh.id.slice(0, 8)}`;
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO market_listings
       (id, book_id, seller_parent_id, author_name, kind, price, rent_days, summary, category, status, updated_at)
     VALUES (?, ?, ?, ?, 'library', 0, 7, ?, ?, 'published', ?)
     ON CONFLICT(book_id) DO UPDATE SET
       author_name = excluded.author_name,
       kind = 'library',
       price = 0,
       summary = excluded.summary,
       category = excluded.category,
       status = 'published',
       updated_at = excluded.updated_at`,
  )
    .bind(
      listingId,
      fresh.book_id,
      CURATOR_ID,
      fresh.author_credit || '퍼블릭 도메인 · 토이북 다시쓰기',
      fresh.summary_ko || '',
      fresh.category || '전래·명작',
      now,
    )
    .run();

  // ON CONFLICT(book_id) 시 id가 안 바뀔 수 있어 실제 listing id 조회
  const listing = await env.DB.prepare(`SELECT id FROM market_listings WHERE book_id = ?`)
    .bind(fresh.book_id)
    .first<{ id: string }>();

  await env.DB.prepare(
    `UPDATE catalog_sources SET listing_id = ?, status = 'published', error_note = NULL, updated_at = ? WHERE id = ?`,
  )
    .bind(listing?.id ?? listingId, now, sourceId)
    .run();

  return (await getCatalogSource(env, sourceId))!;
}

export async function rejectSource(env: Env, sourceId: string, note?: string): Promise<CatalogSourceRow> {
  const row = await getCatalogSource(env, sourceId);
  if (!row) throw new Error('인제스트 항목을 찾을 수 없어요');
  if (row.listing_id) {
    await env.DB.prepare(`UPDATE market_listings SET status = 'hidden', updated_at = ? WHERE id = ?`)
      .bind(nowIso(), row.listing_id)
      .run();
  }
  await env.DB.prepare(
    `UPDATE catalog_sources SET status = 'rejected', error_note = ?, updated_at = ? WHERE id = ?`,
  )
    .bind((note || '운영자 반려').slice(0, 300), nowIso(), sourceId)
    .run();
  return (await getCatalogSource(env, sourceId))!;
}

/** 검색 히트 1건을 큐에 넣고 원문까지 가져옴 */
export async function enqueueAndImport(
  env: Env,
  hit: CatalogSearchHit,
  extras?: { category?: string; ageBand?: AgeBand },
): Promise<CatalogSourceRow> {
  const row = await upsertDiscovered(env, hit, extras);
  if (row.status === 'published' || row.status === 'rewritten') return row;
  return importSourceText(env, row.id);
}

/** 파일럿 추천 목록을 childrenstory에서 일괄 큐잉 */
export async function enqueuePilotPack(env: Env): Promise<{ imported: CatalogSourceRow[]; skipped: string[]; warnings: string[] }> {
  const cat = await loadChildrenCatalog();
  const bySlug = new Map(cat.stories.map((s) => [s.slug, s]));
  const imported: CatalogSourceRow[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  for (const item of PILOT_SLUGS) {
    const story = bySlug.get(item.slug);
    if (!story) {
      skipped.push(item.slug);
      continue;
    }
    try {
      const hit = mapChildrenHit(story);
      const row = await enqueueAndImport(env, hit, { category: item.category, ageBand: item.ageBand });
      imported.push(row);
    } catch (e) {
      warnings.push(`${item.slug}: ${e instanceof Error ? e.message : '실패'}`);
    }
  }
  return { imported, skipped, warnings };
}

/** 자동 일괄 게시 대상 (error 는 수동 재시도만 — 무한 재시도 방지) */
const PENDING_STATUSES = ['discovered', 'imported', 'rewritten'] as const;

/** 아직 도서관에 안 올린 큐 항목 수 */
export async function countPendingPublish(env: Env): Promise<number> {
  await ensureCatalogSchema(env);
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM catalog_sources WHERE status IN ('discovered', 'imported', 'rewritten')`,
  ).first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

/**
 * 대기 중인 작품을 limit권씩 변환·도서관 게시.
 * Cloudflare 함수 시간 제한을 피하려고 한 요청에 소량만 처리하고, 프론트에서 반복 호출해요.
 */
export async function batchRewritePublish(
  env: Env,
  opts: { limit?: number } = {},
): Promise<{
  published: CatalogSourceRow[];
  failed: { id: string; title: string; error: string }[];
  remaining: number;
}> {
  await ensureCatalogSchema(env);
  const mode = storyMode(env);
  if (mode === 'off') throw new Error('이야기 공방 AI 키가 없어 변환할 수 없어요');

  // Claude는 호출당 시간이 커서 2권, 로컬 시험 모드는 12권까지
  const max = Math.min(Math.max(opts.limit ?? (mode === 'dev' ? 12 : 2), 1), mode === 'dev' ? 12 : 3);

  const { results: pending } = await env.DB.prepare(
    `SELECT id, title_original FROM catalog_sources
      WHERE status IN (${PENDING_STATUSES.map(() => '?').join(',')})
      ORDER BY
        CASE status
          WHEN 'rewritten' THEN 0
          WHEN 'imported' THEN 1
          WHEN 'discovered' THEN 2
          ELSE 3
        END,
        updated_at ASC
      LIMIT ?`,
  )
    .bind(...PENDING_STATUSES, max)
    .all<{ id: string; title_original: string }>();

  const published: CatalogSourceRow[] = [];
  const failed: { id: string; title: string; error: string }[] = [];

  for (const item of pending) {
    try {
      const row = await getCatalogSource(env, item.id);
      if (!row) continue;
      if (row.status !== 'rewritten' || !row.book_id || !row.title_ko) {
        await rewriteSource(env, item.id);
      }
      published.push(await publishSource(env, item.id));
    } catch (e) {
      failed.push({
        id: item.id,
        title: item.title_original,
        error: e instanceof Error ? e.message : '실패',
      });
    }
  }

  return { published, failed, remaining: await countPendingPublish(env) };
}

/** 추천 팩 가져오기 + 첫 배치 변환·게시 (나머지는 batch로 이어서) */
export async function startPilotPublish(env: Env): Promise<{
  imported: CatalogSourceRow[];
  skipped: string[];
  warnings: string[];
  batch: Awaited<ReturnType<typeof batchRewritePublish>>;
}> {
  const pack = await enqueuePilotPack(env);
  const batch = await batchRewritePublish(env);
  return { ...pack, batch };
}

export function presentCatalogSource(row: CatalogSourceRow) {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.external_id,
    titleOriginal: row.title_original,
    titleKo: row.title_ko,
    summaryKo: row.summary_ko,
    authors: JSON.parse(row.authors_json || '[]') as string[],
    subjects: JSON.parse(row.subjects_json || '[]') as string[],
    language: row.language,
    license: row.license,
    sourceUrl: row.source_url,
    wordCount: row.word_count,
    status: row.status,
    bookId: row.book_id,
    listingId: row.listing_id,
    category: row.category,
    ageBand: row.age_band,
    authorCredit: row.author_credit,
    coverEmoji: row.cover_emoji,
    errorNote: row.error_note,
    hasExcerpt: Boolean(row.raw_excerpt),
    excerptPreview: row.raw_excerpt ? row.raw_excerpt.slice(0, 280) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
