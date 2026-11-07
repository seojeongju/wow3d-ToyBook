import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, lockParentMode, send } from '../auth';
import AdminGate from '../components/AdminGate';
import ClayArt from '../components/ClayArt';
import DashLayout from '../components/DashLayout';
import Tobi from '../components/Tobi';
import { ADMIN_MENU } from './AdminDashboard';

/**
 * 운영자 · AI 설정: 이야기 공방 삽화를 그릴 그림 AI 공급사를 추가·순서·켜고 끄기·연결 시험.
 * 1순위가 실패하면 다음 순서로 넘어감 (functions/_lib/imageai.ts). 키는 암호화해 저장하고 끝 4자리만 보여 줌
 */
type Kind = 'gemini' | 'openai' | 'fal';

interface Provider {
  id: string;
  kind: Kind;
  kindName: string;
  label: string;
  model: string;
  keySource: 'saved' | 'env' | 'none';
  keyHint: string | null;
  enabled: boolean;
  priority: number;
  costPerImage: number | null;
  lastTest: { at: string; ok: boolean; ms: number | null; note: string | null } | null;
}

interface KindInfo {
  id: Kind;
  name: string;
  defaultModel: string;
  note: string;
  envKeyName: string;
  envKeySet: boolean;
}

interface Overview {
  providers: Provider[];
  usage: { provider_id: string; calls: number; ok: number; avg_ms: number; cost: number }[];
  kinds: KindInfo[];
  canSaveKeys: boolean;
}

export default function AdminAiSettings() {
  return <AdminGate>{(me) => <AiSettings name={me.name} />}</AdminGate>;
}

function AiSettings({ name }: { name: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ kind: 'gemini' as Kind, label: '', model: '', apiKey: '', cost: '' });
  const [keyEdit, setKeyEdit] = useState<{ id: string; value: string } | null>(null);
  const [tests, setTests] = useState<Record<string, { ok: boolean; ms: number; image?: string; error?: string }>>({});

  const load = useCallback(async () => {
    try {
      setData(await send<Overview>('/api/admin/ai', 'GET'));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 423) return navigate(0);
      setError(e instanceof Error ? e.message : '불러오지 못했어요');
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, job: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await job();
      if (ok) setNotice(ok);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '처리하지 못했어요');
    } finally {
      setBusy(null);
    }
  };

  const kindInfo = (k: Kind) => data?.kinds.find((x) => x.id === k);
  const providers = data?.providers ?? [];
  const firstOn = providers.find((p) => p.enabled && p.keySource !== 'none');

  const move = (p: Provider, dir: -1 | 1) => {
    const i = providers.findIndex((x) => x.id === p.id);
    const other = providers[i + dir];
    if (!other) return;
    run(`move-${p.id}`, async () => {
      await send(`/api/admin/ai/${p.id}`, 'PATCH', { priority: other.priority });
      await send(`/api/admin/ai/${other.id}`, 'PATCH', { priority: p.priority });
    });
  };

  const test = (p: Provider) =>
    run(`test-${p.id}`, async () => {
      const r = await send<{ ok: boolean; ms: number; image?: string; error?: string }>(`/api/admin/ai/${p.id}/test`, 'POST');
      setTests((t) => ({ ...t, [p.id]: r }));
    });

  return (
    <DashLayout
      title="AI 설정"
      profile={{ avatar: <Tobi pose="peek" size={76} />, name: `${name}님`, sub: 'wow3d 운영자' }}
      menu={ADMIN_MENU}
      active={ADMIN_MENU.findIndex((m) => m.to === '/admin/ai')}
      onLogout={() => {
        lockParentMode();
        navigate('/');
      }}
    >
      <section className="dash-card ai-intro">
        <h2>
          <ClayArt name="sparkles" size={30} /> 그림(삽화) AI
        </h2>
        <p>
          이야기 공방에서 쪽마다 그림을 그릴 AI 예요. <strong>위에서부터 순서대로</strong> 쓰고, 실패하면 다음 AI 가 대신 그려요. 공급사를 바꿔도 이미 그린
          그림은 그대로 남아요.
        </p>
        <p className="ai-now">
          지금 1순위:{' '}
          {firstOn ? (
            <strong>
              {firstOn.label} · {firstOn.model}
            </strong>
          ) : (
            <strong className="ai-warn">아직 없음 (아래에서 추가해 주세요)</strong>
          )}
        </p>
        {data && !data.canSaveKeys && (
          <p className="demo-banner">
            화면에서 API 키를 저장하려면 Cloudflare 비밀값 <code>AI_KEYS_SECRET</code>(16자 이상 아무 긴 문장)을 먼저 넣고 다시 배포해 주세요. 그 전에는 Cloudflare
            환경 변수 키({data.kinds.map((k) => k.envKeyName).join(' · ')})만 쓸 수 있어요.
          </p>
        )}
        <p className="ai-privacy">
          새 공급사를 켜면 아이 이야기 장면이 그 회사로 전송돼요. 개인정보처리방침의 "처리 위탁과 국외 이전" 표에 그 회사를 추가해 주세요.
        </p>
      </section>

      {error && <p className="login-error">{error}</p>}

      <ol className="ai-list">
        {providers.map((p, i) => {
          const u = data?.usage.find((x) => x.provider_id === p.id);
          const t = tests[p.id];
          return (
            <li key={p.id} className={`dash-card ai-item ${p.enabled ? '' : 'off'}`}>
              <div className="ai-item-head">
                <span className="ai-rank">{i + 1}</span>
                <div className="ai-item-title">
                  <strong>{p.label}</strong>
                  <span>
                    {p.kindName} · <code>{p.model}</code>
                  </span>
                </div>
                <label className="account-toggle">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    disabled={busy !== null}
                    onChange={(e) => run(`on-${p.id}`, () => send(`/api/admin/ai/${p.id}`, 'PATCH', { enabled: e.target.checked }), e.target.checked ? '켰어요' : '껐어요')}
                  />
                  <span>{p.enabled ? '사용 중' : '꺼짐'}</span>
                </label>
              </div>

              <dl className="account-dl">
                <dt>API 키</dt>
                <dd>
                  {p.keySource === 'saved' && `저장한 키 (…${p.keyHint})`}
                  {p.keySource === 'env' && `Cloudflare 환경 변수 (${kindInfo(p.kind)?.envKeyName})`}
                  {p.keySource === 'none' && <span className="ai-warn">없음 — 키를 넣어 주세요</span>}
                </dd>
                <dt>장당 비용</dt>
                <dd>{p.costPerImage != null ? `$${p.costPerImage}` : '미입력'}</dd>
                <dt>최근 7일</dt>
                <dd>{u ? `${u.calls}번 · 성공 ${u.ok}번 · 평균 ${(u.avg_ms / 1000).toFixed(1)}초 · 약 $${u.cost.toFixed(2)}` : '사용 기록 없음'}</dd>
                <dt>연결 시험</dt>
                <dd>
                  {p.lastTest
                    ? `${p.lastTest.ok ? '성공' : '실패'} · ${((p.lastTest.ms ?? 0) / 1000).toFixed(1)}초 · ${new Date(p.lastTest.at).toLocaleString('ko-KR')}`
                    : '아직 안 함'}
                  {p.lastTest && !p.lastTest.ok && p.lastTest.note && <small className="ai-err">{p.lastTest.note}</small>}
                </dd>
              </dl>

              {t?.image && (
                <figure className="ai-test-img">
                  <img src={t.image} alt="연결 시험으로 그린 점토 곰 그림" />
                  <figcaption>{(t.ms / 1000).toFixed(1)}초 걸렸어요 (저장하지 않는 시험 그림)</figcaption>
                </figure>
              )}

              {keyEdit?.id === p.id && (
                <div className="ai-key-edit">
                  <input type="password" autoComplete="off" placeholder="새 API 키 붙여 넣기" value={keyEdit.value} onChange={(e) => setKeyEdit({ id: p.id, value: e.target.value })} />
                  <button
                    type="button"
                    className="pill-btn small-pill"
                    disabled={!keyEdit.value.trim() || busy !== null}
                    onClick={() =>
                      run(`key-${p.id}`, async () => {
                        await send(`/api/admin/ai/${p.id}`, 'PATCH', { apiKey: keyEdit.value });
                        setKeyEdit(null);
                      }, '키를 저장했어요')
                    }
                  >
                    저장
                  </button>
                  <button type="button" className="pill-btn small-pill alt" onClick={() => setKeyEdit(null)}>
                    취소
                  </button>
                </div>
              )}

              <div className="kids-form-actions">
                <button type="button" className="pill-btn small-pill" disabled={busy !== null || p.keySource === 'none'} onClick={() => test(p)}>
                  {busy === `test-${p.id}` ? '그리는 중…' : '연결 시험 (1장)'}
                </button>
                <button type="button" className="pill-btn small-pill alt" disabled={i === 0 || busy !== null} onClick={() => move(p, -1)} aria-label="위로">
                  ▲ 위로
                </button>
                <button type="button" className="pill-btn small-pill alt" disabled={i === providers.length - 1 || busy !== null} onClick={() => move(p, 1)} aria-label="아래로">
                  ▼ 아래로
                </button>
                <button type="button" className="pill-btn small-pill alt" disabled={busy !== null || !data?.canSaveKeys} onClick={() => setKeyEdit({ id: p.id, value: '' })}>
                  키 바꾸기
                </button>
                {p.keySource === 'saved' && (
                  <button
                    type="button"
                    className="pill-btn small-pill alt"
                    disabled={busy !== null}
                    onClick={() => window.confirm('저장한 키를 지우고 Cloudflare 환경 변수 키를 쓸까요?') && run(`clear-${p.id}`, () => send(`/api/admin/ai/${p.id}`, 'PATCH', { clearKey: true }), '저장한 키를 지웠어요')}
                  >
                    저장 키 지우기
                  </button>
                )}
                <button
                  type="button"
                  className="text-danger"
                  disabled={busy !== null}
                  onClick={() => window.confirm(`${p.label} 을(를) 지울까요? 저장한 키도 함께 지워져요.`) && run(`del-${p.id}`, () => send(`/api/admin/ai/${p.id}`, 'DELETE'), '지웠어요')}
                >
                  지우기
                </button>
              </div>
              {t && !t.ok && <p className="login-error">시험 실패: {t.error}</p>}
            </li>
          );
        })}
        {data && providers.length === 0 && (
          <li className="dash-card kids-empty">
            <ClayArt name="robot" size={64} />
            <p>아직 등록한 그림 AI 가 없어요. 아래에서 추가해 주세요.</p>
          </li>
        )}
      </ol>

      {adding ? (
        <form
          className="dash-card kids-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              'add',
              async () => {
                await send('/api/admin/ai', 'POST', {
                  kind: form.kind,
                  label: form.label,
                  model: form.model,
                  apiKey: form.apiKey,
                  costPerImage: form.cost === '' ? null : Number(form.cost),
                });
                setAdding(false);
                setForm({ kind: 'gemini', label: '', model: '', apiKey: '', cost: '' });
              },
              '추가했어요. 연결 시험으로 확인해 보세요',
            );
          }}
        >
          <h2>그림 AI 추가</h2>
          <fieldset className="kids-field">
            <legend>공급사</legend>
            <div className="kids-modes">
              {data?.kinds.map((k) => (
                <button key={k.id} type="button" className={form.kind === k.id ? 'on' : ''} aria-pressed={form.kind === k.id} onClick={() => setForm({ ...form, kind: k.id })}>
                  <strong>{k.name}</strong>
                  <span>{k.note}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="kids-field">
            <span>모델 이름</span>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder={kindInfo(form.kind)?.defaultModel} />
            <small>비워 두면 {kindInfo(form.kind)?.defaultModel}. 새 모델이 나오면 이름만 바꾸면 돼요.</small>
          </label>
          <label className="kids-field">
            <span>API 키</span>
            <input
              type="password"
              autoComplete="off"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={data?.canSaveKeys ? '붙여 넣기 (비워 두면 Cloudflare 환경 변수 키 사용)' : 'AI_KEYS_SECRET 을 넣어야 저장할 수 있어요'}
              disabled={!data?.canSaveKeys}
            />
            <small>
              환경 변수 {kindInfo(form.kind)?.envKeyName}: {kindInfo(form.kind)?.envKeySet ? '들어 있음' : '없음'} · 저장한 키는 암호화되고 끝 4자리만 보여요.
            </small>
          </label>
          <label className="kids-field">
            <span>표시 이름 (선택)</span>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={kindInfo(form.kind)?.name} maxLength={40} />
          </label>
          <label className="kids-field">
            <span>장당 비용 USD (선택, 사용량 집계용)</span>
            <input type="number" min="0" step="0.001" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="예: 0.04" />
          </label>
          <div className="kids-form-actions">
            <button type="submit" className="pill-btn" disabled={busy !== null}>
              추가하기
            </button>
            <button type="button" className="pill-btn small-pill alt" onClick={() => setAdding(false)}>
              취소
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="pill-btn kids-add" onClick={() => setAdding(true)}>
          + 그림 AI 추가
        </button>
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </DashLayout>
  );
}
