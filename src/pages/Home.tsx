import { Link } from 'react-router-dom';
import { api } from '../api';
import HeroArt from '../components/HeroArt';
import { ClayIcon, LineIcon, type ClayIconName } from '../components/Icons';
import SiteHeader from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import { useAsync } from '../useAsync';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import JsonLd from '../components/JsonLd';
import { faqLd, howToLd, organizationLd, PAGE_META, webAppLd, websiteLd } from '../seo';
import SiteFooter from '../components/SiteFooter';
import { AGES, FAQ_HOME as FAQ, PROMISES, STEPS } from '../content/site';

// 성능 목표(PRD 4.1)는 아직 측정 전이라 싣지 않고, 정해진 사양만 보여 줌
const FACTS: { icon: ClayIconName; value: string; label: string }[] = [
  { icon: 'drawing', value: '3~12세', label: '나이에 맞춘 화면' },
  { icon: 'studio', value: '8·12·16쪽', label: '그림책 분량' },
  { icon: 'ruler', value: '5·8·12cm', label: '피규어 크기' },
  { icon: 'shield', value: '광고 0 · 채팅 0', label: '아이 화면 안심 설계' },
];

const FEATURES: { icon: ClayIconName; title: string; body: string }[] = [
  { icon: 'studio', title: '이야기 공방', body: '아이 이름과 좋아하는 것을 넣으면 AI가 줄거리와 그림을 함께 만들어요.' },
  { icon: 'theater', title: '동화 극장', body: '한 쪽씩 넘기며 읽고, 소리 버튼을 누르면 또박또박 읽어 줘요.' },
  { icon: 'magic', title: '마법 상자', body: '책 속 캐릭터를 누르면 빙글빙글 돌려 볼 수 있는 3D 모델로 튀어나와요.' },
  { icon: 'factory', title: '장난감 공장', body: '마음에 드는 캐릭터를 wow3d가 검수하고 출력해 피규어로 보내 드려요.' },
  { icon: 'drawing', title: '내 그림이 주인공', body: '아이가 종이에 그린 그림을 찍으면 책 속 그림이 되고 3D 캐릭터가 돼요.' },
  { icon: 'shield', title: '부모님 안심', body: '결제와 주문은 부모 잠금 뒤에 있어요. 광고도, 낯선 사람과의 채팅도 없어요.' },
];

export default function Home() {
  const books = useAsync(() => api.books(), []);

  return (
    <div className="landing">
      <JsonLd
        data={[
          organizationLd(),
          websiteLd(),
          webAppLd(PAGE_META['/'].description),
          howToLd('토이북으로 우리 아이 그림책과 피규어 만들기', STEPS),
          faqLd(FAQ),
        ]}
      />
      <SiteHeader />

      <section className="hero">
        <div className="hero-copy">
          <div className="hero-tags">
            <span className="eyebrow-pill">✨ 온 가족 AI 동화 · 3D 피규어 공방</span>
            <span className="eyebrow-safe">
              <LineIcon name="check" size={15} /> 광고·채팅 0% 안심 화면
            </span>
          </div>

          <h1 className="hero-title">
            우리 아이 맞춤 그림책이
            <br />
            화면 밖 <em>3D 장난감</em>으로!
          </h1>

          <p className="hero-sub">아이 이름과 손그림으로 만든 동화 속 친구를 실물 피규어로 만나 보세요.</p>

          {/* 한눈에 보는 3단계 인포그래픽 카드 */}
          <div className="hero-infographic" role="list" aria-label="토이북 3단계 핵심 과정">
            <div className="hero-info-card tone-peach" role="listitem">
              <span className="hero-info-step">STEP 1</span>
              <ClayIcon name="studio" size={44} tile={false} />
              <strong>AI 동화책 제작</strong>
              <span>이름·손그림으로 15분 완성</span>
            </div>

            <span className="hero-info-connector" aria-hidden>
              <LineIcon name="next" size={20} />
            </span>

            <div className="hero-info-card tone-lavender" role="listitem">
              <span className="hero-info-step">STEP 2</span>
              <ClayIcon name="theater" size={44} tile={false} />
              <strong>음성 동화 극장</strong>
              <span>연령별 화면 · TTS 읽어 주기</span>
            </div>

            <span className="hero-info-connector" aria-hidden>
              <LineIcon name="next" size={20} />
            </span>

            <div className="hero-info-card tone-mint" role="listitem">
              <span className="hero-info-step">STEP 3</span>
              <ClayIcon name="factory" size={44} tile={false} />
              <strong>3D 피규어 배송</strong>
              <span>360° 프리뷰 · wow3d 출력</span>
            </div>
          </div>

          <div className="hero-actions">
            <a href="#preview" className="pill-btn">
              그림책 미리 읽기 <LineIcon name="arrow" size={20} />
            </a>
            <a href="#how" className="ghost-link">
              어떻게 만드나요?
            </a>
          </div>
        </div>
        <HeroArt />
      </section>

      <section className="stats" aria-label="토이북 한눈에 보기">
        {FACTS.map((s) => (
          <div key={s.label} className="stat">
            <ClayIcon name={s.icon} size={40} />
            <div>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </section>

      <section id="how" className="section">
        <SectionHead eyebrow="만드는 방법" title="세 걸음이면 우리 아이 책이 생겨요" />
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step-card">
              <span className="step-no">{i + 1}</span>
              <ClayIcon name={s.icon} size={64} />
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="section-note">지금은 미리 보기 단계예요. 책 만들기와 피규어 주문은 차례로 열려요.</p>
      </section>

      <section id="preview" className="section">
        <SectionHead eyebrow="미리 읽기" title="토이북 그림책을 한번 펼쳐 보세요" />
        {books.status === 'loading' && <p className="muted center-text">그림책을 꺼내는 중…</p>}
        {books.status === 'error' && <p className="error center-text">그림책을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
        {books.status === 'ok' && (
          <div className="preview-grid">
            {books.data.map((b) => (
              <Link key={b.id} to={`/book/${b.id}`} className="preview-card">
                <span className="preview-cover" aria-hidden>
                  <ClayEmoji emoji={b.cover_emoji} size={70} />
                </span>
                <span className="preview-body">
                  <strong>{b.title}</strong>
                  <span>
                    {b.page_count}쪽 · <LineIcon name="speaker" size={16} /> 읽어 주기
                  </span>
                </span>
                <span className="preview-go" aria-hidden>
                  <LineIcon name="next" size={22} />
                </span>
              </Link>
            ))}
            {books.data.length === 0 && <p className="muted center-text">아직 미리 볼 그림책이 없어요.</p>}
          </div>
        )}
      </section>

      <section id="features" className="section features">
        <SectionHead eyebrow="토이북이 특별한 이유" title="책 속 친구를 손에 쥐어요" />
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

      <section id="ages" className="section">
        <SectionHead eyebrow="나이에 맞춘 화면" title="아이가 자라면 토이북도 함께 자라요" />
        <div className="age-grid">
          {AGES.map((a) => (
            <article key={a.name} className={`age-card tone-${a.tone}`}>
              <span className="age-emoji" aria-hidden>
                <ClayEmoji emoji={a.emoji} size={72} />
              </span>
              <h3>
                {a.name} <span>{a.age}</span>
              </h3>
              <p>{a.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="safety" className="section safety">
        <div className="safety-art" aria-hidden>
          <Tobi pose="wave" size={170} />
        </div>
        <div className="safety-body">
          <p className="eyebrow">부모님께 드리는 약속</p>
          <h2 className="section-title left">아이에게 안전한 곳이 먼저예요</h2>
          <ul className="promise-list">
            {PROMISES.map((p) => (
              <li key={p.title}>
                <span className="promise-check" aria-hidden>
                  <LineIcon name="check" size={20} />
                </span>
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" className="section">
        <SectionHead eyebrow="자주 묻는 질문" title="궁금한 점을 모았어요" />
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>
                <span>{f.q}</span>
                <span className="faq-icon" aria-hidden>
                  <LineIcon name="next" size={20} />
                </span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <p className="section-more">
          <Link to="/faq">질문 더 보기 →</Link>
        </p>
      </section>

      <section className="cta-banner">
        <ClayIcon name="magic" size={56} />
        <div className="cta-text">
          <strong>우리 아이 책장을 열어 볼까요?</strong>
          <span>데모 그림책 두 권을 읽고, 소리 버튼으로 읽어 주기도 들어 보세요.</span>
        </div>
        <Link to="/profiles" className="pill-btn">
          책장 열기 <LineIcon name="arrow" size={20} />
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="section-head">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      <div className="divider" aria-hidden>
        <span />
        <ClayArt name="heart" size={18} />
        <span />
      </div>
    </header>
  );
}
