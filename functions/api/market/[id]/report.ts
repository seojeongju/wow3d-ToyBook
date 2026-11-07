import type { Env } from '../../../_lib/env';
import { error, json, newId, requireParent } from '../../../_lib/http';
import { ensureMarketSchema } from '../../../_lib/market';

const REASONS = ['개인정보(실명·연락처) 노출', '어린이에게 부적절한 표현', '저작권·도용 의심', '기타 안전 우려'] as const;

interface ReportBody {
  reason?: string;
  detail?: string;
}

export const onRequestPost: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  const listingId = String(params.id ?? '');

  let body: ReportBody = {};
  try {
    body = await request.json();
  } catch {
    return error('JSON 형식이 아닙니다');
  }

  const listing = await env.DB.prepare(`SELECT id, status FROM market_listings WHERE id = ?`)
    .bind(listingId)
    .first<{ id: string; status: string }>();
  if (!listing) return error('신고할 도서를 찾을 수 없어요', 404);

  const reason = (body.reason ?? '').trim().slice(0, 40) || REASONS[0];
  const detail = (body.detail ?? '').trim().slice(0, 300);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO market_reports (id, listing_id, reporter_parent_id, reason, detail, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?)
     ON CONFLICT (listing_id, reporter_parent_id)
     DO UPDATE SET reason = excluded.reason, detail = excluded.detail, status = 'open', created_at = excluded.created_at`,
  )
    .bind(newId(), listingId, parentId, reason, detail, now)
    .run();

  // 미처리 신고가 3건 이상 누적되면 어린이 보호를 위해 즉시 자동 임시 블라인드 전환
  const cntRow = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM market_reports WHERE listing_id = ? AND status = 'open'`,
  )
    .bind(listingId)
    .first<{ cnt: number }>();

  const reportCount = cntRow?.cnt ?? 1;
  let autoHidden = false;
  if (reportCount >= 3) {
    await env.DB.prepare(`UPDATE market_listings SET status = 'hidden', updated_at = ? WHERE id = ?`)
      .bind(now, listingId)
      .run();
    autoHidden = true;
  }

  return json({ ok: true, reportCount, autoHidden });
};

