import type { Env } from '../../_lib/env';
import { json } from '../../_lib/http';
import { clearSessionCookie, deleteSession } from '../../_lib/auth';

/** 로그아웃: 이 기기의 세션만 지움 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  await deleteSession(request, env);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
};
