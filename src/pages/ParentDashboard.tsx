import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, wishApi } from '../api';
import { BarChart, DonutChart } from '../components/Charts';
import DashLayout from '../components/DashLayout';
import { PARENT_MENU, parentProfile, useLeaveParent } from '../components/ParentArea';
import { useMe } from '../auth';
import { ClayIcon, LineIcon, type ClayIconName } from '../components/Icons';
import Tobi from '../components/Tobi';
import WalletModal from '../components/WalletModal';
import { isParentUnlocked } from '../parentLock';
import { weeklyPages } from '../readingLog';
import { useAsync } from '../useAsync';
import { ClayEmoji } from '../components/ClayArt';


// 주제 분류는 아직 저장하지 않으므로 예시 값 (PRD B-01 연동 후 교체)
const SAMPLE_TOPICS = [
  { label: '생활습관', value: 5 },
  { label: '모험', value: 3 },
  { label: '감정', value: 2 },
];

export default function ParentDashboard() {
  const [notice, setNotice] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const navigate = useNavigate();
  const { loading: meLoading, user } = useMe();
  const leave = useLeaveParent();
  // 이 기기에서 읽은 쪽 (모든 아이 합계, 로그인 연동 후 서버 기록으로 교체)
  const [reading] = useState(() => weeklyPages());
  const readTotal = reading.reduce((s, d) => s + d.value, 0);
  const children = useAsync(api.children, []);
  const books = useAsync(() => api.books(), []);
  const wishBundle = useAsync(() => wishApi.list(), []);

  if (!isParentUnlocked()) return <Navigate to="/parent" replace />;

  const kids = children.status === 'ok' ? children.data : [];
  const bookList = books.status === 'ok' ? books.data : [];
  const wishes = wishBundle.status === 'ok' ? wishBundle.data.wishes : [];
  const pendingWishes = wishes.filter((w) => w.status === 'pending');

  const stats: { icon: ClayIconName; tone: string; label: string; value: string; sub: string }[] = [
    { icon: 'drawing', tone: 'lavender', label: '아이 프로필', value: `${kids.length}명`, sub: '부모 계정에 연결됨' },
    { icon: 'studio', tone: 'peach', label: '만든 책', value: `${bookList.length}권`, sub: `완성 ${bookList.filter((b) => b.status === 'done').length}권` },
    { icon: 'theater', tone: 'yellow', label: '모든 쪽 수', value: `${bookList.reduce((s, b) => s + b.page_count, 0)}쪽`, sub: '책장 전체' },
    { icon: 'factory', tone: 'mint', label: '갖고 싶어요', value: `${pendingWishes.length}건`, sub: '승인 기다리는 요청' },
  ];
  const kidName = (id: string | null) => kids.find((k) => k.id === id)?.nickname ?? '';

  return (
    <DashLayout
      title="부모 대시보드"
      profile={parentProfile(user, meLoading)}
      menu={PARENT_MENU}
      active={0}
      onLogout={leave}
      promo={
        <>
          <ClayIcon name="magic" size={44} tile={false} />
          <strong>프리미엄</strong>
          <span>월 5권 · 웹툰 · 읽어 주기 · 3D 미리보기 5회</span>
          <button className="promo-btn" onClick={() => setNotice('프리미엄 구독은 정식 출시 때 열려요')}>
            알아보기
          </button>
        </>
      }
    >
      {!meLoading && user?.status !== 'active' && (
        <p className="demo-banner">
          지금은 데모 가족을 보고 있어요. <Link to="/login?next=/dashboard/kids">로그인하고 우리 아이 프로필 만들기</Link>
        </p>
      )}

      <section className="dash-hero">
        <div className="dash-hero-art">
          <Tobi pose="wave" size={150} />
        </div>
        <div className="dash-hero-copy">
          <h2>안녕하세요, {user?.status === 'active' ? `${user.name}님` : '부모님'}!</h2>
          <p>오늘은 아이와 어떤 이야기를 만들어 볼까요?</p>
          <div className="dash-hero-btns">
            <button
              className="pill-btn small-pill"
              onClick={() => navigate(kids[0] ? `/shelf/${kids[0].id}` : '/profiles')}
            >
              책장에서 새 동화 만들기 <LineIcon name="arrow" size={18} />
            </button>
            <button
              type="button"
              className="pill-btn alt small-pill"
              onClick={() => setShowWalletModal(true)}
            >
              ⭐ 내 별 코인 지갑 · 충전소
            </button>
          </div>
        </div>
        <ClayIcon name="drawing" size={72} tile={false} />
      </section>

      <section className="dash-stats">
        {stats.map((s) => (
          <div key={s.label} className={`dash-stat tone-${s.tone}`}>
            <ClayIcon name={s.icon} size={40} tile={false} />
            <span className="dash-stat-label">{s.label}</span>
            <strong>{children.status === 'loading' || books.status === 'loading' ? '…' : s.value}</strong>
            <span className="dash-stat-sub">{s.sub}</span>
          </div>
        ))}
      </section>

      <section className="dash-grid">
        <article className="dash-card">
          <header>
            <h3>이번 주 읽은 쪽 수</h3>
            <span className="badge-sample" title="로그인 연동 전이라 이 기기에서 읽은 기록만 보여요">이 기기 기록</span>
          </header>
          <BarChart data={reading} unit="쪽" />
          {readTotal === 0 && <p className="muted dash-empty-note">아직 이번 주에 읽은 쪽이 없어요. 동화 극장에서 책을 펼치면 여기에 쌓여요.</p>}
        </article>
        <article className="dash-card">
          <header>
            <h3>주제별 책</h3>
            <span className="badge-sample">예시</span>
          </header>
          <DonutChart data={SAMPLE_TOPICS} unit="권" />
        </article>
      </section>

      <section className="dash-grid">
        <article className="dash-card">
          <header>
            <h3>최근 만든 책</h3>
            <Link to="/profiles" className="see-all">
              모두 보기
            </Link>
          </header>
          {books.status === 'error' && <p className="error">{books.message}</p>}
          <ul className="dash-list">
            {bookList.slice(0, 4).map((b) => (
              <li key={b.id}>
                <span className="dash-thumb" aria-hidden>
                  <ClayEmoji emoji={b.cover_emoji} size={40} />
                </span>
                <div>
                  <strong>{b.title}</strong>
                  <span>
                    {kidName(b.child_id)} · {b.page_count}쪽
                  </span>
                </div>
                <Link to={`/book/${b.id}`} className="dash-play" aria-label={`${b.title} 읽기`}>
                  <LineIcon name="next" size={20} />
                </Link>
              </li>
            ))}
            {books.status === 'ok' && bookList.length === 0 && <li className="muted">아직 만든 책이 없어요</li>}
          </ul>
        </article>
        <article className="dash-card">
          <header>
            <h3>갖고 싶어요 요청 ({pendingWishes.length}건 대기)</h3>
            <Link to="/dashboard/models" className="see-all">
              3D 보관함 보기
            </Link>
          </header>
          {wishes.length === 0 ? (
            <div className="dash-empty">
              <ClayIcon name="factory" size={64} />
              <p>
                아직 요청이 없어요.
                <br />
                아이가 책장 [장난감 공장]에서 찜하기를 누르면 여기서 승인·주문할 수 있어요.
              </p>
            </div>
          ) : (
            <ul className="dash-list">
              {wishes.slice(0, 4).map((w) => (
                <li key={w.id}>
                  <span className="dash-thumb" aria-hidden>
                    <ClayEmoji emoji={w.child_avatar} size={36} />
                  </span>
                  <div>
                    <strong>
                      {w.meta.figureName} ({w.meta.sizeCm}cm)
                    </strong>
                    <span>
                      {w.child_nickname}의 요청 · {w.status === 'pending' ? '승인 대기 중' : w.status === 'approved' ? '승인 완료' : '보류'}
                    </span>
                  </div>
                  <Link
                    to={`/dashboard/orders?modelId=${encodeURIComponent(w.model_id)}&wishId=${encodeURIComponent(w.id)}`}
                    className="market-mini-btn"
                  >
                    {w.status === 'pending' ? '승인·주문 →' : '주문서 보기'}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="dash-banner">
        <ClayIcon name="theater" size={48} tile={false} />
        <div>
          <strong>우리가 만든 책을 도서관·서점에 공유하고 판매해 보세요</strong>
          <span>다른 가족에게 책을 빌려주거나 판매해 별 코인을 모으고, 새로운 동화도 빌려 읽을 수 있어요</span>
        </div>
        <Link to="/market?tab=mine" className="pill-btn small-pill">
          도서관·서점 관리 <LineIcon name="arrow" size={18} />
        </Link>
      </section>

      {showWalletModal && (
        <WalletModal
          onClose={() => setShowWalletModal(false)}
          onWalletUpdated={(_w, msg) => setNotice(msg)}
        />
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </DashLayout>
  );
}
