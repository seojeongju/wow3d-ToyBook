import type { Env } from './env';
import { error } from './http';
import { sessionParent, type SessionParent } from './auth';

/**
 * 부모 기능(아이 프로필 고치기·내 정보·탈퇴) 공통 확인.
 * - 가입을 마친 로그인 계정이어야 함 (데모 계정으로는 못 씀)
 * - 부모 PIN 을 만들었다면 이 세션에서 PIN 을 맞혀 부모 모드가 열려 있어야 함 (30분)
 */
export const UNLOCK_MINUTES = 30;
const PIN_TRIES = 5;
const PIN_LOCK_MINUTES = 10;

export async function requireActive(request: Request, env: Env): Promise<SessionParent | Response> {
  const me = await sessionParent(request, env);
  if (!me) return error('로그인이 필요해요', 401);
  if (me.status !== 'active') return error('가입을 마저 끝내 주세요', 403);
  return me;
}

export function isUnlocked(me: SessionParent): boolean {
  return !me.has_pin || Boolean(me.unlocked_until && me.unlocked_until > new Date().toISOString());
}

export async function requireParentMode(request: Request, env: Env): Promise<SessionParent | Response> {
  const me = await requireActive(request, env);
  if (me instanceof Response) return me;
  if (!isUnlocked(me)) return error('부모 PIN 을 다시 입력해 주세요', 423);
  return me;
}

/* ───────── PIN (4자리 숫자) ───────── */

const ITER = 100000;

function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function derive(pin: string, salt: Uint8Array, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  return b64(new Uint8Array(bits));
}

export function validPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${b64(salt)}$${await derive(pin, salt, ITER)}`;
}

async function matches(pin: string, stored: string): Promise<boolean> {
  const [kind, iter, salt, hash] = stored.split('$');
  if (kind !== 'pbkdf2') return false;
  const got = await derive(pin, Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)), Number(iter));
  // 길이가 같은 문자열 비교 (시간 차이로 맞히기 어렵게)
  let diff = got.length ^ hash.length;
  for (let i = 0; i < Math.min(got.length, hash.length); i++) diff |= got.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

/** PIN 확인 + 틀린 횟수 제한 (5번 틀리면 10분 잠금). 맞으면 이 세션의 부모 모드를 엶 */
export async function checkPin(env: Env, me: SessionParent, pin: string): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const row = await env.DB.prepare('SELECT pin_hash, pin_failed, pin_locked_until FROM parents WHERE id = ?')
    .bind(me.id)
    .first<{ pin_hash: string | null; pin_failed: number; pin_locked_until: string | null }>();
  if (!row?.pin_hash) return { ok: false, message: '아직 부모 PIN 을 만들지 않았어요', status: 400 };
  const now = new Date();
  if (row.pin_locked_until && row.pin_locked_until > now.toISOString()) {
    const min = Math.ceil((Date.parse(row.pin_locked_until) - now.getTime()) / 60000);
    return { ok: false, message: `여러 번 틀려서 잠겼어요. ${min}분 뒤에 다시 해 주세요`, status: 429 };
  }
  if (!(await matches(pin, row.pin_hash))) {
    const failed = row.pin_failed + 1;
    const lock = failed >= PIN_TRIES ? new Date(now.getTime() + PIN_LOCK_MINUTES * 60000).toISOString() : null;
    await env.DB.prepare('UPDATE parents SET pin_failed = ?, pin_locked_until = ? WHERE id = ?')
      .bind(lock ? 0 : failed, lock, me.id)
      .run();
    return lock
      ? { ok: false, message: `${PIN_TRIES}번 틀려서 ${PIN_LOCK_MINUTES}분 동안 잠겼어요`, status: 429 }
      : { ok: false, message: `PIN 이 맞지 않아요 (${PIN_TRIES - failed}번 남음)`, status: 401 };
  }
  await env.DB.batch([
    env.DB.prepare('UPDATE parents SET pin_failed = 0, pin_locked_until = NULL WHERE id = ?').bind(me.id),
    env.DB.prepare('UPDATE sessions SET unlocked_until = ? WHERE id_hash = ?').bind(new Date(now.getTime() + UNLOCK_MINUTES * 60000).toISOString(), me.session_hash),
  ]);
  return { ok: true };
}
