import type { Env } from '../../_lib/env';
import { error, json, newId, requireParent } from '../../_lib/http';
import {
  checkParentPinForAction,
  ensureMarketSchema,
  getOrInitWallet,
  recordWalletTx,
  type MarketKind,
} from '../../_lib/market';
import { checkChildSafeText } from '../../_lib/safety';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  const wallet = await getOrInitWallet(env, parentId);
  const now = new Date().toISOString();

  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const q = url.searchParams.get('q')?.trim();

  const { results: listings } = await env.DB.prepare(
    `SELECT m.id, m.book_id, m.seller_parent_id, m.author_name, m.kind, m.price, m.rent_days,
            m.summary, m.category, m.status, m.loan_count, m.sales_count, m.likes_count, m.created_at,
            b.title, b.format, b.cover_key, b.cover_emoji,
            (SELECT COUNT(*) FROM book_pages p WHERE p.book_id = b.id) AS page_count,
            (SELECT l.due_at FROM book_loans l
              WHERE l.listing_id = m.id AND l.borrower_parent_id = ? AND l.returned_at IS NULL AND l.due_at > ?
              ORDER BY l.due_at DESC LIMIT 1) AS borrowed_until,
            EXISTS(SELECT 1 FROM book_purchases bp WHERE bp.book_id = m.book_id AND bp.buyer_parent_id = ?) AS is_purchased,
            (SELECT r.sticker FROM market_reactions r WHERE r.listing_id = m.id AND r.parent_id = ?) AS my_sticker
       FROM market_listings m
       JOIN books b ON b.id = m.book_id
      WHERE (m.status = 'published' OR m.seller_parent_id = ?)
      ORDER BY (m.loan_count + m.sales_count * 2 + m.likes_count) DESC, m.created_at DESC`,
  )
    .bind(parentId, now, parentId, parentId, parentId)
    .all<{
      id: string;
      book_id: string;
      seller_parent_id: string;
      author_name: string;
      summary: string;
      category: string;
      title: string;
      is_purchased: number;
      [key: string]: unknown;
    }>();

  const filtered = listings
    .map((item) => ({
      ...item,
      is_purchased: Boolean(item.is_purchased),
      is_mine: item.seller_parent_id === parentId,
    }))
    .filter((item) => {
      if (category && category !== '전체' && item.category !== category) return false;
      if (q) {
        const hay = `${String(item.title ?? '')} ${String(item.author_name ?? '')} ${String(item.summary ?? '')}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });

  // 내가 만든 책 목록 (출품 모달 및 '내 출품 관리' 탭에서 사용)
  const { results: myBooks } = await env.DB.prepare(
    `SELECT b.id, b.child_id, b.title, b.format, b.cover_key, b.cover_emoji, b.status, b.updated_at,
            (SELECT COUNT(*) FROM book_pages p WHERE p.book_id = b.id) AS page_count,
            m.id AS listing_id, m.kind AS market_kind, m.price AS market_price, m.rent_days AS market_rent_days,
            m.summary AS market_summary, m.category AS market_category, m.author_name AS market_author_name,
            m.status AS market_status, m.loan_count, m.sales_count, m.likes_count
       FROM books b
       LEFT JOIN market_listings m ON m.book_id = b.id
      WHERE b.parent_id = ?
      ORDER BY b.updated_at DESC`,
  )
    .bind(parentId)
    .all();

  return json({
    listings: filtered,
    myBooks,
    wallet,
  });
};

interface PublishBody {
  bookId?: string;
  kind?: MarketKind;
  price?: number;
  rentDays?: number;
  summary?: string;
  category?: string;
  authorName?: string;
  status?: 'published' | 'hidden';
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const pinBlock = await checkParentPinForAction(request, env);
  if (pinBlock) return pinBlock;

  await ensureMarketSchema(env);
  await getOrInitWallet(env, parentId);

  let body: PublishBody;
  try {
    body = await request.json();
  } catch {
    return error('JSON 형식이 아닙니다');
  }

  const bookId = body.bookId?.trim();
  if (!bookId) return error('출품할 책을 선택해 주세요');

  const book = await env.DB.prepare(`SELECT id, title FROM books WHERE id = ? AND parent_id = ?`)
    .bind(bookId, parentId)
    .first<{ id: string; title: string }>();
  if (!book) return error('내 책장 안에 있는 책만 출품할 수 있어요', 403);

  const kind: MarketKind = body.kind === 'bookstore' || body.kind === 'both' ? body.kind : 'library';
  const rawPrice = Number(body.price ?? 0);
  const price = kind === 'library' ? 0 : Math.max(100, Math.min(10000, Math.round(rawPrice / 100) * 100 || 500));
  const rentDays = Math.max(3, Math.min(30, Number(body.rentDays ?? 7) || 7));
  const summary = (body.summary ?? '').trim().slice(0, 200) || `${book.title} — 아이의 상상력으로 만든 동화책이에요.`;
  const category = (body.category ?? '').trim().slice(0, 20) || '모험';
  const authorName = (body.authorName ?? '').trim().slice(0, 30) || '꼬마 작가';
  const status = body.status === 'hidden' ? 'hidden' : 'published';

  // 공개 상태로 등록할 때는 제목·필명·소개글·본문 전체에 대해 어린이 안전/개인정보 필터 작동
  if (status === 'published') {
    const { results: pages } = await env.DB.prepare(`SELECT text FROM book_pages WHERE book_id = ?`)
      .bind(bookId)
      .all<{ text: string }>();
    const safeCheck = checkChildSafeText(book.title, authorName, summary, ...pages.map((p) => p.text));
    if (!safeCheck.ok) return error(safeCheck.reason, 400);
  }

  const now = new Date().toISOString();
  const existing = await env.DB.prepare(`SELECT id FROM market_listings WHERE book_id = ?`)
    .bind(bookId)
    .first<{ id: string }>();

  let bonusEarned = 0;
  let listingId = existing?.id;

  if (existing) {
    await env.DB.prepare(
      `UPDATE market_listings
          SET author_name = ?, kind = ?, price = ?, rent_days = ?, summary = ?, category = ?, status = ?, updated_at = ?
        WHERE id = ? AND seller_parent_id = ?`,
    )
      .bind(authorName, kind, price, rentDays, summary, category, status, now, existing.id, parentId)
      .run();
  } else {
    listingId = newId();
    bonusEarned = 200;
    await env.DB.prepare(
      `INSERT INTO market_listings
       (id, book_id, seller_parent_id, author_name, kind, price, rent_days, summary, category, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(listingId, bookId, parentId, authorName, kind, price, rentDays, summary, category, status, now, now)
      .run();

    await recordWalletTx(env, {
      parentId,
      delta: 200,
      kind: 'publish_bonus',
      title: `'${book.title}' 첫 도서관·서점 출품 보너스`,
      refId: listingId,
    });
  }

  const wallet = await getOrInitWallet(env, parentId);
  return json({ ok: true, listingId, bonusEarned, wallet });
};
