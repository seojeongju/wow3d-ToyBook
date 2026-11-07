import type { Env } from './env';
import { error } from './http';
import type { SessionParent } from './auth';
import { isUnlocked, requireActive } from './parent';

/**
 * 운영자(관리자) 권한.
 * - Cloudflare 비밀값 ADMIN_EMAILS(쉼표로 여러 개)에 있는 이메일로 간편 로그인한 계정만 운영자
 * - 이메일을 믿을 수 있는 경우만 인정: 구글·카카오는 회사가 확인한 이메일만 저장하고, 네이버는 @naver.com 주소만 인정
 *   (다른 사람이 연락처 이메일을 운영자 주소로 적어 넣어도 운영자가 되지 않게)
 * - 운영자 화면은 부모 PIN 을 꼭 만들고, 이 세션에서 PIN 을 맞혀야(30분) 열림
 * - 로컬 시험: ALLOW_DEV_LOGIN=true 일 때 시험용 로그인 'admin'(as=admin)을 운영자로 봄
 */
export function adminEmails(env: Env): string[] {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function trusted(provider: string, email: string): boolean {
  if (provider === 'naver') return email.endsWith('@naver.com');
  return provider === 'google' || provider === 'kakao';
}

export async function isAdmin(env: Env, parentId: string): Promise<boolean> {
  const { results } = await env.DB.prepare('SELECT provider, provider_user_id, email FROM auth_identities WHERE parent_id = ?')
    .bind(parentId)
    .all<{ provider: string; provider_user_id: string; email: string | null }>();
  if (env.ALLOW_DEV_LOGIN === 'true' && results.some((r) => r.provider === 'dev' && r.provider_user_id === 'dev-admin')) return true;
  const list = adminEmails(env);
  if (!list.length) return false;
  return results.some((r) => r.email && list.includes(r.email.toLowerCase()) && trusted(r.provider, r.email.toLowerCase()));
}

/** 운영자 작업 기록 (키 값 같은 비밀은 detail 에 넣지 말 것) */
export async function audit(env: Env, parentId: string, action: string, detail: string) {
  await env.DB.prepare('INSERT INTO admin_audit (parent_id, action, detail) VALUES (?, ?, ?)').bind(parentId, action, detail.slice(0, 500)).run();
}

/** 운영자 API 공통 확인: 운영자 + PIN 있음 + 이 세션에서 PIN 을 맞힘 */
export async function requireAdmin(request: Request, env: Env): Promise<SessionParent | Response> {
  const me = await requireActive(request, env);
  if (me instanceof Response) return me;
  if (!(await isAdmin(env, me.id))) return error('운영자만 쓸 수 있어요', 403);
  if (!me.has_pin) return error('운영자는 먼저 PIN 을 만들어 주세요', 428);
  if (!isUnlocked(me)) return error('PIN 을 다시 입력해 주세요', 423);
  return me;
}
