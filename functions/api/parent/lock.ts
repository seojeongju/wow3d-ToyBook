import type { Env } from '../../_lib/env';
import { json } from '../../_lib/http';
import { sessionParent } from '../../_lib/auth';

/** 부모 모드 닫기 (대시보드에서 나갈 때) */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await sessionParent(request, env);
  if (me) await env.DB.prepare('UPDATE sessions SET unlocked_until = NULL WHERE id_hash = ?').bind(me.session_hash).run();
  return json({ ok: true });
};
