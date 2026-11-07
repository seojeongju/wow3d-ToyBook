import { useEffect, useState } from 'react';

/** 간편 로그인 수단 (functions/_lib/auth.ts 와 같은 이름) */
export type Provider = 'kakao' | 'naver' | 'google' | 'dev';

export interface Me {
  name: string;
  email: string | null;
  /** pending = 간편 로그인만 하고 약관 동의 전 */
  status: 'pending' | 'active';
  marketing: boolean;
  providers: Provider[];
  /** 부모 PIN 을 만들었는지 */
  hasPin: boolean;
  /** 부모 기능을 지금 쓸 수 있는지 (PIN 이 없거나 이 세션에서 PIN 을 맞힘, 30분) */
  unlocked: boolean;
}

export interface AuthState {
  loading: boolean;
  user: Me | null;
  /** 이 서버에 키가 등록된 로그인 수단 */
  available: Provider[];
}

export async function fetchMe(): Promise<Omit<AuthState, 'loading'>> {
  const res = await fetch('/api/auth/me', { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
  return res.json();
}

/** 로그인 상태 (화면이 그려진 뒤 불러옴 — 미리 그리는 공개 페이지에서도 안전) */
export function useMe(): AuthState & { reload: () => void } {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, available: [] });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((r) => alive && setState({ loading: false, ...r }))
      .catch(() => alive && setState({ loading: false, user: null, available: [] }));
    return () => {
      alive = false;
    };
  }, [n]);
  return { ...state, reload: () => setN((v) => v + 1) };
}

/** 간편 로그인 시작 주소 (페이지 전체가 이동해야 하므로 <a href> 로 씀) */
export function loginUrl(provider: Provider, next?: string | null): string {
  return `/api/auth/${provider}/start${next ? `?next=${encodeURIComponent(next)}` : ''}`;
}

/** 이 기기에 보관한 아이·책 데이터를 지움 (한 기기를 여러 가족이 쓸 때 다른 계정 내용이 남지 않게) */
async function clearPrivateCache() {
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        if (new URL(req.url).pathname.startsWith('/api/')) await cache.delete(req);
      }
    }
  } catch {
    /* 보관함을 못 쓰는 브라우저 */
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
  await clearPrivateCache();
}

export async function completeSignup(consent: { age14: boolean; terms: boolean; privacy: boolean; guardian: boolean; marketing: boolean }) {
  const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(consent) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? '가입을 마치지 못했어요');
  await clearPrivateCache();
}

export async function cancelSignup() {
  await fetch('/api/auth/signup', { method: 'DELETE' }).catch(() => null);
  await clearPrivateCache();
}

export const PROVIDER_NAME: Record<Provider, string> = { kakao: '카카오', naver: '네이버', google: '구글', dev: '시험용' };

/* ───────── 부모 모드·내 정보 (회원가입 2단계) ───────── */

/** 서버 응답 오류. status 423 = 부모 PIN 을 다시 넣어야 함 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function send<T = { ok: true }>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? `요청 실패 (${res.status})`, res.status);
  return data as T;
}

export const unlockWithPin = (pin: string) => send('/api/parent/unlock', 'POST', { pin });
export const lockParentMode = () => send('/api/parent/lock', 'POST').catch(() => null);
export const savePin = (pin: string) => send('/api/parent/pin', 'POST', { pin });
export const removePin = () => send('/api/parent/pin', 'DELETE');
export const updateAccount = (patch: { name?: string; marketing?: boolean }) => send('/api/account', 'PATCH', patch);

export async function withdraw(confirm: string) {
  await send('/api/account', 'DELETE', { confirm });
  await clearPrivateCache();
}
