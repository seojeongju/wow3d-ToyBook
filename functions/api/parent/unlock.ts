import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { checkPin, requireActive, validPin } from '../../_lib/parent';

/** 부모 잠금 풀기: PIN 이 맞으면 이 세션의 부모 모드를 30분 동안 엶 (5번 틀리면 10분 잠금) */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireActive(request, env);
  if (me instanceof Response) return me;
  const { pin } = (await request.json().catch(() => ({}))) as { pin?: unknown };
  if (!validPin(pin)) return error('숫자 4자리를 눌러 주세요');
  const r = await checkPin(env, me, pin);
  return r.ok ? json({ ok: true }) : error(r.message, r.status);
};
