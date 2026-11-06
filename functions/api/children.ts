import type { Env } from '../_lib/env';
import { json, requireParent } from '../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const { results } = await env.DB.prepare(
    'SELECT id, nickname, birth_year, avatar, age_mode, likes FROM children WHERE parent_id = ? ORDER BY created_at, nickname',
  )
    .bind(parentId)
    .all();
  return json({ children: results });
};
