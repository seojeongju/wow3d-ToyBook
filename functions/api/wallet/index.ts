import type { Env } from '../../_lib/env';
import { error, json, requireParent } from '../../_lib/http';
import {
  checkParentPinForAction,
  ensureMarketSchema,
  getOrInitWallet,
  recordWalletTx,
} from '../../_lib/market';

export interface CoinPackage {
  id: string;
  coins: number;
  bonus: number;
  priceKrw: number;
  label: string;
  badge?: string;
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'coin_1000',
    coins: 1000,
    bonus: 0,
    priceKrw: 1000,
    label: '별 코인 1,000개 소풍팩',
  },
  {
    id: 'coin_3000',
    coins: 3300,
    bonus: 300,
    priceKrw: 3000,
    label: '별 코인 3,300개 모험팩',
    badge: '+10% 보너스',
  },
  {
    id: 'coin_5000',
    coins: 6000,
    bonus: 1000,
    priceKrw: 5000,
    label: '별 코인 6,000개 작가팩',
    badge: '인기 · +20% 보너스',
  },
];

/**
 * GET /api/wallet
 * 현재 보유 별 코인 잔액, 누적 창작 수익, 최근 거래 내역(원장), 충전 패키지 목록 반환
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  const wallet = await getOrInitWallet(env, parentId);

  const txRes = await env.DB.prepare(
    `SELECT id, delta, balance_after, kind, title, ref_id, created_at
     FROM wallet_transactions
     WHERE parent_id = ?
     ORDER BY created_at DESC
     LIMIT 40`,
  )
    .bind(parentId)
    .all<{
      id: string;
      delta: number;
      balance_after: number;
      kind: string;
      title: string;
      ref_id: string | null;
      created_at: string;
    }>();

  return json({
    wallet,
    transactions: txRes.results,
    packages: COIN_PACKAGES,
    portoneStoreId: env.PORTONE_STORE_ID ?? null,
  });
};

/**
 * POST /api/wallet
 * 부모 승인 후 별 코인 패키지 충전 (포트원 결제 검증 지원 + 보호자 승인 즉시 충전 호환)
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const pinBlock = await checkParentPinForAction(request, env);
  if (pinBlock) return pinBlock;

  await ensureMarketSchema(env);

  let body: { packageId?: string; paymentId?: string };
  try {
    body = await request.json();
  } catch {
    return error('잘못된 요청 형식입니다');
  }

  const pkg = COIN_PACKAGES.find((p) => p.id === body.packageId);
  if (!pkg) return error('올바른 충전 패키지를 선택해 주세요');

  // 포트원 결제 ID 와 시크릿이 모두 있을 때는 실제 포트원 V2 결제 단건 검증 수행
  if (body.paymentId && env.PORTONE_API_SECRET) {
    const verifyRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(body.paymentId)}`, {
      headers: { Authorization: `PortOne ${env.PORTONE_API_SECRET}` },
    });
    if (!verifyRes.ok) {
      return error('결제 내역을 확인하지 못했어요. 잠시 후 다시 시도해 주세요', 402);
    }
    const payment = (await verifyRes.json()) as { status?: string; amount?: { total?: number } };
    if (payment.status !== 'PAID' || payment.amount?.total !== pkg.priceKrw) {
      return error('결제 금액 또는 상태가 일치하지 않아요', 402);
    }
  }

  const wallet = await recordWalletTx(env, {
    parentId,
    delta: pkg.coins,
    kind: 'topup',
    title: `⚡ ${pkg.label} 충전`,
    refId: body.paymentId ?? pkg.id,
  });

  return json({
    ok: true,
    added: pkg.coins,
    wallet,
  });
};

