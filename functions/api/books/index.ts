import type { Env } from '../../_lib/env';
import { error, familyPrefix, json, newId, requireParent, requireParentForWrite } from '../../_lib/http';
import { ensureMarketSchema } from '../../_lib/market';

const MAX_PAGES = 32;
const MAX_TEXT = 1000;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  const childId = new URL(request.url).searchParams.get('childId');
  const now = new Date().toISOString();

  // 1. 우리 가족이 직접 만든 책
  const ownSql =
    `SELECT b.id, b.child_id, b.title, b.format, b.cover_key, b.cover_emoji, b.status, b.updated_at,
            (SELECT COUNT(*) FROM book_pages p WHERE p.book_id = b.id) AS page_count,
            'mine' AS ownership, NULL AS due_at, m.author_name, m.id AS listing_id, m.kind AS market_kind
       FROM books b
       LEFT JOIN market_listings m ON m.book_id = b.id AND m.status = 'published'
      WHERE b.parent_id = ?` +
    (childId ? ' AND b.child_id = ?' : '') +
    ' ORDER BY b.updated_at DESC';
  const ownStmt = env.DB.prepare(ownSql);
  const { results: ownBooks } = await (childId ? ownStmt.bind(parentId, childId) : ownStmt.bind(parentId)).all<Record<string, unknown>>();

  // 2. 서점에서 구매해 영구 소장한 책
  const purchasedSql =
    `SELECT b.id, bp.child_id, b.title, b.format, b.cover_key, b.cover_emoji, b.status, bp.created_at AS updated_at,
            (SELECT COUNT(*) FROM book_pages p WHERE p.book_id = b.id) AS page_count,
            'purchased' AS ownership, NULL AS due_at, m.author_name, m.id AS listing_id, m.kind AS market_kind
       FROM book_purchases bp
       JOIN books b ON b.id = bp.book_id
       LEFT JOIN market_listings m ON m.id = bp.listing_id
      WHERE bp.buyer_parent_id = ?` +
    (childId ? ' AND (bp.child_id = ? OR bp.child_id IS NULL)' : '') +
    ' ORDER BY bp.created_at DESC';
  const purchasedStmt = env.DB.prepare(purchasedSql);
  const { results: purchasedBooks } = await (childId
    ? purchasedStmt.bind(parentId, childId)
    : purchasedStmt.bind(parentId)).all<Record<string, unknown>>();

  // 3. 도서관에서 현재 대여 중인 책 (반납 전 & 만료 전)
  const borrowedSql =
    `SELECT b.id, bl.child_id, b.title, b.format, b.cover_key, b.cover_emoji, b.status, bl.borrowed_at AS updated_at,
            (SELECT COUNT(*) FROM book_pages p WHERE p.book_id = b.id) AS page_count,
            'borrowed' AS ownership, bl.due_at, m.author_name, m.id AS listing_id, m.kind AS market_kind
       FROM book_loans bl
       JOIN books b ON b.id = bl.book_id
       LEFT JOIN market_listings m ON m.id = bl.listing_id
      WHERE bl.borrower_parent_id = ? AND bl.returned_at IS NULL AND bl.due_at > ?` +
    (childId ? ' AND (bl.child_id = ? OR bl.child_id IS NULL)' : '') +
    ' ORDER BY bl.borrowed_at DESC';
  const borrowedStmt = env.DB.prepare(borrowedSql);
  const { results: borrowedBooks } = await (childId
    ? borrowedStmt.bind(parentId, now, childId)
    : borrowedStmt.bind(parentId, now)).all<Record<string, unknown>>();

  // 중복 책 제거 (우선순위: 내 책 > 소장 책 > 대여 책)
  const seen = new Set<string>();
  const combined: Record<string, unknown>[] = [];
  for (const b of [...ownBooks, ...purchasedBooks, ...borrowedBooks]) {
    const id = String(b.id);
    if (seen.has(id)) continue;
    seen.add(id);
    combined.push(b);
  }

  return json({ books: combined });
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
