import type { Env } from '../../_lib/env';
import { error, json, newId, requireParent } from '../../_lib/http';
import {
  checkParentPinForAction,
  ensureMarketSchema,
  getOrInitWallet,
  recordWalletTx,
} from '../../_lib/market';

export type FigureMaterial = 'fdm' | 'resin' | 'fullcolor';

const SIZE_PRICE_KRW: Record<5 | 8 | 12, number> = {
  5: 19000,
  8: 29000,
  12: 45000,
};

const MATERIAL_ADDON_KRW: Record<FigureMaterial, { addKrw: number; label: string }> = {
  fdm: { addKrw: 0, label: '친환경 PLA 단색 (DIY 색칠 키트 포함)' },
  resin: { addKrw: 8000, label: '고정밀 스무스 레진 (아이보리 파스텔)' },
  fullcolor: { addKrw: 16000, label: '프리미엄 풀컬러 아트토이 마감' },
};

/**
 * GET /api/orders
 * 부모 계정의 실물 3D 피규어 주문·배송 내역 및 단계별 이벤트 로그 조회
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  const wallet = await getOrInitWallet(env, parentId);

  const ordersRes = await env.DB.prepare(
    `SELECT
       o.id,
       o.model_id,
       o.wish_id,
       o.options_json,
       o.amount,
       o.status,
       o.payment_id,
       o.wow3dpro_order_no,
       o.shipping_json,
       o.created_at,
       o.updated_at,
       m.source_image_key,
       m.check_result_json
     FROM orders o
     JOIN models_3d m ON m.id = o.model_id
     WHERE o.parent_id = ?
     ORDER BY o.created_at DESC`,
  )
    .bind(parentId)
    .all<{
      id: string;
      model_id: string;
      wish_id: string | null;
      options_json: string;
      amount: number;
      status: string;
      payment_id: string | null;
      wow3dpro_order_no: string | null;
      shipping_json: string | null;
      created_at: string;
      updated_at: string;
      source_image_key: string;
      check_result_json: string | null;
    }>();

  const eventsRes = await env.DB.prepare(
    `SELECT e.order_id, e.status, e.note, e.created_at
     FROM order_events e
     JOIN orders o ON o.id = e.order_id
     WHERE o.parent_id = ?
     ORDER BY e.id ASC`,
  )
    .bind(parentId)
    .all<{ order_id: string; status: string; note: string | null; created_at: string }>();

  const eventMap = new Map<string, { status: string; note: string | null; created_at: string }[]>();
  for (const ev of eventsRes.results) {
    const arr = eventMap.get(ev.order_id) ?? [];
    arr.push({ status: ev.status, note: ev.note, created_at: ev.created_at });
    eventMap.set(ev.order_id, arr);
  }

  const safeJson = <T>(raw: string | null, fallback: T): T => {
    try {
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  return json({
    wallet,
    orders: ordersRes.results.map((o) => ({
      id: o.id,
      model_id: o.model_id,
      wish_id: o.wish_id,
      amount: o.amount,
      status: o.status,
      wow3dpro_order_no: o.wow3dpro_order_no,
      created_at: o.created_at,
      updated_at: o.updated_at,
      source_image_key: o.source_image_key,
      options: safeJson(o.options_json, { sizeCm: 8, material: 'fdm', materialLabel: '친환경 PLA', payMethod: 'coins', coinUsed: 0 }),
      shipping: safeJson(o.shipping_json, { recipient: '', phone: '', address: '', memo: '' }),
      modelMeta: safeJson(o.check_result_json, { figureName: '토이북 피규어', role: '3D 캐릭터' }),
      events: eventMap.get(o.id) ?? [],
    })),
  });
};

/**
 * POST /api/orders
 * 부모 승인 후 3D 피규어 제작 주문 생성 (wow3d 주문번호 발급 + 별 코인/결제 처리 + 이벤트 기록)
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const pinBlock = await checkParentPinForAction(request, env);
  if (pinBlock) return pinBlock;

  await ensureMarketSchema(env);

  let body: {
    modelId?: string;
    wishId?: string | null;
    sizeCm?: 5 | 8 | 12;
    material?: FigureMaterial;
    payMethod?: 'coins' | 'card';
    recipient?: string;
    phone?: string;
    address?: string;
    memo?: string;
  };
  try {
    body = await request.json();
  } catch {
    return error('잘못된 요청 형식입니다');
  }

  if (!body.modelId) return error('주문할 3D 모델을 선택해 주세요');

  const model = await env.DB.prepare(
    `SELECT id, check_result_json FROM models_3d WHERE id = ? AND parent_id = ?`,
  )
    .bind(body.modelId, parentId)
    .first<{ id: string; check_result_json: string | null }>();
  if (!model) return error('선택한 3D 모델을 찾을 수 없어요', 404);

  const recipient = (body.recipient ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const address = (body.address ?? '').trim();
  const memo = (body.memo ?? '').trim().slice(0, 120);

  if (recipient.length < 2) return error('받는 분 성함을 입력해 주세요');
  if (phone.length < 8) return error('연락처를 정확히 입력해 주세요');
  if (address.length < 5) return error('배송 받을 주소를 입력해 주세요');

  const sizeCm: 5 | 8 | 12 = body.sizeCm === 5 || body.sizeCm === 12 ? body.sizeCm : 8;
  const material: FigureMaterial =
    body.material === 'resin' || body.material === 'fullcolor' ? body.material : 'fdm';
  const payMethod: 'coins' | 'card' = body.payMethod === 'card' ? 'card' : 'coins';

  const amountKrw = SIZE_PRICE_KRW[sizeCm] + MATERIAL_ADDON_KRW[material].addKrw;
  const coinCost = Math.round(amountKrw / 10);

  let figureName = '토이북 캐릭터';
  try {
    const parsed = model.check_result_json ? JSON.parse(model.check_result_json) : null;
    if (parsed?.figureName) figureName = parsed.figureName;
  } catch {
    /* ignore */
  }

  let wallet = await getOrInitWallet(env, parentId);
  const orderId = newId();
  const orderNo = `WOW-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (payMethod === 'coins') {
    if (wallet.balance < coinCost) {
      return error(
        `별 코인이 부족해요. (필요: ${coinCost.toLocaleString()} 코인 / 보유: ${wallet.balance.toLocaleString()} 코인 · 충전소에서 충전하거나 일반 결제를 선택해 주세요)`,
        400,
      );
    }
    wallet = await recordWalletTx(env, {
      parentId,
      delta: -coinCost,
      kind: 'figure_order',
      title: `🎁 '${figureName}' ${sizeCm}cm 3D 피규어 제작 주문`,
      refId: orderId,
    });
  }

  const now = new Date().toISOString();
  const optionsJson = JSON.stringify({
    sizeCm,
    material,
    materialLabel: MATERIAL_ADDON_KRW[material].label,
    payMethod,
    coinUsed: payMethod === 'coins' ? coinCost : 0,
  });
  const shippingJson = JSON.stringify({ recipient, phone, address, memo });

  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO orders
       (id, parent_id, model_id, wish_id, options_json, amount, status, payment_id, wow3dpro_order_no, shipping_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?)`,
    ).bind(
      orderId,
      parentId,
      model.id,
      body.wishId ?? null,
      optionsJson,
      amountKrw,
      payMethod === 'coins' ? `COIN-${orderId.slice(0, 8)}` : `CARD-${orderId.slice(0, 8)}`,
      orderNo,
      shippingJson,
      now,
      now,
    ),
    env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, created_at)
       VALUES (?, 'paid', ?, ?)`,
    ).bind(orderId, `주문이 접수되었어요 (${orderNo}) · wow3d 엔지니어 출력 가능성 검수 대기 중`, now),
  ];

  if (body.wishId) {
    stmts.push(
      env.DB.prepare(`UPDATE wishes SET status = 'approved', decided_at = ? WHERE id = ?`).bind(now, body.wishId),
    );
  }

  await env.DB.batch(stmts);

  return json({
    ok: true,
    orderId,
    orderNo,
    amountKrw,
    coinUsed: payMethod === 'coins' ? coinCost : 0,
    wallet,
  });
};

