import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { clearSessionCookie, sessionParent } from '../../_lib/auth';
import { verifyMode } from '../../_lib/verify';

interface Consent {
  age14?: boolean;
  terms?: boolean;
  privacy?: boolean;
  guardian?: boolean;
  marketing?: boolean;
}

/**
 * 가입 마무리: 필수 동의(만 14세 이상 보호자·이용약관·개인정보 수집·이용·아이 정보 법정대리인 동의)를 받고 계정을 'active' 로.
 * 선택 동의(소식 받기)는 따로 기록.
 * 보호자 본인인증이 켜져 있으면(verify.ts) 동의만 기록하고 pending 으로 두었다가 /api/auth/verify 에서 active 로
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await sessionParent(request, env);
  if (!me) return error('로그인이 필요해요', 401);
  if (me.status === 'active') return json({ ok: true, next: 'done' });

  const body = (await request.json().catch(() => ({}))) as Consent;
  if (!(body.age14 && body.terms && body.privacy && body.guardian)) return error('필수 항목에 모두 동의해 주세요', 400);

  const now = new Date().toISOString();
  const needVerify = verifyMode(env) !== 'off' && !me.guardian_verified_at;
  await env.DB.prepare(
    "UPDATE parents SET status = ?, terms_agreed_at = ?, privacy_agreed_at = ?, consent_at = ?, marketing_agreed_at = ?, age_check = COALESCE(age_check, 'self') WHERE id = ? AND status = 'pending'",
  )
    .bind(needVerify ? 'pending' : 'active', now, now, now, body.marketing ? now : null, me.id)
    .run();
  return json({ ok: true, next: needVerify ? 'verify' : 'done' });
};

/** 가입 그만두기: 동의 전(pending) 계정과 받아 둔 회원 정보를 바로 지움 */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const me = await sessionParent(request, env);
  if (!me) return error('로그인이 필요해요', 401);
  if (me.status !== 'pending') return error('이미 가입을 마친 계정이에요', 409);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE parent_id = ?').bind(me.id),
    env.DB.prepare('DELETE FROM auth_identities WHERE parent_id = ?').bind(me.id),
    env.DB.prepare("DELETE FROM parents WHERE id = ? AND status = 'pending'").bind(me.id),
  ]);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
};
