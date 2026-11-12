import type { Env } from '../../../_lib/env';
import { audit, requireAdmin } from '../../../_lib/admin';
import {
  batchRewritePublish,
  countPendingPublish,
  enqueueAndImport,
  enqueuePilotPack,
  ensureCatalogSchema,
  listCatalogSources,
  presentCatalogSource,
  publishSource,
  rejectSource,
  rewriteSource,
  searchCatalog,
  startPilotPublish,
  type AgeBand,
  type CatalogProvider,
  type CatalogSearchHit,
} from '../../../_lib/ingest';
import { error, json } from '../../../_lib/http';
import { storyMode } from '../../../_lib/story';

/** 운영자: 고전 동화 인제스트 큐 목록 + AI 모드 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireAdmin(request, env);
  if (me instanceof Response) return me;

  await ensureCatalogSchema(env);
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const sources = await listCatalogSources(env, { status, limit: 100 });
  const counts = await env.DB.prepare(
    `SELECT status, COUNT(*) AS cnt FROM catalog_sources GROUP BY status`,
  ).all<{ status: string; cnt: number }>();

  return json({
    storyMode: storyMode(env),
    counts: Object.fromEntries((counts.results ?? []).map((r) => [r.status, r.cnt])),
    sources: sources.map(presentCatalogSource),
    pilotCount: 12,
    pendingPublish: await countPendingPublish(env),
  });
};

type Body = {
  action?: string;
  provider?: CatalogProvider | 'all';
  q?: string;
  category?: string;
  limit?: number;
  sourceId?: string;
  note?: string;
  ageBand?: AgeBand;
  hit?: CatalogSearchHit;
  batchLimit?: number;
};

/** 운영자: 검색 · 가져오기 · 변환 · 도서관 게시 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await requireAdmin(request, env);
  if (me instanceof Response) return me;

  await ensureCatalogSchema(env);
  const body = (await request.json().catch(() => ({}))) as Body;
  const action = typeof body.action === 'string' ? body.action : '';

  try {
    if (action === 'search') {
      const provider = body.provider === 'gutendex' || body.provider === 'childrenstory' || body.provider === 'all' ? body.provider : 'childrenstory';
      const result = await searchCatalog(provider, {
        q: typeof body.q === 'string' ? body.q : undefined,
        category: typeof body.category === 'string' ? body.category : undefined,
        limit: typeof body.limit === 'number' ? body.limit : 40,
      });
      await audit(env, me.id, 'catalog.search', `${provider} q=${body.q ?? ''} hits=${result.hits.length}`);
      return json(result);
    }

    if (action === 'enqueue') {
      if (!body.hit?.provider || !body.hit.externalId || !body.hit.title) {
        return error('가져올 작품 정보가 부족해요');
      }
      const row = await enqueueAndImport(env, body.hit, {
        category: typeof body.category === 'string' ? body.category : body.hit.categoryHint,
        ageBand: body.ageBand === '3-5' || body.ageBand === '9-12' || body.ageBand === '6-8' ? body.ageBand : '6-8',
      });
      await audit(env, me.id, 'catalog.enqueue', `${row.provider}:${row.external_id}`);
      return json({ source: presentCatalogSource(row) }, 201);
    }

    if (action === 'pilot') {
      const pack = await enqueuePilotPack(env);
      await audit(env, me.id, 'catalog.pilot', `imported=${pack.imported.length}`);
      return json({
        imported: pack.imported.map(presentCatalogSource),
        skipped: pack.skipped,
        warnings: pack.warnings,
      });
    }

    if (action === 'pilot_publish') {
      const pack = await startPilotPublish(env);
      await audit(
        env,
        me.id,
        'catalog.pilot_publish',
        `imported=${pack.imported.length} published=${pack.batch.published.length} remaining=${pack.batch.remaining}`,
      );
      return json({
        imported: pack.imported.map(presentCatalogSource),
        skipped: pack.skipped,
        warnings: pack.warnings,
        published: pack.batch.published.map(presentCatalogSource),
        failed: pack.batch.failed,
        remaining: pack.batch.remaining,
      });
    }

    if (action === 'batch_publish') {
      const limit = typeof body.batchLimit === 'number' ? body.batchLimit : undefined;
      const batch = await batchRewritePublish(env, { limit });
      await audit(
        env,
        me.id,
        'catalog.batch_publish',
        `published=${batch.published.length} failed=${batch.failed.length} remaining=${batch.remaining}`,
      );
      return json({
        published: batch.published.map(presentCatalogSource),
        failed: batch.failed,
        remaining: batch.remaining,
      });
    }

    if (action === 'rewrite') {
      if (!body.sourceId) return error('sourceId 가 필요해요');
      const { source, book } = await rewriteSource(env, body.sourceId);
      await audit(env, me.id, 'catalog.rewrite', source.id);
      return json({ source: presentCatalogSource(source), preview: book });
    }

    if (action === 'publish') {
      if (!body.sourceId) return error('sourceId 가 필요해요');
      const source = await publishSource(env, body.sourceId);
      await audit(env, me.id, 'catalog.publish', `${source.id} → ${source.listing_id}`);
      return json({ source: presentCatalogSource(source) });
    }

    if (action === 'reject') {
      if (!body.sourceId) return error('sourceId 가 필요해요');
      const source = await rejectSource(env, body.sourceId, typeof body.note === 'string' ? body.note : undefined);
      await audit(env, me.id, 'catalog.reject', source.id);
      return json({ source: presentCatalogSource(source) });
    }

    if (action === 'rewrite_publish') {
      if (!body.sourceId) return error('sourceId 가 필요해요');
      await rewriteSource(env, body.sourceId);
      const source = await publishSource(env, body.sourceId);
      await audit(env, me.id, 'catalog.rewrite_publish', `${source.id} → ${source.listing_id}`);
      return json({ source: presentCatalogSource(source) });
    }

    return error('알 수 없는 작업이에요');
  } catch (e) {
    const msg = e instanceof Error ? e.message : '처리하지 못했어요';
    return error(msg, 502);
  }
};
