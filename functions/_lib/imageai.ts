import type { Env } from './env';

/**
 * 그림(삽화) AI 공급사 묶음 — 운영자 화면(/admin/ai)에서 고른 순서대로 그림을 그리고, 실패하면 다음 공급사로.
 * 공급사마다 요청 모양이 달라서 연결 모듈(아래 ADAPTERS)을 코드에 두고, 키·모델·순서·켜기는 DB(ai_providers)에서 정함.
 * 키는 AI_KEYS_SECRET 으로 암호화해 저장 (없으면 Cloudflare 환경 변수 키를 씀)
 */
export type ImageKind = 'gemini' | 'openai' | 'fal';

export interface KindInfo {
  name: string;
  defaultModel: string;
  envKey: keyof Env;
  note: string;
}

export const KINDS: Record<ImageKind, KindInfo> = {
  gemini: {
    name: 'Google Gemini 이미지',
    defaultModel: 'gemini-2.5-flash-image',
    envKey: 'GEMINI_API_KEY',
    note: '참고 그림으로 캐릭터·화풍 유지가 강함. Google AI Studio 에서 키 발급',
  },
  openai: {
    name: 'OpenAI GPT Image',
    defaultModel: 'gpt-image-1',
    envKey: 'OPENAI_API_KEY',
    note: '읽어 주기 음성에 쓰는 OpenAI 키를 함께 쓸 수 있음',
  },
  fal: {
    name: 'FLUX (fal.ai)',
    defaultModel: 'fal-ai/flux-pro/v1.1',
    envKey: 'FAL_KEY',
    note: '값이 싼 편. fal.ai 대시보드에서 키 발급',
  },
};

export function isKind(v: unknown): v is ImageKind {
  return v === 'gemini' || v === 'openai' || v === 'fal';
}

/* ───────── 키 암호화 (AES-GCM, 키는 AI_KEYS_SECRET 에서 만듦) ───────── */

async function aesKey(env: Env): Promise<CryptoKey | null> {
  if (!env.AI_KEYS_SECRET || env.AI_KEYS_SECRET.length < 16) return null;
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`toybook-ai-keys:${env.AI_KEYS_SECRET}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function canEncrypt(env: Env): Promise<boolean> {
  return (await aesKey(env)) !== null;
}

export async function encryptKey(env: Env, plain: string): Promise<string | null> {
  const key = await aesKey(env);
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)));
  return `v1:${b64(iv)}:${b64(enc)}`;
}

async function decryptKey(env: Env, cipher: string): Promise<string | null> {
  const key = await aesKey(env);
  const [v, iv, data] = cipher.split(':');
  if (!key || v !== 'v1' || !iv || !data) return null;
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(data)));
  } catch {
    return null;
  }
}

export interface ProviderRow {
  id: string;
  kind: ImageKind;
  label: string;
  model: string;
  key_cipher: string | null;
  key_hint: string | null;
  enabled: number;
  priority: number;
  cost_per_image: number | null;
  last_test_at: string | null;
  last_test_ok: number | null;
  last_test_ms: number | null;
  last_test_note: string | null;
}

/** 실제로 쓸 키: 저장한 키(복호화) → 없으면 환경 변수 키 */
export async function resolveKey(env: Env, p: ProviderRow): Promise<{ key: string | null; source: 'saved' | 'env' | 'none' }> {
  if (p.key_cipher) {
    const key = await decryptKey(env, p.key_cipher);
    return key ? { key, source: 'saved' } : { key: null, source: 'none' };
  }
  const envKey = env[KINDS[p.kind].envKey] as string | undefined;
  return envKey ? { key: envKey, source: 'env' } : { key: null, source: 'none' };
}

/* ───────── 공급사별 연결 모듈 ───────── */

export interface ImageRequest {
  prompt: string;
  /** 참고 그림 (캐릭터·화풍 유지용, 지원하는 공급사만) */
  refs?: { mime: string; data: Uint8Array }[];
}

export interface ImageResult {
  mime: string;
  data: Uint8Array;
}

async function fail(res: Response, who: string): Promise<never> {
  const text = (await res.text().catch(() => '')).slice(0, 300);
  throw new Error(`${who} ${res.status}: ${text}`);
}

const ADAPTERS: Record<ImageKind, (key: string, model: string, req: ImageRequest) => Promise<ImageResult>> = {
  async gemini(key, model, req) {
    const parts: unknown[] = [{ text: req.prompt }];
    for (const r of req.refs ?? []) parts.push({ inline_data: { mime_type: r.mime, data: b64(r.data) } });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } }),
    });
    if (!res.ok) await fail(res, 'Gemini');
    const body = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[] };
    const img = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!img) throw new Error('Gemini: 그림이 오지 않았어요 (안전 필터에 걸렸을 수 있어요)');
    return { mime: img.mimeType, data: unb64(img.data) };
  },

  async openai(key, model, req) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt: req.prompt, size: '1536x1024', n: 1 }),
    });
    if (!res.ok) await fail(res, 'OpenAI');
    const body = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
    const first = body.data?.[0];
    if (first?.b64_json) return { mime: 'image/png', data: unb64(first.b64_json) };
    if (first?.url) {
      const img = await fetch(first.url);
      return { mime: img.headers.get('content-type') ?? 'image/png', data: new Uint8Array(await img.arrayBuffer()) };
    }
    throw new Error('OpenAI: 그림이 오지 않았어요');
  },

  async fal(key, model, req) {
    const res = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Key ${key}` },
      body: JSON.stringify({ prompt: req.prompt, image_size: 'landscape_4_3', num_images: 1, enable_safety_checker: true }),
    });
    if (!res.ok) await fail(res, 'fal');
    const body = (await res.json()) as { images?: { url: string; content_type?: string }[] };
    const url = body.images?.[0]?.url;
    if (!url) throw new Error('fal: 그림이 오지 않았어요');
    const img = await fetch(url);
    return { mime: img.headers.get('content-type') ?? 'image/jpeg', data: new Uint8Array(await img.arrayBuffer()) };
  },
};

/** 한 공급사로 그리기 + 사용 기록 */
export async function drawWith(env: Env, p: ProviderRow, req: ImageRequest): Promise<{ ok: true; image: ImageResult; ms: number } | { ok: false; error: string; ms: number }> {
  const started = Date.now();
  const { key } = await resolveKey(env, p);
  if (!key) return { ok: false, error: '쓸 수 있는 API 키가 없어요', ms: 0 };
  try {
    const image = await ADAPTERS[p.kind](key, p.model, req);
    const ms = Date.now() - started;
    await env.DB.prepare('INSERT INTO ai_usage (provider_id, purpose, ok, ms, cost) VALUES (?, ?, 1, ?, ?)').bind(p.id, 'image', ms, p.cost_per_image).run();
    return { ok: true, image, ms };
  } catch (e) {
    const ms = Date.now() - started;
    const error = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    await env.DB.prepare('INSERT INTO ai_usage (provider_id, purpose, ok, ms, note) VALUES (?, ?, 0, ?, ?)').bind(p.id, 'image', ms, error).run();
    return { ok: false, error, ms };
  }
}

/** 켜진 공급사를 순서대로 시도 (이야기 공방 삽화에서 사용) */
export async function drawImage(env: Env, req: ImageRequest): Promise<{ ok: true; image: ImageResult; providerId: string } | { ok: false; error: string }> {
  const { results } = await env.DB.prepare("SELECT * FROM ai_providers WHERE purpose = 'image' AND enabled = 1 ORDER BY priority, created_at").all<ProviderRow>();
  if (!results.length) return { ok: false, error: '켜진 그림 AI 가 없어요' };
  let last = '';
  for (const p of results) {
    const r = await drawWith(env, p, req);
    if (r.ok) return { ok: true, image: r.image, providerId: p.id };
    last = r.error;
  }
  return { ok: false, error: last };
}

/** 연결 시험용 그림 주문 (점토 스타일 확인용, 아이 정보 없음) */
export const TEST_PROMPT =
  'A cute claymation-style 3D clay figure of a small smiling bear reading a picture book, soft pastel lavender background, gentle studio lighting, plasticine texture, child-friendly, no text, no letters.';
