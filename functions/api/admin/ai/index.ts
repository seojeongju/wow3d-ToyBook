import type { Env } from '../../../_lib/env';
import { error, json, newId } from '../../../_lib/http';
import { audit, requireAdmin } from '../../../_lib/admin';
import { canEncrypt, encryptKey, isKind, KINDS, resolveKey, type ProviderRow } from '../../../_lib/imageai';

/** 화면에 보낼 모양 (키는 끝 4자리와 출처만) */
async function present(env: Env, p: ProviderRow) {
  const { source } = await resolveKey(env, p);
  return {
    id: p.id,
    kind: p.kind,
    kindName: KINDS[p.kind].name,
    label: p.label,
    model: p.model,
    keySource: source,
    keyHint: p.key_hint,
    enabled: Boolean(p.enabled),
    priority: p.priority,
    costPerImage: p.cost_per_image,
    lastTest: p.last_test_at ? { at: p.last_test_at, ok: Boolean(p.last_test_ok), ms: p.last_test_ms, note: p.last_test_note } : null,
  };
}

/** 운영자: 그림 AI 공급사 목록 + 최근 7일 사용 요약 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireAdmin(request, env);
  if (me instanceof Response) return me;

  const { results } = await env.DB.prepare("SELECT * FROM ai_providers WHERE purpose = 'image' ORDER BY priority, created_at").all<ProviderRow>();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { results: usage } = await env.DB.prepare(
    "SELECT provider_id, COUNT(*) AS calls, SUM(ok) AS ok, CAST(AVG(ms) AS INTEGER) AS avg_ms, SUM(COALESCE(cost, 0)) AS cost FROM ai_usage WHERE purpose = 'image' AND created_at > ? GROUP BY provider_id",
  )
    .bind(since)
    .all<{ provider_id: string; calls: number; ok: number; avg_ms: number; cost: number }>();

  return json({
    providers: await Promise.all(results.map((p) => present(env, p))),
    usage,
    kinds: Object.entries(KINDS).map(([id, k]) => ({ id, name: k.name, defaultModel: k.defaultModel, note: k.note, envKeyName: k.envKey, envKeySet: Boolean(env[k.envKey]) })),
    canSaveKeys: await canEncrypt(env),
  });
};

/** 운영자: 공급사 추가 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireAdmin(request, env);
  if (me instanceof Response) return me;

  const body = (await request.json().catch(() => ({}))) as { kind?: unknown; label?: unknown; model?: unknown; apiKey?: unknown; costPerImage?: unknown };
  if (!isKind(body.kind)) return error('공급사를 골라 주세요');
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 40) : KINDS[body.kind].name;
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim().slice(0, 100) : KINDS[body.kind].defaultModel;
  const cost = Number(body.costPerImage);

  let cipher: string | null = null;
  let hint: string | null = null;
  if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    const key = body.apiKey.trim();
    cipher = await encryptKey(env, key);
    if (!cipher) return error('키를 저장하려면 Cloudflare 에 AI_KEYS_SECRET 을 먼저 넣어 주세요', 428);
    hint = key.slice(-4);
  }

  const max = await env.DB.prepare("SELECT COALESCE(MAX(priority), 0) AS m FROM ai_providers WHERE purpose = 'image'").first<{ m: number }>();
  const id = newId();
  await env.DB.prepare(
    "INSERT INTO ai_providers (id, purpose, kind, label, model, key_cipher, key_hint, enabled, priority, cost_per_image) VALUES (?, 'image', ?, ?, ?, ?, ?, 1, ?, ?)",
  )
    .bind(id, body.kind, label, model, cipher, hint, (max?.m ?? 0) + 10, Number.isFinite(cost) && cost >= 0 ? cost : null)
    .run();
  await audit(env, me.id, 'ai.add', `${body.kind} ${model} (${cipher ? '키 저장' : '환경 변수 키'})`);
  return json({ id }, 201);
};
