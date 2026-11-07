import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, DonutChart } from '../components/Charts';
import DashLayout, { type DashMenuItem } from '../components/DashLayout';
import { ClayIcon, LineIcon, type ClayIconName } from '../components/Icons';
import Tobi from '../components/Tobi';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import AdminGate from '../components/AdminGate';
import { lockParentMode } from '../auth';

const MENU: DashMenuItem[] = [
  { icon: 'grid', label: '대시보드', to: '/admin' },
  { icon: 'box', label: '주문 관리' },
  { icon: 'check', label: '출력 검수' },
  { icon: 'users', label: '회원' },
  { icon: 'flag', label: '콘텐츠 신고' },
  { icon: 'gear', label: 'AI 설정' },
  { icon: 'gear', label: '설정' },
];

/*
 * 이 화면의 숫자는 모두 예시 데이터. 운영자 로그인과 주문 API(관리자 전용) 연동 후 교체.
 * 로그인 없이 실제 주문·회원 정보를 공개 API 로 노출하지 않기 위해 일부러 샘플만 씀.
 */
const STATS: { icon: ClayIconName; tone: string; label: string; value: string; sub: string }[] = [
  { icon: 'magic', tone: 'lavender', label: '오늘 접수', value: '12건', sub: '어제보다 +3' },
  { icon: 'shield', tone: 'peach', label: '검수 대기', value: '5건', sub: '출력 전 작업자 확인' },
  { icon: 'cube', tone: 'yellow', label: '출력 중', value: '8건', sub: 'FDM 6 · 레진 2' },
  { icon: 'factory', tone: 'mint', label: '배송 중', value: '14건', sub: '평균 2.1일' },
];

const WEEK_ORDERS = [
  { label: '월', value: 9 },
  { label: '화', value: 14 },
  { label: '수', value: 11 },
  { label: '목', value: 17 },
  { label: '금', value: 21 },
  { label: '토', value: 26 },
  { label: '일', value: 12 },
];

const METHODS = [
  { label: 'FDM 단색', value: 58 },
  { label: '레진 고정밀', value: 27 },
  { label: '풀컬러', value: 15 },
];

const PIPELINE = [
  { label: '접수', count: 12 },
  { label: '검수', count: 5 },
  { label: '출력', count: 8 },
  { label: '후가공', count: 4 },
  { label: '배송', count: 14 },
  { label: '완료', count: 131 },
];

const QUEUE = [
  { id: 'TB-1042', name: '치카 요정 피규어', size: '8cm · 레진', check: '얇은 날개 보강 필요', tone: 'warn', emoji: '🧚' },
  { id: 'TB-1041', name: '꼬마 공룡 로봇', size: '12cm · FDM', check: '자동 검사 통과', tone: 'ok', emoji: '🦖' },
  { id: 'TB-1039', name: '토끼 색칠 키트', size: '5cm · FDM 흰색', check: '받침대 각인 확인', tone: 'warn', emoji: '🐰' },
  { id: 'TB-1037', name: '곰돌이 우주인', size: '8cm · 풀컬러', check: '자동 검사 통과', tone: 'ok', emoji: '🐻' },
];

/** 운영자 대시보드: 운영자 로그인 + PIN 확인 뒤에만 열림 (AdminGate) */
export default function AdminDashboard() {
  return <AdminGate>{(me) => <AdminHome name={me.name} />}</AdminGate>;
}

function AdminHome({ name }: { name: string }) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <DashLayout
      title="관리자 대시보드"
      profile={{ avatar: <Tobi pose="peek" size={76} />, name: `${name}님`, sub: 'wow3d 운영자' }}
      menu={MENU}
      active={0}
      sampleNote="주문·출력 숫자는 아직 예시 데이터예요. 주문 기능을 열 때 실제 값으로 바뀝니다."
      onLogout={() => {
        lockParentMode();
        navigate('/');
      }}
      promo={
        <>
          <ClayIcon name="factory" size={44} tile={false} />
          <strong>wow3d pro 연동</strong>
          <span>1단계 주문 대행 → 2단계 REST API · 웹훅</span>
          <button className="promo-btn" onClick={() => setNotice('wow3d pro 연동 설정은 주문 기능과 함께 열려요')}>
            연동 설정
          </button>
        </>
      }
    >
      <section className="dash-hero">
        <div className="dash-hero-art">
          <Tobi pose="wave" size={150} />
        </div>
        <div className="dash-hero-copy">
          <h2>
            오늘도 반짝이는 피규어를 만들어요 <ClayArt name="sparkles" size={30} />
          </h2>
          <p>검수 대기 5건이 작업자 확인을 기다리고 있어요.</p>
          <button className="pill-btn small-pill" onClick={() => setNotice('출력 검수 화면은 주문 기능과 함께 열려요')}>
            검수 시작하기 <LineIcon name="arrow" size={18} />
          </button>
        </div>
        <ClayIcon name="cube" size={72} tile={false} />
      </section>

      <section className="dash-stats">
        {STATS.map((s) => (
          <div key={s.label} className={`dash-stat tone-${s.tone}`}>
            <ClayIcon name={s.icon} size={40} tile={false} />
            <span className="dash-stat-label">{s.label}</span>
            <strong>{s.value}</strong>
            <span className="dash-stat-sub">{s.sub}</span>
          </div>
        ))}
      </section>

      <section className="dash-card pipeline-card">
        <header>
          <h3>주문 진행 단계</h3>
          <span className="badge-sample">예시</span>
        </header>
        <ol className="pipeline">
          {PIPELINE.map((p) => (
            <li key={p.label}>
              <strong>{p.count}</strong>
              <span>{p.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="dash-grid">
        <article className="dash-card">
          <header>
            <h3>이번 주 주문</h3>
            <span className="badge-sample">예시</span>
          </header>
          <BarChart data={WEEK_ORDERS} unit="건" />
        </article>
        <article className="dash-card">
          <header>
            <h3>출력 방식</h3>
            <span className="badge-sample">예시</span>
          </header>
          <DonutChart data={METHODS} unit="건" />
        </article>
      </section>

      <section className="dash-card">
        <header>
          <h3>검수 대기 주문</h3>
          <span className="badge-sample">예시</span>
        </header>
        <ul className="dash-list">
          {QUEUE.map((q) => (
            <li key={q.id}>
              <span className="dash-thumb" aria-hidden>
                <ClayEmoji emoji={q.emoji} size={40} />
              </span>
              <div>
                <strong>
                  {q.name} <span className="order-id">{q.id}</span>
                </strong>
                <span>{q.size}</span>
              </div>
              <span className={`chip chip-${q.tone}`}>
                <LineIcon name={q.tone === 'ok' ? 'check' : 'flag'} size={16} />
                {q.check}
              </span>
              <button className="dash-play" aria-label={`${q.id} 검수하기`} onClick={() => setNotice(`${q.id} 검수 화면은 주문 기능과 함께 열려요`)}>
                <LineIcon name="next" size={20} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </DashLayout>
  );
}
