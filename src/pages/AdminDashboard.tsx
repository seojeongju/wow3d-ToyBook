import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi, type AdminOrderRow, type AdminReportRow } from '../api';
import { lockParentMode } from '../auth';
import AdminGate from '../components/AdminGate';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import DashLayout, { type DashMenuItem } from '../components/DashLayout';
import { ClayIcon, LineIcon, type ClayIconName } from '../components/Icons';
import Tobi from '../components/Tobi';
import { useAsync } from '../useAsync';

const MENU: DashMenuItem[] = [
  { icon: 'grid', label: '운영 대시보드', to: '/admin' },
  { icon: 'box', label: '주문 · 출력 공정', to: '/admin?tab=orders' },
  { icon: 'flag', label: '콘텐츠 안전 신고', to: '/admin?tab=reports' },
  { icon: 'heart', label: '도서관 · 서점 보기', to: '/market' },
];

const ORDER_STATUS_LABELS: Record<string, string> = {
  paid: '결제·접수',
  received: '센터 접수',
  inspecting: '출력 검수 중',
  printing: '3D 출력 중',
  finishing: '안전 후가공',
  shipping: '택배 배송 중',
  done: '배송 완료',
  cancelled: '주문 취소',
};

const NEXT_ORDER_STAGE: Record<string, { next: string; btnLabel: string }> = {
  paid: { next: 'inspecting', btnLabel: '🔍 출력 검수 시작' },
  received: { next: 'inspecting', btnLabel: '🔍 출력 검수 시작' },
  inspecting: { next: 'printing', btnLabel: '🖨️ 3D 출력 시작' },
  printing: { next: 'finishing', btnLabel: '✨ 안전 후가공 전환' },
  finishing: { next: 'shipping', btnLabel: '🚚 배송 출발 처리' },
  shipping: { next: 'done', btnLabel: '✅ 배송 완료 확정' },
};

const REASON_LABELS: Record<string, string> = {
  unsafe: '부적절·위험 표현',
  pii: '개인정보 노출 우려',
  copyright: '작품 도용 의심',
  other: '기타 확인 요청',
};

/** 운영자 대시보드: 운영자 로그인 + PIN 확인 뒤에만 열림 (AdminGate) */
export default function AdminDashboard() {
  return <AdminGate>{(me) => <AdminHome name={me.name} />}</AdminGate>;
}

function AdminHome({ name }: { name: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const activeMenuIdx = tab === 'orders' ? 1 : tab === 'reports' ? 2 : 0;

  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const overview = useAsync(() => adminApi.overview(), [tick]);

  const statsData = overview.status === 'ok' ? overview.data.stats : null;
  const orders: AdminOrderRow[] = overview.status === 'ok' ? overview.data.orders : [];
  const reports: AdminReportRow[] = overview.status === 'ok' ? overview.data.reports : [];

  const statCards: { icon: ClayIconName; tone: string; label: string; value: string; sub: string }[] = [
    {
      icon: 'magic',
      tone: 'lavender',
      label: '진행 중 피규어 주문',
      value: `${statsData?.active_orders ?? 0}건`,
      sub: `전체 주문 ${orders.length}건`,
    },
    {
      icon: 'shield',
      tone: 'peach',
      label: '미처리 안전 신고',
      value: `${statsData?.open_reports ?? 0}건`,
      sub: '3건 누적 시 자동 블라인드',
    },
    {
      icon: 'studio',
      tone: 'yellow',
      label: '공개 중 도서관·서점 책',
      value: `${statsData?.published_listings ?? 0}권`,
      sub: `전체 생성 동화 ${statsData?.total_books ?? 0}권`,
    },
    {
      icon: 'factory',
      tone: 'mint',
      label: '가입 가족 계정',
      value: `${statsData?.total_parents ?? 0}가족`,
      sub: '활성 보호자 기준',
    },
  ];

  const pipelineCounts = [
    { label: '접수', count: orders.filter((o) => o.status === 'paid' || o.status === 'received').length },
    { label: '검수', count: orders.filter((o) => o.status === 'inspecting').length },
    { label: '출력', count: orders.filter((o) => o.status === 'printing').length },
    { label: '후가공', count: orders.filter((o) => o.status === 'finishing').length },
    { label: '배송', count: orders.filter((o) => o.status === 'shipping').length },
    { label: '완료', count: orders.filter((o) => o.status === 'done').length },
  ];

  const handleAdvanceOrder = async (order: AdminOrderRow, nextStatus: string) => {
    setBusyId(order.id);
    try {
      await adminApi.advanceOrder(order.id, nextStatus);
      setTick((v) => v + 1);
      setNotice(`📦 주문(${order.wow3dpro_order_no}) 상태를 '${ORDER_STATUS_LABELS[nextStatus] ?? nextStatus}' 단계로 변경했어요.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '주문 상태 변경에 실패했어요');
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveReport = async (rep: AdminReportRow, decision: 'blind' | 'dismiss') => {
    setBusyId(rep.id);
    try {
      await adminApi.resolveReport(rep.id, decision);
      setTick((v) => v + 1);
      setNotice(
        decision === 'blind'
          ? `🚨 '${rep.book_title}' 도서를 비공개(블라인드) 확정 처리했어요.`
          : `✅ '${rep.book_title}' 신고를 기각하고 정상 공개 상태로 복구했어요.`,
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '신고 처리에 실패했어요');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashLayout
      title="wow3d 운영자 대시보드"
      profile={{ avatar: <Tobi pose="peek" size={76} />, name: `${name}님`, sub: 'wow3d 안전·출력 운영자' }}
      menu={MENU}
      active={activeMenuIdx}
      onLogout={() => {
        lockParentMode();
        navigate('/');
      }}
    >
      <section className="dash-hero">
        <div className="dash-hero-art">
          <Tobi pose="wave" size={140} />
        </div>
        <div className="dash-hero-copy">
          <h2>
            오늘도 안전하고 반짝이는 동화·피규어를 운영해요 <ClayArt name="sparkles" size={28} />
          </h2>
          <p>
            현재 진행 중 주문 <strong>{statsData?.active_orders ?? 0}건</strong>, 확인 대기 신고{' '}
            <strong>{statsData?.open_reports ?? 0}건</strong>이 있습니다.
          </p>
          <div className="dash-hero-btns">
            <button className="pill-btn small-pill" onClick={() => navigate('/admin?tab=orders')}>
              주문·출력 공정 관리 <LineIcon name="arrow" size={18} />
            </button>
            <button className="pill-btn alt small-pill" onClick={() => navigate('/admin?tab=reports')}>
              콘텐츠 신고 검수 ({statsData?.open_reports ?? 0})
            </button>
          </div>
        </div>
        <ClayIcon name="cube" size={72} tile={false} />
      </section>

      <section className="dash-stats">
        {statCards.map((s) => (
          <div key={s.label} className={`dash-stat tone-${s.tone}`}>
            <ClayIcon name={s.icon} size={40} tile={false} />
            <span className="dash-stat-label">{s.label}</span>
            <strong>{overview.status === 'loading' ? '…' : s.value}</strong>
            <span className="dash-stat-sub">{s.sub}</span>
          </div>
        ))}
      </section>

      {(tab === 'overview' || tab === 'orders') && (
        <>
          <section className="dash-card pipeline-card">
            <header>
              <h3>실시간 3D 피규어 제작 파이프라인</h3>
              <span className="badge-sample">D1 실데이터 연동</span>
            </header>
            <ol className="pipeline">
              {pipelineCounts.map((p) => (
                <li key={p.label}>
                  <strong>{p.count}</strong>
                  <span>{p.label}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="dash-card">
            <header>
              <h3>📦 3D 피규어 주문 · 출력 공정 관리 ({orders.length}건)</h3>
              <button type="button" className="market-mini-btn" onClick={() => setTick((v) => v + 1)}>
                새로고침
              </button>
            </header>
            {orders.length === 0 ? (
              <p className="muted">아직 접수된 실물 피규어 주문이 없어요.</p>
            ) : (
              <ul className="dash-list admin-manage-list">
                {orders.map((o) => {
                  const nextAction = NEXT_ORDER_STAGE[o.status];
                  return (
                    <li key={o.id} className="admin-manage-row">
                      <img src={o.source_image_key} alt={o.modelMeta.figureName} className="admin-row-thumb" />
                      <div className="admin-row-info">
                        <strong>
                          {o.modelMeta.figureName} ({o.options.sizeCm}cm) <span className="order-id">{o.wow3dpro_order_no}</span>
                        </strong>
                        <span>
                          주문자: {o.parent_name} · 수령인: {o.shipping.recipient} ({o.shipping.phone}) · {o.shipping.address}
                        </span>
                        <small>
                          {o.options.materialLabel} · ₩{o.amount.toLocaleString()} · 현재 상태:{' '}
                          <strong>{ORDER_STATUS_LABELS[o.status] ?? o.status}</strong>
                        </small>
                      </div>
                      <div className="admin-row-actions">
                        {nextAction ? (
                          <button
                            type="button"
                            className="market-btn primary"
                            disabled={busyId === o.id}
                            onClick={() => handleAdvanceOrder(o, nextAction.next)}
                          >
                            {nextAction.btnLabel}
                          </button>
                        ) : (
                          <span className="chip chip-ok">처리 완료</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {(tab === 'overview' || tab === 'reports') && (
        <section className="dash-card">
          <header>
            <h3>🚨 어린이 안전 콘텐츠 신고 내역 ({reports.length}건)</h3>
            <span className="badge-sample">실시간 모니터링</span>
          </header>
          {reports.length === 0 ? (
            <p className="muted">현재 접수된 콘텐츠 신고가 없어요. 깨끗하고 안전한 동화 광장이 유지되고 있어요!</p>
          ) : (
            <ul className="dash-list admin-manage-list">
              {reports.map((r) => (
                <li key={r.id} className="admin-manage-row">
                  <span className="dash-thumb" aria-hidden>
                    <ClayEmoji emoji={r.cover_emoji} size={40} />
                  </span>
                  <div className="admin-row-info">
                    <strong>
                      {r.book_title} <small>({r.author_name})</small>
                    </strong>
                    <span>
                      사유: <strong>{REASON_LABELS[r.reason] ?? r.reason}</strong>
                      {r.detail ? ` — "${r.detail}"` : ''}
                    </span>
                    <small>
                      도서 상태: {r.listing_status === 'hidden' ? '🔒 블라인드됨' : '🌐 공개 중'} · 처리 상태: {r.status}
                    </small>
                  </div>
                  <div className="admin-row-actions">
                    <Link to={`/book/${encodeURIComponent(r.book_id)}`} className="market-btn secondary">
                      📖 내용 확인
                    </Link>
                    <button
                      type="button"
                      className="market-btn outline"
                      disabled={busyId === r.id}
                      onClick={() => handleResolveReport(r, 'dismiss')}
                    >
                      ✅ 정상 복구
                    </button>
                    <button
                      type="button"
                      className="market-btn primary buy"
                      disabled={busyId === r.id}
                      onClick={() => handleResolveReport(r, 'blind')}
                    >
                      🔒 블라인드 확정
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </DashLayout>
  );
}
