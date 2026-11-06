import type { Env } from '../../_lib/env';
import { error, json, requireParent } from '../../_lib/http';

interface PageRow {
  id: string;
  page_no: number;
  text: string;
  image_key: string | null;
  layout_json: string;
}

export const onRequestGet: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const id = params.id as string;
  const book = await env.DB.prepare(
    'SELECT id, child_id, title, format, art_style, cover_key, cover_emoji, status, created_at, updated_at' +
      ' FROM books WHERE id = ? AND parent_id = ?',
  )
    .bind(id, parentId)
    .first();
  if (!book) return error('책을 찾을 수 없습니다', 404);

  const { results } = await env.DB.prepare(
    'SELECT id, page_no, text, image_key, layout_json FROM book_pages WHERE book_id = ? ORDER BY page_no',
  )
    .bind(id)
    .all<PageRow>();

  const pages = results.map(({ layout_json, ...p }) => ({ ...p, layout: parseLayout(layout_json) }));
  return json({ book, pages });
};

function parseLayout(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
