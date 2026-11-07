import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { hashPin, requireParentMode, UNLOCK_MINUTES, validPin } from '../../_lib/parent';

/** 부모 PIN 만들기·바꾸기 (부모 모드에서만). 만들면 이 세션은 바로 부모 모드로 열어 둠 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireParentMode(request, env);
  if (me instanceof Response) return me;

  const { pin } = (await request.json().catch(() => ({}))) as { pin?: unknown };
  if (!validPin(pin)) return error('PIN 은 숫자 4자리로 만들어 주세요');
  if (/^(\d)\1{3}$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) {
    return error('1111·1234 처럼 쉬운 번호는 아이가 맞힐 수 있어요. 다른 번호로 만들어 주세요');
  }
  const until = new Date(Date.now() + UNLOCK_MINUTES * 60000).toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE parents SET pin_hash = ?, pin_failed = 0, pin_locked_until = NULL WHERE id = ?').bind(await hashPin(pin), me.id),
    env.DB.prepare('UPDATE sessions SET unlocked_until = ? WHERE id_hash = ?').bind(until, me.session_hash),
  ]);
  return json({ ok: true });
};

/** 부모 PIN 없애기 (부모 모드에서만). 다시 덧셈 문제 잠금으로 돌아감 */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireParentMode(request, env);
  if (me instanceof Response) return me;
  await env.DB.prepare('UPDATE parents SET pin_hash = NULL, pin_failed = 0, pin_locked_until = NULL WHERE id = ?').bind(me.id).run();
  return json({ ok: true });
};
