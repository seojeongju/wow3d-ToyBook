import type { Env } from '../_lib/env';
import { error, familyPrefix, json } from '../_lib/http';
import { clearSessionCookie } from '../_lib/auth';
import { requireParentMode } from '../_lib/parent';

/** 내 정보 고치기: 부를 이름, 소식 받기 동의 (부모 모드) */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireParentMode(request, env);
  if (me instanceof Response) return me;

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; marketing?: unknown };
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 1 || name.length > 20) return error('이름은 1~20자로 적어 주세요');
    await env.DB.prepare('UPDATE parents SET display_name = ? WHERE id = ?').bind(name, me.id).run();
  }
  if (typeof body.marketing === 'boolean') {
    await env.DB.prepare('UPDATE parents SET marketing_agreed_at = ? WHERE id = ?')
      .bind(body.marketing ? new Date().toISOString() : null, me.id)
      .run();
  }
  return json({ ok: true });
};

/**
 * 탈퇴: 부모 계정과 아이 프로필·책·그림 파일·로그인 연결을 모두 바로 지움 (부모 모드).
 * 주문 기록이 있으면 전자상거래법 보관 의무(5년) 때문에 지금은 막고 문의로 처리 — 주문 기능을 열 때 분리 보관으로 바꿈
 */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireParentMode(request, env);
  if (me instanceof Response) return me;

  const { confirm } = (await request.json().catch(() => ({}))) as { confirm?: unknown };
  if (confirm !== '탈퇴') return error('확인 글자를 정확히 적어 주세요');
  const orders = await env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE parent_id = ?').bind(me.id).first<{ n: number }>();
  if (orders?.n) return error('주문 기록이 있는 계정은 고객센터로 탈퇴를 요청해 주세요', 409);

  // 가족 폴더의 파일 모두 지우기
  const prefix = familyPrefix(me.id);
  let cursor: string | undefined;
  do {
    const list = await env.BUCKET.list({ prefix, cursor });
    if (list.objects.length) await env.BUCKET.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  const id = me.id;
  const books = 'SELECT id FROM books WHERE parent_id = ?';
  await env.DB.batch([
    env.DB.prepare('DELETE FROM wishes WHERE child_id IN (SELECT id FROM children WHERE parent_id = ?)').bind(id),
    env.DB.prepare(`DELETE FROM book_characters WHERE book_id IN (${books})`).bind(id),
    env.DB.prepare(`DELETE FROM book_pages WHERE book_id IN (${books})`).bind(id),
    env.DB.prepare('DELETE FROM models_3d WHERE parent_id = ?').bind(id),
    env.DB.prepare('DELETE FROM books WHERE parent_id = ?').bind(id),
    env.DB.prepare('DELETE FROM characters WHERE parent_id = ?').bind(id),
    env.DB.prepare('DELETE FROM children WHERE parent_id = ?').bind(id),
    env.DB.prepare('DELETE FROM sessions WHERE parent_id = ?').bind(id),
    env.DB.prepare('DELETE FROM auth_identities WHERE parent_id = ?').bind(id),
    env.DB.prepare('DELETE FROM parents WHERE id = ?').bind(id),
  ]);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
};
