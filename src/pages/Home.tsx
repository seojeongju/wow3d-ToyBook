import { Link } from 'react-router-dom';
import HeroArt from '../components/HeroArt';
import { ClayIcon, LineIcon, type ClayIconName } from '../components/Icons';
import SiteHeader from '../components/SiteHeader';

// 숫자는 PRD 4.1 제품 목표
const STATS: { icon: ClayIconName; value: string; label: string }[] = [
  { icon: 'clock', value: '15분', label: '그림책 한 권 완성' },
  { icon: 'cube', value: '1~3분', label: '3D 미리보기' },
  { icon: 'factory', value: '3번 탭', label: '피규어 주문까지' },
  { icon: 'ruler', value: '5·8·12cm', label: '피규어 크기' },
];

const FEATURES: { icon: ClayIconName; title: string; body: string }[] = [
  { icon: 'studio', title: '이야기 공방', body: '아이 이름과 좋아하는 것을 넣으면 AI가 줄거리와 삽화를 함께 만들어요.' },
  { icon: 'theater', title: '동화 극장', body: '한 쪽씩 넘기며 읽고, 소리 버튼을 누르면 또박또박 읽어 줘요.' },
  { icon: 'magic', title: '마법 상자', body: '책 속 캐릭터를 누르면 빙글빙글 돌려 볼 수 있는 3D 모델로 튀어나와요.' },
  { icon: 'factory', title: '장난감 공장', body: '마음에 드는 캐릭터를 wow3d가 출력 검수 후 피규어로 보내 드려요.' },
  { icon: 'drawing', title: '내 그림이 주인공', body: '아이가 종이에 그린 그림을 찍으면 삽화가 되고 3D 캐릭터가 돼요.' },
  { icon: 'shield', title: '부모님 안심', body: '결제·주문은 부모 잠금 뒤에. 광고도, 낯선 사람과의 채팅도 없어요.' },
];

export default function Home() {
  return (
    <div className="landing">
      <SiteHeader />

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow-pill">우리 아이 맞춤 동화 · by wow3d</span>
          <h1 className="hero-title">
            읽는 책이
            <br />
            <em>손에 쥐는 장난감</em>으로
          </h1>
          <p className="hero-sub">
            AI로 아이만을 위한 그림책을 만들고,
            <br />
            책 속 친구를 3D 피규어로 받아 보세요.
          </p>
          <div className="hero-actions">
            <Link to="/profiles" className="pill-btn">
              책장 열기 <LineIcon name="arrow" size={20} />
            </Link>
            <a href="#features" className="ghost-link">
              어떻게 하나요?
            </a>
          </div>
        </div>
        <HeroArt />
      </section>

      <section className="stats" aria-label="토이북 한눈에 보기">
        {STATS.map((s) => (
          <div key={s.label} className="stat">
            <ClayIcon name={s.icon} size={40} />
            <div>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </section>

      <section id="features" className="features">
        <p className="eyebrow">토이북이 특별한 이유</p>
        <h2 className="section-title">책 속 친구를 손에 쥐어요</h2>
        <div className="divider" aria-hidden>
          <span />
          <i>♥</i>
          <span />
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature-card">
              <ClayIcon name={f.icon} size={64} />
              <h3>{f.title}</h3>
              <span className="feature-line" aria-hidden />
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-banner">
        <ClayIcon name="magic" size={56} />
        <div className="cta-text">
          <strong>우리 아이만의 첫 책을 펼쳐 볼까요?</strong>
          <span>지금은 데모 책 2권을 미리 볼 수 있어요.</span>
        </div>
        <Link to="/profiles" className="pill-btn">
          책장 열기 <LineIcon name="arrow" size={20} />
        </Link>
      </section>

      <footer className="site-footer">© wow3d · 토이북 ToyBook</footer>
    </div>
  );
}
