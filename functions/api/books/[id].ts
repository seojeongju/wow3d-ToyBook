import type { Env } from '../../_lib/env';
import { error, json, requireParent } from '../../_lib/http';
import { ensureMarketSchema } from '../../_lib/market';

interface PageRow {
  id: string;
  page_no: number;
  text: string;
  image_key: string | null;
  layout_json: string;
}

interface BookRow {
  id: string;
  parent_id: string;
  child_id: string | null;
  title: string;
  format: string;
  art_style: string | null;
  cover_key: string | null;
  cover_emoji: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ListingRow {
  id: string;
  author_name: string;
  kind: 'library' | 'bookstore' | 'both';
  price: number;
  rent_days: number;
  summary: string;
  category: string;
  status: string;
  loan_count: number;
  sales_count: number;
  likes_count: number;
}

export const onRequestGet: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  const id = params.id as string;
  const now = new Date().toISOString();

  const book = await env.DB.prepare(
    'SELECT id, parent_id, child_id, title, format, art_style, cover_key, cover_emoji, status, created_at, updated_at FROM books WHERE id = ?',
  )
    .bind(id)
    .first<BookRow>();
  if (!book) return error('책을 찾을 수 없습니다', 404);

  const isOwner = book.parent_id === parentId;
  const listing = await env.DB.prepare(
    `SELECT id, author_name, kind, price, rent_days, summary, category, status, loan_count, sales_count, likes_count
       FROM market_listings WHERE book_id = ?`,
  )
    .bind(id)
    .first<ListingRow>();

  const loan = await env.DB.prepare(
    `SELECT id, due_at FROM book_loans
      WHERE book_id = ? AND borrower_parent_id = ? AND returned_at IS NULL AND due_at > ?
      ORDER BY due_at DESC LIMIT 1`,
  )
    .bind(id, parentId, now)
    .first<{ id: string; due_at: string }>();

  const purchase = await env.DB.prepare(`SELECT id FROM book_purchases WHERE book_id = ? AND buyer_parent_id = ?`)
    .bind(id, parentId)
    .first<{ id: string }>();

  const isPublished = listing?.status === 'published';
  if (!isOwner && !isPublished && !loan && !purchase) {
    return error('책을 찾을 수 없습니다', 404);
  }

  const { results } = await env.DB.prepare(
    'SELECT id, page_no, text, image_key, layout_json FROM book_pages WHERE book_id = ? ORDER BY page_no',
  )
    .bind(id)
    .all<PageRow>();

  const allPages = results.map(({ layout_json, ...p }) => ({ ...p, layout: parseLayout(layout_json) }));

  // 서점 전용 도서이고 아직 소장/대여하지 않은 경우 앞 2쪽 미리보기 제공
  const canReadFull = isOwner || Boolean(purchase) || Boolean(loan) || listing?.kind === 'library';
  const pages = canReadFull ? allPages : allPages.slice(0, 2);

  const ownership: 'mine' | 'purchased' | 'borrowed' | 'market' = isOwner
    ? 'mine'
    : purchase
      ? 'purchased'
      : loan
        ? 'borrowed'
        : 'market';

  return json({
    book: {
      id: book.id,
      child_id: isOwner ? book.child_id : null,
      title: book.title,
      format: book.format,
      art_style: book.art_style,
      cover_key: book.cover_key,
      cover_emoji: book.cover_emoji,
      status: book.status,
      created_at: book.created_at,
      updated_at: book.updated_at,
      page_count: allPages.length,
      ownership,
      due_at: loan?.due_at ?? null,
      author_name: listing?.author_name ?? null,
      listing_id: listing?.id ?? null,
      market_kind: listing?.kind ?? null,
      market_price: listing?.price ?? 0,
      preview_only: !canReadFull,
    },
    pages,
    listing: listing ?? null,
  });
};

function parseLayout(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
