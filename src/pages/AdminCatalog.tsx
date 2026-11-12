import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  adminApi,
  type CatalogOverview,
  type CatalogSearchHit,
  type CatalogSourceView,
} from '../api';
import { ApiError, lockParentMode } from '../auth';
import AdminGate from '../components/AdminGate';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import DashLayout from '../components/DashLayout';
import Tobi from '../components/Tobi';
import { ADMIN_MENU } from './AdminDashboard';

interface BatchProgress {
  totalStarted: number;
  published: number;
  failed: number;
  remaining: number;
  lastTitles: string[];
  errors: string[];
  running: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  discovered: '발견',
  imported: '원문 확보',
  rewritten: '한국어 변환',
  published: '도서관 게시',
  rejected: '반려',
  error: '오류',
};

const PROVIDER_LABEL: Record<string, string> = {
  childrenstory: 'ChildrenStory',
  gutendex: 'Gutendex',
};

/** 운영자 · 퍼블릭 도메인 고전 동화를 도서관 카탈로그로 가져오기 */
export default function AdminCatalog() {
  return <AdminGate>{(me) => <CatalogHome name={me.name} />}</AdminGate>;
}

function CatalogHome({ name }: { name: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<CatalogOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [provider, setProvider] = useState<'childrenstory' | 'gutendex' | 'all'>('childrenstory');
  const [query, setQuery] = useState('mouse');
  const [category, setCategory] = useState('fables');
  const [hits, setHits] = useState<CatalogSearchHit[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ title: string; summary: string; pages: { text: string }[] } | null>(null);
  const [batch, setBatch] = useState<BatchProgress | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await adminApi.catalog());
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 423) return navigate(0);
      setError(e instanceof Error ? e.message : '불러오지 못했어요');
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const run = async (key: string, job: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    setError(null);
    try {
      await job();
      if (ok) setNotice(ok);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 423) return navigate(0);
      setError(e instanceof Error ? e.message : '처리하지 못했어요');
    } finally {
      setBusy(null);
    }
  };

  /** 서버가 소량씩 처리하므로, remaining 이 0 될 때까지 배치를 반복 */
  const drainBatch = async (seed?: { published: number; failed: number; remaining: number; titles: string[]; errors: string[] }) => {
    let published = seed?.published ?? 0;
    let failed = seed?.failed ?? 0;
    let remaining = seed?.remaining ?? 1;
    const titles = [...(seed?.titles ?? [])];
    const errors = [...(seed?.errors ?? [])];
    const totalStarted = Math.max(published + failed + remaining, 1);

    setBatch({ totalStarted, published, failed, remaining, lastTitles: titles.slice(-5), errors: errors.slice(-5), running: true });

    while (remaining > 0) {
      const res = await adminApi.catalogBatchPublish();
      published += res.published.length;
      failed += res.failed.length;
      remaining = res.remaining;
      for (const s of res.published) titles.push(s.titleKo || s.titleOriginal);
      for (const f of res.failed) errors.push(`${f.title}: ${f.error}`);
      setBatch({
        totalStarted: Math.max(totalStarted, published + failed + remaining),
        published,
        failed,
        remaining,
        lastTitles: titles.slice(-5),
        errors: errors.slice(-5),
        running: remaining > 0,
      });
      if (res.published.length === 0 && res.failed.length === 0 && remaining > 0) break;
    }

    setBatch((prev) => (prev ? { ...prev, running: false } : prev));
    await load();
    setNotice(`도서관 게시 완료 · 성공 ${published}권` + (failed ? ` · 실패 ${failed}권` : ''));
  };

  const runPilotPublish = () =>
    run('pilot_publish', async () => {
      const res = await adminApi.catalogPilotPublish();
      setWarnings([...res.warnings, ...(res.skipped.length ? [`목록에 없음: ${res.skipped.join(', ')}`] : [])]);
      if (res.remaining > 0) {
        await drainBatch({
          published: res.published.length,
          failed: res.failed.length,
          remaining: res.remaining,
          titles: res.published.map((s) => s.titleKo || s.titleOriginal),
          errors: res.failed.map((f) => `${f.title}: ${f.error}`),
        });
      } else {
        setBatch({
          totalStarted: res.published.length + res.failed.length,
          published: res.published.length,
          failed: res.failed.length,
          remaining: 0,
          lastTitles: res.published.map((s) => s.titleKo || s.titleOriginal).slice(-5),
          errors: res.failed.map((f) => `${f.title}: ${f.error}`),
          running: false,
        });
        setNotice(`추천 팩 게시 완료 · 성공 ${res.published.length}권` + (res.failed.length ? ` · 실패 ${res.failed.length}권` : ''));
      }
    });

  const runPendingPublish = () =>
    run('batch_all', async () => {
      const pending = data?.pendingPublish ?? 0;
      if (pending <= 0) {
        setNotice('게시 대기 중인 작품이 없어요');
        return;
      }
      await drainBatch({ published: 0, failed: 0, remaining: pending, titles: [], errors: [] });
    });

  const search = () =>
    run('search', async () => {
      const res = await adminApi.catalogSearch({
        provider,
        q: query.trim() || undefined,
        category: provider === 'childrenstory' ? category || undefined : undefined,
        limit: 40,
      });
      setHits(res.hits);
      setWarnings(res.warnings);
      setNotice(`${res.hits.length}권을 찾았어요`);
    });

  const enqueue = (hit: CatalogSearchHit) =>
    run(`en-${hit.provider}-${hit.externalId}`, async () => {
      await adminApi.catalogEnqueue(hit);
    }, `'${hit.title}' 원문을 가져왔어요`);

  const sources = data?.sources ?? [];
  const pending = data?.pendingPublish ?? 0;
  const doneCount = (data?.counts?.published ?? 0) + (batch?.published ?? 0);
  const batchPct =
    batch && batch.totalStarted > 0
      ? Math.min(100, Math.round(((batch.published + batch.failed) / batch.totalStarted) * 100))
      : 0;

  return (
    <DashLayout
      title="고전 동화 인제스트"
      profile={{ avatar: <Tobi pose="peek" size={76} />, name: `${name}님`, sub: '도서관 큐레이션 운영자' }}
      menu={ADMIN_MENU}
      active={ADMIN_MENU.findIndex((m) => m.to === '/admin/catalog')}
      onLogout={() => {
        lockParentMode();
        navigate('/');
      }}
    >
      {notice && <p className="demo-banner catalog-ok">{notice}</p>}
      {error && <p className="demo-banner catalog-err">{error}</p>}

      <section className="dash-card catalog-intro">
        <h2>
          <ClayArt name="book" size={30} /> 퍼블릭 도메인만, 다시 써서 도서관에
        </h2>
        <p>
          ChildrenStory·Gutendex에서 찾은 고전을 원문 그대로 올리지 않고, 토이북 점토 그림책으로 다시 쓴 뒤
          <strong> 모두의 도서관(무료)</strong>에 게시해요. 상용 ebook·회원제 도서관 원문은 쓰지 않아요.
        </p>
        <p className="catalog-mode">
          AI 모드:{' '}
          <strong>
            {data?.storyMode === 'claude' ? 'Claude 변환' : data?.storyMode === 'dev' ? '로컬 시험용 변환' : '키 없음(변환 불가)'}
          </strong>
          {' · '}
          <Link to="/market?tab=library">도서관 바로가기</Link>
        </p>
        <div className="catalog-counts">
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <div key={key} className="catalog-count">
              <strong>{data?.counts?.[key] ?? 0}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dash-card">
        <header>
          <h3>1. 작품 검색 · 일괄 도서관 게시</h3>
          <div className="catalog-actions">
            <button type="button" className="pill-btn small-pill" disabled={busy !== null} onClick={runPilotPublish}>
              {busy === 'pilot_publish' || batch?.running ? '게시 진행 중…' : '추천 이솝 12권 → 도서관 게시'}
            </button>
            <button
              type="button"
              className="pill-btn small-pill alt"
              disabled={busy !== null || pending <= 0}
              onClick={runPendingPublish}
            >
              {busy === 'batch_all' || batch?.running ? '이어서 처리 중…' : `대기 ${pending}권 변환·게시`}
            </button>
            <button
              type="button"
              className="pill-btn small-pill ghost"
              disabled={busy !== null}
              onClick={() =>
                run('pilot', async () => {
                  const res = await adminApi.catalogPilot();
                  setNotice(
                    `파일럿 ${res.imported.length}권 원문만 확보` +
                      (res.warnings.length ? ` · 경고 ${res.warnings.length}` : ''),
                  );
                  if (res.warnings.length) setWarnings(res.warnings);
                })
              }
            >
              {busy === 'pilot' ? '가져오는 중…' : '원문만 가져오기'}
            </button>
          </div>
        </header>

        {batch && (
          <div className="catalog-batch" aria-live="polite">
            <div className="catalog-batch-bar">
              <span style={{ width: `${batchPct}%` }} />
            </div>
            <p>
              {batch.running ? '변환·게시 진행 중' : '배치 완료'} · 성공 {batch.published}권
              {batch.failed ? ` · 실패 ${batch.failed}권` : ''} · 남은 {batch.remaining}권
              {doneCount ? ` · 도서관 공개 누적 약 ${data?.counts?.published ?? 0}권` : ''}
            </p>
            {batch.lastTitles.length > 0 && (
              <p className="muted tiny">최근: {batch.lastTitles.join(' · ')}</p>
            )}
            {batch.errors.length > 0 && (
              <ul className="catalog-warn">
                {batch.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="catalog-search">
          <label>
            소스
            <select value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
              <option value="childrenstory">ChildrenStory (추천)</option>
              <option value="gutendex">Gutendex (보조)</option>
              <option value="all">둘 다</option>
            </select>
          </label>
          {provider !== 'gutendex' && (
            <label>
              분류
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">전체</option>
                <option value="fables">이솝 우화</option>
                <option value="fairy-tales">동화</option>
                <option value="nursery-rhymes">동요·동시</option>
              </select>
            </label>
          )}
          <label className="grow">
            검색어
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목·작가 (예: lion, aesop)" />
          </label>
          <button type="button" className="pill-btn" disabled={busy !== null} onClick={search}>
            {busy === 'search' ? '검색 중…' : '검색'}
          </button>
        </div>

        {warnings.length > 0 && (
          <ul className="catalog-warn">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        {hits.length > 0 && (
          <div className="catalog-hits">
            {hits.map((hit) => (
              <article key={`${hit.provider}-${hit.externalId}`} className="catalog-hit">
                <div>
                  <strong>{hit.title}</strong>
                  <p className="muted">
                    {PROVIDER_LABEL[hit.provider]} · {hit.authors.join(', ') || '작자 미상'}
                    {hit.wordCount ? ` · ${hit.wordCount}단어` : ''} · {hit.license}
                  </p>
                </div>
                <button
                  type="button"
                  className="pill-btn small-pill alt"
                  disabled={busy !== null || !hit.downloadUrl}
                  onClick={() => enqueue(hit)}
                >
                  {busy === `en-${hit.provider}-${hit.externalId}` ? '…' : '큐에 넣기'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dash-card">
        <header>
          <h3>2. 변환 · 도서관 게시 큐 ({sources.length})</h3>
          <button type="button" className="pill-btn alt small-pill" disabled={busy !== null} onClick={() => load()}>
            새로고침
          </button>
        </header>

        {sources.length === 0 ? (
          <div className="kids-empty">
            <ClayEmoji emoji="📚" size={72} />
            <p>아직 큐에 작품이 없어요. 위에서 검색하거나 추천 이솝 12권을 가져와 보세요.</p>
          </div>
        ) : (
          <div className="catalog-queue">
            {sources.map((s) => (
              <QueueCard
                key={s.id}
                source={s}
                busy={busy}
                onRewrite={() =>
                  run(`rw-${s.id}`, async () => {
                    const res = await adminApi.catalogRewrite(s.id);
                    setPreview(res.preview);
                    setNotice(`'${res.source.titleKo}' 변환 완료`);
                  })
                }
                onPublish={() => run(`pub-${s.id}`, async () => adminApi.catalogPublish(s.id), '도서관에 게시했어요')}
                onRewritePublish={() =>
                  run(`rp-${s.id}`, async () => adminApi.catalogRewritePublish(s.id), '변환 후 도서관에 올렸어요')
                }
                onReject={() => run(`rj-${s.id}`, async () => adminApi.catalogReject(s.id, '운영자 반려'), '반려했어요')}
              />
            ))}
          </div>
        )}
      </section>

      {preview && (
        <section className="dash-card">
          <header>
            <h3>최근 변환 미리보기 · {preview.title}</h3>
            <button type="button" className="pill-btn alt small-pill" onClick={() => setPreview(null)}>
              닫기
            </button>
          </header>
          <p>{preview.summary}</p>
          <ol className="catalog-preview">
            {preview.pages.map((p, i) => (
              <li key={i}>
                <span>{i + 1}쪽</span>
                <p>{p.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </DashLayout>
  );
}

function QueueCard({
  source: s,
  busy,
  onRewrite,
  onPublish,
  onRewritePublish,
  onReject,
}: {
  source: CatalogSourceView;
  busy: string | null;
  onRewrite: () => void;
  onPublish: () => void;
  onRewritePublish: () => void;
  onReject: () => void;
}) {
  return (
    <article className={`catalog-card status-${s.status}`}>
      <div className="catalog-card-top">
        <ClayEmoji emoji={s.coverEmoji || '📘'} size={48} />
        <div className="grow">
          <strong>{s.titleKo || s.titleOriginal}</strong>
          <p className="muted">
            {s.titleKo ? `${s.titleOriginal} · ` : ''}
            {PROVIDER_LABEL[s.provider]} · {STATUS_LABEL[s.status] || s.status}
          </p>
          <p className="muted tiny">
            {s.authorCredit || s.authors.join(', ')} · {s.category} · {s.ageBand}세
            {s.wordCount ? ` · ${s.wordCount}단어` : ''}
          </p>
        </div>
        <span className={`catalog-status ${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>
      </div>

      {s.excerptPreview && <p className="catalog-excerpt">{s.excerptPreview}</p>}
      {s.summaryKo && <p className="catalog-summary">{s.summaryKo}</p>}
      {s.errorNote && <p className="demo-banner catalog-err">{s.errorNote}</p>}

      <div className="catalog-actions">
        {(s.status === 'imported' || s.status === 'discovered' || s.status === 'error') && (
          <button type="button" className="pill-btn small-pill" disabled={busy !== null} onClick={onRewritePublish}>
            {busy === `rp-${s.id}` ? '처리 중…' : '변환 후 도서관 게시'}
          </button>
        )}
        {(s.status === 'imported' || s.status === 'error' || s.status === 'rewritten') && (
          <button type="button" className="pill-btn small-pill alt" disabled={busy !== null} onClick={onRewrite}>
            {busy === `rw-${s.id}` ? '변환 중…' : '한국어 변환만'}
          </button>
        )}
        {s.status === 'rewritten' && (
          <button type="button" className="pill-btn small-pill" disabled={busy !== null} onClick={onPublish}>
            {busy === `pub-${s.id}` ? '게시 중…' : '도서관 게시'}
          </button>
        )}
        {s.status === 'published' && s.bookId && (
          <Link className="pill-btn small-pill alt" to={`/book/${s.bookId}`}>
            동화 극장에서 보기
          </Link>
        )}
        {s.status !== 'rejected' && (
          <button type="button" className="pill-btn small-pill ghost" disabled={busy !== null} onClick={onReject}>
            반려
          </button>
        )}
      </div>
    </article>
  );
}
