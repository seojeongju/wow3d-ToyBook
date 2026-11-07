import type { Env } from '../../../../_lib/env';
import { error, json } from '../../../../_lib/http';
import { audit, requireAdmin } from '../../../../_lib/admin';
import { drawWith, TEST_PROMPT, type ProviderRow } from '../../../../_lib/imageai';

/**
 * 운영자: 연결 시험 — 점토 곰 그림 1장을 실제로 그려 보고 결과·걸린 시간을 돌려줌 (그림은 저장하지 않음).
 * 실제 비용이 1장만큼 나감
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireAdmin(request, env);
  if (me instanceof Response) return me;
  const p = await env.DB.prepare('SELECT * FROM ai_providers WHERE id = ?').bind(String(params.id)).first<ProviderRow>();
  if (!p) return error('공급사를 찾을 수 없어요', 404);

  const r = await drawWith(env, p, { prompt: TEST_PROMPT });
  const note = r.ok ? `${r.image.mime}, ${Math.round(r.image.data.length / 1024)}KB` : r.error;
  await env.DB.prepare(
    "UPDATE ai_providers SET last_test_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), last_test_ok = ?, last_test_ms = ?, last_test_note = ? WHERE id = ?",
  )
    .bind(r.ok ? 1 : 0, r.ms, note.slice(0, 300), p.id)
    .run();
  await audit(env, me.id, 'ai.test', `${p.kind} ${p.label}: ${r.ok ? '성공' : '실패'} ${r.ms}ms`);

  if (!r.ok) return json({ ok: false, ms: r.ms, error: r.error });
  let bin = '';
  for (let i = 0; i < r.image.data.length; i += 0x8000) bin += String.fromCharCode(...r.image.data.subarray(i, i + 0x8000));
  return json({ ok: true, ms: r.ms, image: `data:${r.image.mime};base64,${btoa(bin)}` });
};
