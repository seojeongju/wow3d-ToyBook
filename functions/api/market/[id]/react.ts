import type { Env } from '../../../_lib/env';
import { error, json, requireParent } from '../../../_lib/http';
import { ensureMarketSchema, STICKER_META, type StickerType } from '../../../_lib/market';

interface ReactBody {
  sticker?: StickerType;
}

export const onRequestPost: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  const listingId = String(params.id ?? '');

  let body: ReactBody = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }

  const sticker: StickerType = body.sticker && body.sticker in STICKER_META ? body.sticker : 'star';
  const existing = await env.DB.prepare(
    `SELECT sticker FROM market_reactions WHERE listing_id = ? AND parent_id = ?`,
  )
    .bind(listingId, parentId)
    .first<{ sticker: StickerType }>();

  const now = new Date().toISOString();
  if (existing) {
    await env.DB.prepare(
      `UPDATE market_reactions SET sticker = ?, created_at = ? WHERE listing_id = ? AND parent_id = ?`,
    )
      .bind(sticker, now, listingId, parentId)
      .run();
  } else {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO market_reactions (listing_id, parent_id, sticker, created_at) VALUES (?, ?, ?, ?)`).bind(
        listingId,
        parentId,
        sticker,
        now,
      ),
      env.DB.prepare(`UPDATE market_listings SET likes_count = likes_count + 1 WHERE id = ?`).bind(listingId),
    ]);
  }

  const updated = await env.DB.prepare(`SELECT likes_count FROM market_listings WHERE id = ?`)
    .bind(listingId)
    .first<{ likes_count: number }>();

  return json({ ok: true, sticker, likesCount: updated?.likes_count ?? 1 });
};

