import type { Env } from '../../../_lib/env';
import { error, json } from '../../../_lib/http';
import { audit, requireAdmin } from '../../../_lib/admin';
import { encryptKey, type ProviderRow } from '../../../_lib/imageai';

/** 운영자: 공급사 고치기 (이름·모델·키 바꾸기/지우기·켜고 끄기·순서·장당 비용) */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireAdmin(request, env);
  if (me instanceof Response) return me;
  const id = String(params.id);
  const p = await env.DB.prepare('SELECT * FROM ai_providers WHERE id = ?').bind(id).first<ProviderRow>();
  if (!p) return error('공급사를 찾을 수 없어요', 404);

  const b = (await request.json().catch(() => ({}))) as {
    label?: unknown;
    model?: unknown;
    apiKey?: unknown;
    clearKey?: unknown;
    enabled?: unknown;
    priority?: unknown;
    costPerImage?: unknown;
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  const changed: string[] = [];
  const set = (col: string, v: unknown, what: string) => {
    sets.push(`${col} = ?`);
    vals.push(v);
    changed.push(what);
  };

  if (typeof b.label === 'string' && b.label.trim()) set('label', b.label.trim().slice(0, 40), '이름');
  if (typeof b.model === 'string' && b.model.trim()) set('model', b.model.trim().slice(0, 100), `모델=${b.model.trim().slice(0, 100)}`);
  if (typeof b.enabled === 'boolean') set('enabled', b.enabled ? 1 : 0, b.enabled ? '켜기' : '끄기');
  if (Number.isInteger(b.priority)) set('priority', b.priority, `순서=${b.priority}`);
  if (b.costPerImage === null || (typeof b.costPerImage === 'number' && b.costPerImage >= 0)) set('cost_per_image', b.costPerImage, '장당 비용');
  if (b.clearKey === true) {
    set('key_cipher', null, '저장 키 지움(환경 변수 키 사용)');
    set('key_hint', null, '');
  } else if (typeof b.apiKey === 'string' && b.apiKey.trim()) {
    const key = b.apiKey.trim();
    const cipher = await encryptKey(env, key);
    if (!cipher) return error('키를 저장하려면 Cloudflare 에 AI_KEYS_SECRET 을 먼저 넣어 주세요', 428);
    set('key_cipher', cipher, '키 바꿈');
    set('key_hint', key.slice(-4), '');
  }
  if (!sets.length) return error('바꿀 내용이 없어요');

  sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
  await env.DB.prepare(`UPDATE ai_providers SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals, id)
    .run();
  await audit(env, me.id, 'ai.update', `${p.kind} ${p.label}: ${changed.filter(Boolean).join(', ')}`);
  return json({ ok: true });
};

/** 운영자: 공급사 지우기 (저장한 키도 함께 사라짐) */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireAdmin(request, env);
  if (me instanceof Response) return me;
  const p = await env.DB.prepare('SELECT kind, label FROM ai_providers WHERE id = ?').bind(String(params.id)).first<{ kind: string; label: string }>();
  if (!p) return error('공급사를 찾을 수 없어요', 404);
  await env.DB.prepare('DELETE FROM ai_providers WHERE id = ?').bind(String(params.id)).run();
  await audit(env, me.id, 'ai.delete', `${p.kind} ${p.label}`);
  return json({ ok: true });
};
