import type { Env } from '../../_lib/env';
import { error, familyPrefix, json, newId, requireParent, requireParentForWrite } from '../../_lib/http';

const MAX_PAGES = 32;
const MAX_TEXT = 1000;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const childId = new URL(request.url).searchParams.get('childId');
  const sql =
    'SELECT b.id, b.child_id, b.title, b.format, b.cover_key, b.cover_emoji, b.status, b.updated_at,' +
    ' (SELECT COUNT(*) FROM book_pages p WHERE p.book_id = b.id) AS page_count' +
    ' FROM books b WHERE b.parent_id = ?' +
    (childId ? ' AND b.child_id = ?' : '') +
    ' ORDER BY b.updated_at DESC';
  const stmt = env.DB.prepare(sql);
  const { results } = await (childId ? stmt.bind(parentId, childId) : stmt.bind(parentId)).all();
  return json({ books: results });
};

interface CreateBookBody {
  childId?: string;
  title?: string;
  format?: 'picture' | 'webtoon';
  coverEmoji?: string;
  pages?: { text?: string; imageKey?: string }[];
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParentForWrite(request, env);
  if (parentId instanceof Response) return parentId;

  let body: CreateBookBody;
  try {
    body = await request.json();
  } catch {
    return error('JSON 형식이 아닙니다');
  }

  const title = body.title?.trim();
  if (!title || title.length > 100) return error('제목은 1~100자로 입력해 주세요');
  const format = body.format ?? 'picture';
  if (format !== 'picture' && format !== 'webtoon') return error('형식은 picture 또는 webtoon 입니다');
  const pages = Array.isArray(body.pages) ? body.pages : [];
  if (pages.length > MAX_PAGES) return error(`페이지는 최대 ${MAX_PAGES}쪽입니다`);
  if (pages.some((p) => String(p.text ?? '').length > MAX_TEXT)) return error(`한 쪽 글은 최대 ${MAX_TEXT}자입니다`);
  // 다른 가족의 파일을 참조하지 못하게 막음
  if (pages.some((p) => p.imageKey && !p.imageKey.startsWith(familyPrefix(parentId)))) {
    return error('이미지 경로가 올바르지 않습니다', 403);
  }

  if (body.childId) {
    const child = await env.DB.prepare('SELECT 1 FROM children WHERE id = ? AND parent_id = ?')
      .bind(body.childId, parentId)
      .first();
    if (!child) return error('아이 프로필을 찾을 수 없습니다', 404);
  }

  const bookId = newId();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO books (id, parent_id, child_id, title, format, cover_emoji) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(bookId, parentId, body.childId ?? null, title, format, body.coverEmoji ?? '📘'),
    ...pages.map((p, i) =>
      env.DB.prepare('INSERT INTO book_pages (id, book_id, page_no, text, image_key) VALUES (?, ?, ?, ?, ?)').bind(
        newId(),
        bookId,
        i + 1,
        String(p.text ?? ''),
        p.imageKey ?? null,
      ),
    ),
  ]);
  return json({ id: bookId }, 201);
};
