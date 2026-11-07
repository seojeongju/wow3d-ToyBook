import type { Env } from '../../../_lib/env';
import { error, json, newId, requireParent } from '../../../_lib/http';
import { ensureMarketSchema, getOrInitWallet } from '../../../_lib/market';

interface BorrowBody {
  childId?: string | null;
  action?: 'borrow' | 'return';
}

export const onRequestPost: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  await getOrInitWallet(env, parentId);

  const listingId = String(params.id ?? '');
  let body: BorrowBody = {};
  try {
    body = await request.json();
  } catch {
    /* optional body */
  }

  const listing = await env.DB.prepare(
    `SELECT id, book_id, seller_parent_id, kind, rent_days, status FROM market_listings WHERE id = ?`,
  )
    .bind(listingId)
    .first<{
      id: string;
      book_id: string;
      seller_parent_id: string;
      kind: 'library' | 'bookstore' | 'both';
      rent_days: number;
      status: string;
    }>();

  if (!listing || listing.status !== 'published') return error('대출할 수 있는 책을 찾지 못했어요', 404);

  const now = new Date().toISOString();

  // 반납하기 처리
  if (body.action === 'return') {
    await env.DB.prepare(
      `UPDATE book_loans SET returned_at = ? WHERE listing_id = ? AND borrower_parent_id = ? AND returned_at IS NULL`,
    )
      .bind(now, listing.id, parentId)
      .run();
    return json({ ok: true, status: 'returned' });
  }

  if (listing.kind === 'bookstore') {
    return error('이 책은 서점 전용 도서예요. 서점에서 소장 구매해 주세요.');
  }

  // 이미 대출 중이면 기한 연장 및 child_id 업데이트
  const activeLoan = await env.DB.prepare(
    `SELECT id, due_at FROM book_loans
      WHERE listing_id = ? AND borrower_parent_id = ? AND returned_at IS NULL AND due_at > ?
      ORDER BY due_at DESC LIMIT 1`,
  )
    .bind(listing.id, parentId, now)
    .first<{ id: string; due_at: string }>();

  const dueAt = new Date(Date.now() + (listing.rent_days || 7) * 86400000).toISOString();

  if (activeLoan) {
    await env.DB.prepare(`UPDATE book_loans SET due_at = ?, child_id = COALESCE(?, child_id) WHERE id = ?`)
      .bind(dueAt, body.childId ?? null, activeLoan.id)
      .run();
    return json({ ok: true, loanId: activeLoan.id, dueAt, extended: true });
  }

  const loanId = newId();
  await getOrInitWallet(env, listing.seller_parent_id);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO book_loans (id, listing_id, book_id, borrower_parent_id, child_id, borrowed_at, due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(loanId, listing.id, listing.book_id, parentId, body.childId ?? null, now, dueAt),
    env.DB.prepare(`UPDATE market_listings SET loan_count = loan_count + 1 WHERE id = ?`).bind(listing.id),
    // 다른 가족이 내 책을 빌려 읽으면 창작자에게 +50 별 코인 응원 보상 적립
    env.DB.prepare(
      `UPDATE market_wallets SET balance = balance + 50, total_earned = total_earned + 50, updated_at = ? WHERE parent_id = ?`,
    ).bind(now, listing.seller_parent_id),
  ]);

  return json({ ok: true, loanId, dueAt, bookId: listing.book_id });
};

