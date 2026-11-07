import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { deleteChildData, parseChild, type ChildInput } from '../../_lib/children';
import { requireParentMode } from '../../_lib/parent';

/** 아이 프로필 고치기 (부모 모드) */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireParentMode(request, env);
  if (me instanceof Response) return me;

  const child = parseChild((await request.json().catch(() => ({}))) as ChildInput);
  if (typeof child === 'string') return error(child);
  const res = await env.DB.prepare('UPDATE children SET nickname = ?, birth_year = ?, avatar = ?, likes = ?, age_mode = ? WHERE id = ? AND parent_id = ?')
    .bind(child.nickname, child.birth_year, child.avatar, child.likes, child.age_mode, String(params.id), me.id)
    .run();
  if (!res.meta.changes) return error('아이 프로필을 찾을 수 없어요', 404);
  return json({ child: { id: String(params.id), ...child } });
};

/** 아이 프로필 지우기: 그 아이의 책·그림 파일까지 함께 지움 (부모 모드) */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const me = await requireParentMode(request, env);
  if (me instanceof Response) return me;

  const id = String(params.id);
  const found = await env.DB.prepare('SELECT 1 FROM children WHERE id = ? AND parent_id = ?').bind(id, me.id).first();
  if (!found) return error('아이 프로필을 찾을 수 없어요', 404);
  await deleteChildData(env, me.id, id);
  return json({ ok: true });
};
