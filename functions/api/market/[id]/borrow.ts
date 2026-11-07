import type { Env } from '../../../_lib/env';
import { error, json, newId, requireParent } from '../../../_lib/http';
import { ensureMarketSchema, getOrInitWallet, recordWalletTx } from '../../../_lib/market';

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
    `SELECT m.id, m.book_id, m.seller_parent_id, m.kind, m.rent_days, m.status, b.title
       FROM market_listings m JOIN books b ON b.id = m.book_id WHERE m.id = ?`,
  )
    .bind(listingId)
    .first<{
      id: string;
      book_id: string;
      seller_parent_id: string;
      kind: 'library' | 'bookstore' | 'both';
      rent_days: number;
      status: string;
      title: string;
    }>();

  if (!listing || listing.status !== 'published') return error('대출할 수 있는 책을 찾지 못했어요', 404);

  const now = new Date().toISOString();

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
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO book_loans (id, listing_id, book_id, borrower_parent_id, child_id, borrowed_at, due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(loanId, listing.id, listing.book_id, parentId, body.childId ?? null, now, dueAt),
    env.DB.prepare(`UPDATE market_listings SET loan_count = loan_count + 1 WHERE id = ?`).bind(listing.id),
  ]);

  if (listing.seller_parent_id !== parentId) {
    await recordWalletTx(env, {
      parentId: listing.seller_parent_id,
      delta: 50,
      kind: 'loan_reward',
      title: `'${listing.title}' 도서관 대출 응원 보상`,
      refId: loanId,
    });
  }

  return json({ ok: true, loanId, dueAt, bookId: listing.book_id });
};
