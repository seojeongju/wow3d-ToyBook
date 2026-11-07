import type { Env } from '../../_lib/env';
import { error, familyPrefix, requireParent } from '../../_lib/http';
import { ensureMarketSchema } from '../../_lib/market';

export const onRequestGet: PagesFunction<Env, 'path'> = async ({ request, env, params }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const key = ((params.path as string[] | undefined) ?? []).join('/');
  if (!key || key.split('/').includes('..')) {
    return error('접근 권한이 없습니다', 403);
  }

  let allowed = key.startsWith(familyPrefix(parentId));
  if (!allowed) {
    // 도서관·서점에 공개된 책의 표지 또는 본문 삽화인지 확인
    await ensureMarketSchema(env);
    const shared = await env.DB.prepare(
      `SELECT 1 FROM books b
         LEFT JOIN market_listings m ON m.book_id = b.id
         LEFT JOIN book_pages p ON p.book_id = b.id
        WHERE (b.cover_key = ? OR p.image_key = ?)
          AND (m.status = 'published'
               OR EXISTS(SELECT 1 FROM book_purchases bp WHERE bp.book_id = b.id AND bp.buyer_parent_id = ?)
               OR EXISTS(SELECT 1 FROM book_loans bl WHERE bl.book_id = b.id AND bl.borrower_parent_id = ?))
        LIMIT 1`,
    )
      .bind(key, key, parentId, parentId)
      .first();
    allowed = Boolean(shared);
  }

  if (!allowed) {
    return error('접근 권한이 없습니다', 403);
  }

  const object = await env.BUCKET.get(key);
  if (!object) return error('파일을 찾을 수 없습니다', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=86400');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
};
