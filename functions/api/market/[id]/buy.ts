import type { Env } from '../../../_lib/env';
import { error, json, newId, requireParent } from '../../../_lib/http';
import { ensureMarketSchema, getOrInitWallet } from '../../../_lib/market';

interface BuyBody {
  childId?: string | null;
}

export const onRequestPost: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  const wallet = await getOrInitWallet(env, parentId);

  const listingId = String(params.id ?? '');
  let body: BuyBody = {};
  try {
    body = await request.json();
  } catch {
    /* optional body */
  }

  const listing = await env.DB.prepare(
    `SELECT id, book_id, seller_parent_id, kind, price, status FROM market_listings WHERE id = ?`,
  )
    .bind(listingId)
    .first<{
      id: string;
      book_id: string;
      seller_parent_id: string;
      kind: 'library' | 'bookstore' | 'both';
      price: number;
      status: string;
    }>();

  if (!listing || listing.status !== 'published') return error('구매할 수 있는 책을 찾지 못했어요', 404);
  if (listing.kind === 'library' && listing.price === 0) {
    return error('이 책은 도서관 무료 도서예요. [대출하기]로 바로 빌려 읽을 수 있어요!');
  }

  const already = await env.DB.prepare(
    `SELECT id FROM book_purchases WHERE book_id = ? AND buyer_parent_id = ?`,
  )
    .bind(listing.book_id, parentId)
    .first<{ id: string }>();

  if (already) {
    if (body.childId) {
      await env.DB.prepare(`UPDATE book_purchases SET child_id = ? WHERE id = ?`)
        .bind(body.childId, already.id)
        .run();
    }
    return json({ ok: true, alreadyOwned: true, bookId: listing.book_id, wallet });
  }

  const price = Math.max(0, listing.price);
  if (wallet.balance < price) {
    return error(`별 코인이 부족해요 (보유: ${wallet.balance}코인 / 필요: ${price}코인). 내 책을 도서관에 공유하면 +200코인을 받을 수 있어요!`);
  }

  const now = new Date().toISOString();
  const purchaseId = newId();
  await getOrInitWallet(env, listing.seller_parent_id);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO book_purchases (id, listing_id, book_id, buyer_parent_id, child_id, amount, payment_method, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'points', ?)`,
    ).bind(purchaseId, listing.id, listing.book_id, parentId, body.childId ?? null, price, now),
    env.DB.prepare(`UPDATE market_listings SET sales_count = sales_count + 1 WHERE id = ?`).bind(listing.id),
    env.DB.prepare(`UPDATE market_wallets SET balance = balance - ?, updated_at = ? WHERE parent_id = ?`).bind(
      price,
      now,
      parentId,
    ),
    env.DB.prepare(
      `UPDATE market_wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ? WHERE parent_id = ?`,
    ).bind(price, price, now, listing.seller_parent_id),
  ]);

  const updatedWallet = await getOrInitWallet(env, parentId);
  return json({ ok: true, purchaseId, bookId: listing.book_id, wallet: updatedWallet });
};

