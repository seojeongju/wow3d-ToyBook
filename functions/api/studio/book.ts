import type { Env } from '../../_lib/env';
import { error, json, newId } from '../../_lib/http';
import { STORY_MODEL, writeBook } from '../../_lib/story';
import { addUsage, parseOutline, readStudioRequest } from '../../_lib/studio';

/** 이야기 공방 2단계: 확정한 줄거리로 쪽별 글을 쓰고 아이 책장에 새 책으로 저장 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const req = await readStudioRequest(request, env, 'book');
  if (req instanceof Response) return req;
  const outline = parseOutline(req.body.outline);
  if (!outline) return error('줄거리를 다시 확인해 주세요');

  const r = await writeBook(env, req.input, outline);
  if (!r.ok) return error(r.message, r.status);

  const bookId = newId();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO books (id, parent_id, child_id, title, format, art_style, cover_emoji, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'picture', ?, ?, 'done', ?, ?)",
    ).bind(bookId, req.parentId, req.childId, r.data.title, `clay:${env.ANTHROPIC_API_KEY ? STORY_MODEL : 'dev'}`, r.data.cover_art, now, now),
    ...r.data.pages.map((p, i) =>
      env.DB.prepare('INSERT INTO book_pages (id, book_id, page_no, text, layout_json) VALUES (?, ?, ?, ?, ?)').bind(
        newId(),
        bookId,
        i + 1,
        p.text,
        JSON.stringify({ emoji: p.art, bg: p.bg }),
      ),
    ),
  ]);
  await addUsage(env, req.parentId, 'book');
  return json({ bookId, title: r.data.title, pages: r.data.pages.length }, 201);
};
