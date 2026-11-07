import { requireAdmin } from '../../_lib/admin';
import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { ensureMarketSchema } from '../../_lib/market';

const VALID_ORDER_STATUSES = [
  'received',
  'inspecting',
  'printing',
  'finishing',
  'shipping',
  'done',
  'cancelled',
] as const;

const ORDER_STATUS_DEFAULT_NOTE: Record<string, string> = {
  received: 'wow3d 출력 센터에서 주문을 접수했어요.',
  inspecting: '전문 엔지니어가 3D 모델 두께와 서포트를 검수하고 있어요.',
  printing: '3D 프린터에서 정성껏 조형 출력을 시작했어요.',
  finishing: '서포트 제거 및 어린이 안전 표면 다듬기(후가공) 중이에요.',
  shipping: '꼼꼼하게 포장되어 택배 배송이 시작되었어요!',
  done: '배송이 완료되었어요. 동화 속 친구와 즐거운 시간 보내세요!',
  cancelled: '주문이 취소 처리되었어요.',
};

/**
 * GET /api/admin/overview
 * 운영자 전용: 실시간 콘텐츠 신고 목록 + 실물 3D 피규어 주문 파이프라인 조회
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  await ensureMarketSchema(env);

  const [counts, reportsRes, ordersRes] = await Promise.all([
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM parents) AS total_parents,
         (SELECT COUNT(*) FROM books) AS total_books,
         (SELECT COUNT(*) FROM market_listings WHERE status = 'published') AS published_listings,
         (SELECT COUNT(*) FROM market_reports WHERE status = 'open') AS open_reports,
         (SELECT COUNT(*) FROM orders WHERE status NOT IN ('done', 'cancelled')) AS active_orders`,
    ).first<{
      total_parents: number;
      total_books: number;
      published_listings: number;
      open_reports: number;
      active_orders: number;
    }>(),
    env.DB.prepare(
      `SELECT
         r.id,
         r.listing_id,
         r.reason,
         r.detail,
         r.status,
         r.created_at,
         r.resolved_at,
         ml.book_id,
         ml.author_name,
         ml.status AS listing_status,
         b.title AS book_title,
         b.cover_emoji
       FROM market_reports r
       JOIN market_listings ml ON ml.id = r.listing_id
       JOIN books b ON b.id = ml.book_id
       ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END, r.created_at DESC
       LIMIT 50`,
    ).all<{
      id: string;
      listing_id: string;
      reason: string;
      detail: string;
      status: string;
      created_at: string;
      resolved_at: string | null;
      book_id: string;
      author_name: string;
      listing_status: string;
      book_title: string;
      cover_emoji: string;
    }>(),
    env.DB.prepare(
      `SELECT
         o.id,
         o.amount,
         o.status,
         o.wow3dpro_order_no,
         o.options_json,
         o.shipping_json,
         o.created_at,
         o.updated_at,
         p.display_name AS parent_name,
         m.source_image_key,
         m.check_result_json
       FROM orders o
       JOIN parents p ON p.id = o.parent_id
       JOIN models_3d m ON m.id = o.model_id
       ORDER BY o.created_at DESC
       LIMIT 50`,
    ).all<{
      id: string;
      amount: number;
      status: string;
      wow3dpro_order_no: string | null;
      options_json: string;
      shipping_json: string | null;
      created_at: string;
      updated_at: string;
      parent_name: string;
      source_image_key: string;
      check_result_json: string | null;
    }>(),
  ]);

  const safeJson = <T>(raw: string | null, fallback: T): T => {
    try {
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  return json({
    stats: counts ?? {
      total_parents: 0,
      total_books: 0,
      published_listings: 0,
      open_reports: 0,
      active_orders: 0,
    },
    reports: reportsRes.results,
    orders: ordersRes.results.map((o) => ({
      id: o.id,
      amount: o.amount,
      status: o.status,
      wow3dpro_order_no: o.wow3dpro_order_no,
      created_at: o.created_at,
      updated_at: o.updated_at,
      parent_name: o.parent_name,
      source_image_key: o.source_image_key,
      options: safeJson(o.options_json, { sizeCm: 8, material: 'fdm', materialLabel: 'PLA' }),
      shipping: safeJson(o.shipping_json, { recipient: '', phone: '', address: '' }),
      modelMeta: safeJson(o.check_result_json, { figureName: '피규어', supportNote: '검수 대기' }),
    })),
  });
};

/**
 * POST /api/admin/overview
 * 운영자 액션:
 * 1) action = 'resolve_report' -> 신고 블라인드 확정 또는 기각(복구)
 * 2) action = 'advance_order'  -> 주문 공정 단계 변경 + 배송/검수 이벤트 기록
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  await ensureMarketSchema(env);

  let body: {
    action?: 'resolve_report' | 'advance_order';
    reportId?: string;
    decision?: 'blind' | 'dismiss';
    orderId?: string;
    nextStatus?: string;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return error('잘못된 요청 형식입니다');
  }

  const now = new Date().toISOString();

  if (body.action === 'resolve_report') {
    if (!body.reportId || (body.decision !== 'blind' && body.decision !== 'dismiss')) {
      return error('신고 처리 정보가 올바르지 않아요');
    }
    const rep = await env.DB.prepare(`SELECT id, listing_id FROM market_reports WHERE id = ?`)
      .bind(body.reportId)
      .first<{ id: string; listing_id: string }>();
    if (!rep) return error('신고 내역을 찾을 수 없어요', 404);

    const nextReportStatus = body.decision === 'blind' ? 'actioned' : 'dismissed';
    const nextListingStatus = body.decision === 'blind' ? 'hidden' : 'published';

    await env.DB.batch([
      env.DB.prepare(`UPDATE market_reports SET status = ?, resolved_at = ? WHERE listing_id = ? AND status = 'open'`).bind(
        nextReportStatus,
        now,
        rep.listing_id,
      ),
      env.DB.prepare(`UPDATE market_listings SET status = ?, updated_at = ? WHERE id = ?`).bind(
        nextListingStatus,
        now,
        rep.listing_id,
      ),
    ]);

    return json({ ok: true, listingStatus: nextListingStatus });
  }

  if (body.action === 'advance_order') {
    if (!body.orderId || !body.nextStatus || !VALID_ORDER_STATUSES.includes(body.nextStatus as never)) {
      return error('변경할 주문 상태가 올바르지 않아요');
    }
    const note = (body.note ?? '').trim() || ORDER_STATUS_DEFAULT_NOTE[body.nextStatus] || '상태가 변경되었어요.';
    await env.DB.batch([
      env.DB.prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).bind(body.nextStatus, now, body.orderId),
      env.DB.prepare(`INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)`).bind(
        body.orderId,
        body.nextStatus,
        note,
        now,
      ),
    ]);
    return json({ ok: true, nextStatus: body.nextStatus });
  }

  return error('알 수 없는 관리자 명령입니다');
};

