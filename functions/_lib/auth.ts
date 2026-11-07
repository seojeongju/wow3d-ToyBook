import type { Env } from './env';

/**
 * 간편 로그인(카카오·네이버·구글) + 세션.
 * - 서버에서 인가 코드를 토큰으로 바꾸고(비밀 키는 서버에만), 회원 번호·별명·이메일만 받아 둠
 * - 세션: 쿠키에는 무작위 토큰, DB(sessions)에는 그 SHA-256 값만
 * - dev: 로컬 시험용 가짜 로그인. ALLOW_DEV_LOGIN=true(.dev.vars)일 때만 열림, 운영에는 넣지 말 것
 */
export type Provider = 'kakao' | 'naver' | 'google' | 'dev';
export const PROVIDERS: Provider[] = ['kakao', 'naver', 'google', 'dev'];

export interface Profile {
  id: string;
  nickname: string | null;
  email: string | null;
  /** 출생 연도 (회사가 주고 사용자가 동의한 경우만). 나이 확인에만 쓰고 저장하지 않음 */
  birthYear?: number | null;
  /** 연령대의 끝 나이 (카카오 "10~14" → 14, 네이버 "10-19" → 19). 나이 확인에만 씀 */
  ageMax?: number | null;
}

/** "20~29" · "20-29" · "1~9" → 끝 나이 */
function rangeMax(v: string | undefined): number | null {
  const m = v?.match(/(\d+)\s*[~-]\s*(\d+)/);
  return m ? Number(m[2]) : null;
}

function yearOf(v: string | undefined): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 1900 ? n : null;
}

/**
 * 만 14세 미만일 수 있는지 (가입은 만 14세 이상 보호자만).
 * 출생 연도로 올해 나이가 14 이하면 생일 전에는 13세일 수 있으므로 막음. 연령대는 끝 나이가 14 이하일 때만 막음.
 * 둘 다 없으면(구글, 동의 안 함) 판단하지 않고 가입 화면의 "만 14세 이상" 확인으로 받음
 */
export function ageCheck(p: Profile, now = new Date()): 'under14' | 'ok' | 'unknown' {
  if (p.birthYear) return now.getFullYear() - p.birthYear <= 14 ? 'under14' : 'ok';
  if (p.ageMax != null) return p.ageMax <= 14 ? 'under14' : p.ageMax >= 20 ? 'ok' : 'unknown';
  return 'unknown';
}

interface ProviderConfig {
  clientId: (env: Env) => string | undefined;
  clientSecret: (env: Env) => string | undefined;
  /** 비밀 키 없이도 되는지 (카카오는 앱 설정에 따라 선택) */
  secretOptional?: boolean;
  authorizeUrl: (p: { clientId: string; redirectUri: string; state: string }) => string;
  exchange: (p: { clientId: string; clientSecret?: string; redirectUri: string; code: string; state: string }) => Promise<string>;
  profile: (accessToken: string) => Promise<Profile>;
}

const qs = (o: Record<string, string | undefined>) =>
  new URLSearchParams(Object.entries(o).filter((e): e is [string, string] => Boolean(e[1]))).toString();

async function tokenFrom(res: Response, who: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!res.ok || !body?.access_token) throw new Error(`${who} 토큰 발급 실패 (${res.status})`);
  return body.access_token;
}

async function getJson<T>(url: string, accessToken: string, who: string): Promise<T> {
  const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`${who} 회원 정보 조회 실패 (${res.status})`);
  return res.json() as Promise<T>;
}

const CONFIG: Record<Exclude<Provider, 'dev'>, ProviderConfig> = {
  kakao: {
    clientId: (env) => env.KAKAO_REST_API_KEY,
    clientSecret: (env) => env.KAKAO_CLIENT_SECRET,
    secretOptional: true,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      `https://kauth.kakao.com/oauth/authorize?${qs({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', state })}`,
    exchange: async ({ clientId, clientSecret, redirectUri, code }) =>
      tokenFrom(
        await fetch('https://kauth.kakao.com/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
          body: qs({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }),
        }),
        '카카오',
      ),
    profile: async (token) => {
      const me = await getJson<{
        id: number;
        kakao_account?: { email?: string; is_email_verified?: boolean; profile?: { nickname?: string }; birthyear?: string; age_range?: string };
      }>('https://kapi.kakao.com/v2/user/me', token, '카카오');
      const acc = me.kakao_account;
      return {
        id: String(me.id),
        nickname: acc?.profile?.nickname ?? null,
        email: acc?.is_email_verified ? (acc.email ?? null) : null,
        birthYear: yearOf(acc?.birthyear),
        ageMax: rangeMax(acc?.age_range),
      };
    },
  },
  naver: {
    clientId: (env) => env.NAVER_CLIENT_ID,
    clientSecret: (env) => env.NAVER_CLIENT_SECRET,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      `https://nid.naver.com/oauth2.0/authorize?${qs({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state })}`,
    exchange: async ({ clientId, clientSecret, code, state }) =>
      tokenFrom(
        await fetch('https://nid.naver.com/oauth2.0/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
          body: qs({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, code, state }),
        }),
        '네이버',
      ),
    profile: async (token) => {
      const me = await getJson<{ response?: { id?: string; nickname?: string; name?: string; email?: string; birthyear?: string; age?: string } }>(
        'https://openapi.naver.com/v1/nid/me',
        token,
        '네이버',
      );
      const r = me.response;
      if (!r?.id) throw new Error('네이버 회원 번호가 없어요');
      return { id: r.id, nickname: r.nickname ?? r.name ?? null, email: r.email ?? null, birthYear: yearOf(r.birthyear), ageMax: rangeMax(r.age) };
    },
  },
  google: {
    clientId: (env) => env.GOOGLE_CLIENT_ID,
    clientSecret: (env) => env.GOOGLE_CLIENT_SECRET,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      `https://accounts.google.com/o/oauth2/v2/auth?${qs({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
      })}`,
    exchange: async ({ clientId, clientSecret, redirectUri, code }) =>
      tokenFrom(
        await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: qs({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }),
        }),
        '구글',
      ),
    profile: async (token) => {
      const me = await getJson<{ sub: string; name?: string; email?: string; email_verified?: boolean }>(
        'https://openidconnect.googleapis.com/v1/userinfo',
        token,
        '구글',
      );
      return { id: me.sub, nickname: me.name ?? null, email: me.email_verified ? (me.email ?? null) : null };
    },
  },
};

export function isProvider(v: string): v is Provider {
  return (PROVIDERS as string[]).includes(v);
}

/** 이 서버에서 쓸 수 있는 로그인 수단 (키가 등록된 것만) */
export function enabledProviders(env: Env): Provider[] {
  return PROVIDERS.filter((p) => {
    if (p === 'dev') return env.ALLOW_DEV_LOGIN === 'true';
    const c = CONFIG[p];
    return Boolean(c.clientId(env) && (c.secretOptional || c.clientSecret(env)));
  });
}

export function redirectUri(request: Request, provider: Provider): string {
  return `${new URL(request.url).origin}/api/auth/${provider}/callback`;
}

export function authorizeUrl(env: Env, request: Request, provider: Provider, state: string): string {
  // 시험용: /api/auth/dev/start?as=이름 으로 다른 사람인 척
  if (provider === 'dev') return `${redirectUri(request, provider)}?${qs({
      code: 'dev',
      state,
      as: new URL(request.url).searchParams.get('as') ?? undefined,
      born: new URL(request.url).searchParams.get('born') ?? undefined,
    })}`;
  const c = CONFIG[provider];
  return c.authorizeUrl({ clientId: c.clientId(env)!, redirectUri: redirectUri(request, provider), state });
}

/** 인가 코드 → 회원 정보 */
export async function fetchProfile(env: Env, request: Request, provider: Provider, code: string, state: string): Promise<Profile> {
  if (provider === 'dev') {
    // 로컬 시험: ?as=이름 으로 다른 사람인 척 (기본은 '시험 부모')
    const as = new URL(request.url).searchParams.get('as') ?? 'tester';
    // ?born=2015 처럼 출생 연도를 붙이면 나이 확인도 시험할 수 있음
    const born = new URL(request.url).searchParams.get('born');
    return { id: `dev-${as}`, nickname: as === 'tester' ? '시험 부모' : as, email: null, birthYear: born ? yearOf(born) : null };
  }
  const c = CONFIG[provider];
  const token = await c.exchange({ clientId: c.clientId(env)!, clientSecret: c.clientSecret(env), redirectUri: redirectUri(request, provider), code, state });
  return c.profile(token);
}

/* ───────── 쿠키 ───────── */

export const SESSION_COOKIE = 'tb_session';
export const OAUTH_COOKIE = 'tb_oauth';
const SESSION_DAYS = 30;

export function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function cookie(request: Request, name: string, value: string, maxAge: number, path = '/'): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export function randomToken(bytes = 32): string {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 로그인 후 돌아갈 주소는 우리 사이트 안 경로만 */
export function safeNext(next: string | null | undefined): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/api/') ? next : null;
}

/* ───────── 세션 ───────── */

export async function createSession(env: Env, request: Request, parentId: string): Promise<string> {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (id_hash, parent_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), parentId, expires).run();
  return cookie(request, SESSION_COOKIE, token, SESSION_DAYS * 86400);
}

export interface SessionParent {
  id: string;
  display_name: string;
  email: string | null;
  status: 'pending' | 'active';
  marketing_agreed_at: string | null;
  /** 부모 PIN 을 만들었는지 (1/0) */
  has_pin: number;
  /** 이 세션에서 부모 모드가 열려 있는 마지막 시각 */
  unlocked_until: string | null;
  /** 세션 토큰의 해시 (부모 모드 열기·닫기용) */
  session_hash: string;
  /** 만 14세 이상 확인 방법 (provider·self) */
  age_check: string | null;
  /** 약관 동의 시각 (본인인증 단계 전에 동의를 마쳤는지) */
  terms_agreed_at: string | null;
  /** 보호자 본인인증 시각 */
  guardian_verified_at: string | null;
}

/** 쿠키의 세션 → 부모 계정 (없거나 만료면 null) */
export async function sessionParent(request: Request, env: Env): Promise<SessionParent | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return env.DB.prepare(
    `SELECT p.id, p.display_name, p.email, p.status, p.marketing_agreed_at,
            (p.pin_hash IS NOT NULL) AS has_pin, s.unlocked_until, s.id_hash AS session_hash,
            p.age_check, p.terms_agreed_at, p.guardian_verified_at
       FROM sessions s JOIN parents p ON p.id = s.parent_id
      WHERE s.id_hash = ? AND s.expires_at > ?`,
  )
    .bind(await sha256(token), new Date().toISOString())
    .first<SessionParent>();
}

export async function deleteSession(request: Request, env: Env): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256(token)).run();
}

export function clearSessionCookie(request: Request): string {
  return cookie(request, SESSION_COOKIE, '', 0);
}
