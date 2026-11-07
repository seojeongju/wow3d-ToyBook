import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { sessionParent } from '../../_lib/auth';
import { confirmVerification } from '../../_lib/verify';

/**
 * 보호자 본인인증 마무리: 화면이 받은 인증 건 번호를 서버가 인증 회사에 직접 확인하고, 성인이면 기록.
 * 가입 중(약관 동의 후)이면 이때 계정을 'active' 로. 이미 가입한 계정도 나중에 인증할 수 있음
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await sessionParent(request, env);
  if (!me) return error('로그인이 필요해요', 401);
  if (me.guardian_verified_at) return json({ ok: true });
  if (!me.terms_agreed_at) return error('약관 동의를 먼저 해 주세요', 400);

  const { id } = (await request.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== 'string' || id.length < 8 || id.length > 100) return error('본인인증 번호가 올바르지 않아요');

  const used = await env.DB.prepare('SELECT 1 FROM parents WHERE guardian_verify_ref = ?').bind(id).first();
  if (used) return error('이미 사용한 본인인증이에요. 다시 인증해 주세요', 409);

  const r = await confirmVerification(env, id);
  if (!r.ok) return error(r.message, r.status);

  await env.DB.prepare(
    "UPDATE parents SET guardian_verified_at = ?, guardian_verify_method = ?, guardian_verify_ref = ?, status = 'active' WHERE id = ?",
  )
    .bind(new Date().toISOString(), r.method, id, me.id)
    .run();
  return json({ ok: true });
};
