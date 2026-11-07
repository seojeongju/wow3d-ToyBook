import type { Env } from '../../_lib/env';
import { error, json, newId, requireParent } from '../../_lib/http';
import { MAX_CHILDREN, parseChild, type ChildInput } from '../../_lib/children';
import { requireParentMode } from '../../_lib/parent';
import { verifyMode } from '../../_lib/verify';

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

/** 아이 프로필 만들기 (부모 모드). 가입을 마친 계정만, 한 가족 최대 6명 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireParentMode(request, env);
  if (me instanceof Response) return me;

  // 보호자 본인인증이 켜져 있으면 인증을 마친 보호자만 아이 정보를 넣을 수 있음 (법정대리인 동의 확인)
  if (verifyMode(env) !== 'off' && !me.guardian_verified_at) return error('아이 정보를 넣기 전에 보호자 본인인증을 해 주세요', 428);

  const child = parseChild((await request.json().catch(() => ({}))) as ChildInput);
  if (typeof child === 'string') return error(child);
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM children WHERE parent_id = ?').bind(me.id).first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_CHILDREN) return error(`아이 프로필은 ${MAX_CHILDREN}명까지 만들 수 있어요`, 409);

  const id = newId();
  await env.DB.prepare('INSERT INTO children (id, parent_id, nickname, birth_year, avatar, age_mode, likes) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, me.id, child.nickname, child.birth_year, child.avatar, child.age_mode, child.likes)
    .run();
  return json({ child: { id, ...child } }, 201);
};
