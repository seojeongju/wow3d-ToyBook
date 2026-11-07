import type { Env } from '../../_lib/env';
import { error, json, newId, requireParent } from '../../_lib/http';
import { checkParentPinForAction, ensureMarketSchema } from '../../_lib/market';

interface ModelCheckMeta {
  figureId: string;
  figureName: string;
  role: string;
  sizeCm: number;
  printable: boolean;
  minWallMm: number;
  overhangOk: boolean;
  supportNote: string;
}

async function ensureStarterModels(env: Env, parentId: string): Promise<void> {
  const existing = await env.DB.prepare(`SELECT COUNT(*) AS cnt FROM models_3d WHERE parent_id = ?`)
    .bind(parentId)
    .first<{ cnt: number }>();
  if ((existing?.cnt ?? 0) > 0) return;

  const prefix = parentId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'fam';
  const starters: { suffix: string; image: string; meta: ModelCheckMeta }[] = [
    {
      suffix: 'star',
      image: '/hero-art.jpg',
      meta: {
        figureId: 'star',
        figureName: '반짝 별곰',
        role: '토이북 마스코트',
        sizeCm: 8,
        printable: true,
        minWallMm: 2.4,
        overhangOk: true,
        supportNote: '자동 출력 가능성 검사 통과 (받침대 일체형 안정 구조)',
      },
    },
    {
      suffix: 'fairy',
      image: '/hero-fairy.jpg',
      meta: {
        figureId: 'fairy',
        figureName: '치카 요정',
        role: '반짝 습관 요정',
        sizeCm: 8,
        printable: true,
        minWallMm: 1.9,
        overhangOk: true,
        supportNote: '날개 끝 0.4mm 보강 완료 · 레진/풀컬러 권장',
      },
    },
  ];

  await env.DB.batch(
    starters.map((s) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO models_3d
         (id, parent_id, source_image_key, glb_key, print_file_key, check_result_json, provider, status)
         VALUES (?, ?, ?, ?, ?, ?, 'wow3d-clay-mesh', 'ready')`,
      ).bind(
        `m3d-${prefix}-${s.suffix}`,
        parentId,
        s.image,
        `mesh/${s.meta.figureId}.glb`,
        `print/${s.meta.figureId}_checked.3mf`,
        JSON.stringify(s.meta),
      ),
    ),
  );
}

/**
 * GET /api/wishes
 * 우리 가족의 3D 모델 보관함(models_3d) + 아이들의 '갖고 싶어요' 요청(wishes) 목록 조회
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);
  await ensureStarterModels(env, parentId);

  const [modelsRes, wishesRes] = await Promise.all([
    env.DB.prepare(
      `SELECT id, book_id, character_id, source_image_key, glb_key, print_file_key, check_result_json, provider, status, created_at
       FROM models_3d
       WHERE parent_id = ?
       ORDER BY created_at DESC`,
    )
      .bind(parentId)
      .all<{
        id: string;
        book_id: string | null;
        character_id: string | null;
        source_image_key: string;
        glb_key: string | null;
        print_file_key: string | null;
        check_result_json: string | null;
        provider: string | null;
        status: string;
        created_at: string;
      }>(),
    env.DB.prepare(
      `SELECT
         w.id,
         w.child_id,
         w.model_id,
         w.status,
         w.created_at,
         w.decided_at,
         c.nickname AS child_nickname,
         c.avatar AS child_avatar,
         m.source_image_key,
         m.check_result_json
       FROM wishes w
       JOIN models_3d m ON m.id = w.model_id
       LEFT JOIN children c ON c.id = w.child_id
       WHERE m.parent_id = ?
       ORDER BY CASE WHEN w.status = 'pending' THEN 0 ELSE 1 END, w.created_at DESC`,
    )
      .bind(parentId)
      .all<{
        id: string;
        child_id: string;
        model_id: string;
        status: 'pending' | 'approved' | 'rejected';
        created_at: string;
        decided_at: string | null;
        child_nickname: string | null;
        child_avatar: string | null;
        source_image_key: string;
        check_result_json: string | null;
      }>(),
  ]);

  const parseMeta = (raw: string | null): ModelCheckMeta => {
    try {
      if (raw) return JSON.parse(raw) as ModelCheckMeta;
    } catch {
      /* ignore */
    }
    return {
      figureId: 'star',
      figureName: '반짝 별곰',
      role: '토이북 캐릭터',
      sizeCm: 8,
      printable: true,
      minWallMm: 2.2,
      overhangOk: true,
      supportNote: '자동 출력 가능성 검사 통과',
    };
  };

  return json({
    models: modelsRes.results.map((m) => ({
      ...m,
      meta: parseMeta(m.check_result_json),
    })),
    wishes: wishesRes.results.map((w) => ({
      id: w.id,
      child_id: w.child_id,
      model_id: w.model_id,
      status: w.status,
      created_at: w.created_at,
      decided_at: w.decided_at,
      child_nickname: w.child_nickname ?? '우리 아이',
      child_avatar: w.child_avatar ?? '🐻',
      source_image_key: w.source_image_key,
      meta: parseMeta(w.check_result_json),
    })),
  });
};

/**
 * POST /api/wishes
 * 아이 책장의 '장난감 공장'에서 3D 피규어 찜하기 요청 등록 (또는 새 3D 캐릭터 모델 변환 생성)
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  await ensureMarketSchema(env);

  let body: {
    childId?: string | null;
    figureId?: string;
    figureName?: string;
    figureImage?: string;
    role?: string;
    sizeCm?: number;
    createWish?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return error('잘못된 요청 형식입니다');
  }

  const figureId = (body.figureId ?? 'star').trim();
  const figureName = (body.figureName ?? '반짝 별곰').trim().slice(0, 30);
  const figureImage = (body.figureImage ?? '/hero-art.jpg').trim();
  const role = (body.role ?? '토이북 동화 친구').trim().slice(0, 30);
  const sizeCm = body.sizeCm === 5 || body.sizeCm === 12 ? body.sizeCm : 8;

  const meta: ModelCheckMeta = {
    figureId,
    figureName,
    role,
    sizeCm,
    printable: true,
    minWallMm: sizeCm === 5 ? 1.8 : 2.3,
    overhangOk: true,
    supportNote:
      sizeCm === 5
        ? '5cm 소형 출력용 세밀 부위 자동 두껍게 보강 완료'
        : '무독성 어린이 안전 라운딩 및 출력 가능성 검사 통과',
  };

  // 동일 캐릭터+사이즈 3D 모델이 있으면 재사용, 없으면 새로 생성
  const existingModels = await env.DB.prepare(
    `SELECT id, check_result_json FROM models_3d WHERE parent_id = ? AND source_image_key = ?`,
  )
    .bind(parentId, figureImage)
    .all<{ id: string; check_result_json: string | null }>();

  let modelId = existingModels.results.find((m) => {
    try {
      const parsed = m.check_result_json ? JSON.parse(m.check_result_json) : null;
      return parsed?.figureId === figureId && parsed?.sizeCm === sizeCm;
    } catch {
      return false;
    }
  })?.id;

  if (!modelId) {
    modelId = newId();
    await env.DB.prepare(
      `INSERT INTO models_3d
       (id, parent_id, source_image_key, glb_key, print_file_key, check_result_json, provider, status)
       VALUES (?, ?, ?, ?, ?, ?, 'wow3d-clay-mesh', 'ready')`,
    )
      .bind(
        modelId,
        parentId,
        figureImage,
        `mesh/${figureId}.glb`,
        `print/${figureId}_${sizeCm}cm.3mf`,
        JSON.stringify(meta),
      )
      .run();
  }

  let wishId: string | null = null;
  if (body.createWish !== false) {
    // 유효한 아이 ID 확인 (없으면 가족 첫 번째 아이 또는 기본 데모 아이 연결)
    let resolvedChildId: string | null = null;
    if (body.childId) {
      const found = await env.DB.prepare(`SELECT id FROM children WHERE id = ?`).bind(body.childId).first<{ id: string }>();
      if (found) resolvedChildId = found.id;
    }
    if (!resolvedChildId) {
      const firstChild = await env.DB.prepare(`SELECT id FROM children WHERE parent_id = ? ORDER BY created_at ASC LIMIT 1`)
        .bind(parentId)
        .first<{ id: string }>();
      resolvedChildId = firstChild?.id ?? 'c-demo';
    }

    const dupWish = await env.DB.prepare(
      `SELECT id FROM wishes WHERE child_id = ? AND model_id = ? AND status = 'pending' LIMIT 1`,
    )
      .bind(resolvedChildId, modelId)
      .first<{ id: string }>();

    if (dupWish) {
      wishId = dupWish.id;
    } else {
      wishId = newId();
      await env.DB.prepare(`INSERT INTO wishes (id, child_id, model_id, status) VALUES (?, ?, ?, 'pending')`)
        .bind(wishId, resolvedChildId, modelId)
        .run();
    }
  }

  return json({ ok: true, modelId, wishId });
};

/**
 * PATCH /api/wishes
 * 부모가 아이의 '갖고 싶어요' 요청을 승인(approved)하거나 보류/거절(rejected) 처리
 */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const pinBlock = await checkParentPinForAction(request, env);
  if (pinBlock) return pinBlock;

  let body: { wishId?: string; status?: 'approved' | 'rejected' };
  try {
    body = await request.json();
  } catch {
    return error('잘못된 요청 형식입니다');
  }

  if (!body.wishId || (body.status !== 'approved' && body.status !== 'rejected')) {
    return error('처리할 요청 정보가 올바르지 않아요');
  }

  const target = await env.DB.prepare(
    `SELECT w.id
     FROM wishes w
     JOIN models_3d m ON m.id = w.model_id
     WHERE w.id = ? AND m.parent_id = ?`,
  )
    .bind(body.wishId, parentId)
    .first<{ id: string }>();

  if (!target) return error('요청 내역을 찾을 수 없어요', 404);

  await env.DB.prepare(`UPDATE wishes SET status = ?, decided_at = ? WHERE id = ?`)
    .bind(body.status, new Date().toISOString(), body.wishId)
    .run();

  return json({ ok: true });
};

