import { Link } from 'react-router-dom';
import { api } from '../api';
import HeroArt from '../components/HeroArt';
import { ClayIcon, LineIcon, type ClayIconName } from '../components/Icons';
import SiteHeader, { Logo } from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import { useAsync } from '../useAsync';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import JsonLd from '../components/JsonLd';
import { faqLd, howToLd, organizationLd, PAGE_META, webAppLd, websiteLd } from '../seo';

// 성능 목표(PRD 4.1)는 아직 측정 전이라 싣지 않고, 정해진 사양만 보여 줌
const FACTS: { icon: ClayIconName; value: string; label: string }[] = [
  { icon: 'drawing', value: '3~12세', label: '나이에 맞춘 화면' },
  { icon: 'studio', value: '8·12·16쪽', label: '그림책 분량' },
  { icon: 'ruler', value: '5·8·12cm', label: '피규어 크기' },
  { icon: 'shield', value: '광고 0 · 채팅 0', label: '아이 화면 안심 설계' },
];

const STEPS: { icon: ClayIconName; title: string; body: string }[] = [
  {
    icon: 'drawing',
    title: '아이 이야기 들려주기',
    body: '이름과 나이, 좋아하는 것, 들려주고 싶은 주제(양치하기, 정리정돈, 동생 생긴 날…)를 골라요.',
  },
  {
    icon: 'studio',
    title: '그림책 완성하기',
    body: 'AI가 아이 눈높이에 맞는 문장과 그림으로 책을 만들고, 부모님이 한 쪽씩 다듬어요.',
  },
  {
    icon: 'factory',
    title: '피규어로 받기',
    body: '책 속 캐릭터를 3D로 미리 보고, wow3d 작업자가 꼼꼼히 검수한 뒤 출력해 보내 드려요.',
  },
];

const FEATURES: { icon: ClayIconName; title: string; body: string }[] = [
  { icon: 'studio', title: '이야기 공방', body: '아이 이름과 좋아하는 것을 넣으면 AI가 줄거리와 그림을 함께 만들어요.' },
  { icon: 'theater', title: '동화 극장', body: '한 쪽씩 넘기며 읽고, 소리 버튼을 누르면 또박또박 읽어 줘요.' },
  { icon: 'magic', title: '마법 상자', body: '책 속 캐릭터를 누르면 빙글빙글 돌려 볼 수 있는 3D 모델로 튀어나와요.' },
  { icon: 'factory', title: '장난감 공장', body: '마음에 드는 캐릭터를 wow3d가 검수하고 출력해 피규어로 보내 드려요.' },
  { icon: 'drawing', title: '내 그림이 주인공', body: '아이가 종이에 그린 그림을 찍으면 책 속 그림이 되고 3D 캐릭터가 돼요.' },
  { icon: 'shield', title: '부모님 안심', body: '결제와 주문은 부모 잠금 뒤에 있어요. 광고도, 낯선 사람과의 채팅도 없어요.' },
];

// PRD 8.5 연령별 모드
const AGES = [
  { emoji: '🐣', name: '새싹', age: '3~5세', tone: 'yellow', body: '그림 고르기와 말로 하기만으로 책을 만들고, 읽어 주기와 스티커 중심으로 즐겨요.' },
  { emoji: '🌱', name: '꼬마 작가', age: '6~8세', tone: 'mint', body: '쉬운 문장 고치기, 내 그림 올리기, 3D 마법 상자까지 이야기 공방을 모두 써요.' },
  { emoji: '🌳', name: '작가', age: '9~12세', tone: 'lavender', body: '웹툰 칸 나누기, 말풍선 직접 쓰기, 피규어 받침대 이름 넣기까지 해 봐요.' },
];

// PRD 10장 비기능 요구사항(아동 개인정보·안전 환경·저작권·제품 안전)
const PROMISES = [
  { title: '아이 실명과 연락처를 받지 않아요', body: '아이는 부모님 계정 안에서 별명과 나이만으로 들어와요.' },
  { title: '아이 사진과 그림은 우리 가족만 봐요', body: '가족별로 따로 보관하고, AI 학습에는 쓰지 않아요.' },
  { title: '광고·외부 링크·채팅이 없어요', body: '아이 화면에는 다른 사이트로 나가는 길도, 모르는 사람과 대화하는 기능도 없어요.' },
  { title: '결제와 주문은 부모님만', body: '아이는 "갖고 싶어요"만 누를 수 있고, 승인과 결제는 부모 잠금 뒤에서 해요.' },
  { title: '유명 캐릭터는 만들지 않아요', body: '다른 작가와 회사의 캐릭터·그림체를 따라 하지 않도록 막아 저작권을 지켜요.' },
  { title: '출력 전에 사람이 직접 검수해요', body: 'wow3d 작업자가 얇은 부분, 작은 부품, 마감 상태를 확인한 뒤 출력해요.' },
];

// 화면의 자주 묻는 질문과 FAQPage 구조화 데이터가 같은 내용을 씀 (AEO)
const FAQ = [
  {
    q: '토이북은 어떤 서비스인가요?',
    a: '토이북은 3D프린팅 회사 wow3d가 만든 어린이 그림책 서비스예요. 우리 아이가 주인공인 그림책을 AI로 만들어 읽고, 책 속 캐릭터를 3D 피규어로 받아 볼 수 있어요.',
  },
  {
    q: '몇 살 아이가 쓸 수 있나요?',
    a: '3~12세 어린이를 위해 만들었어요. 나이에 따라 새싹(3~5세), 꼬마 작가(6~8세), 작가(9~12세) 화면으로 바뀌어서 글을 아직 못 읽는 아이도 그림과 소리로 쓸 수 있어요.',
  },
  {
    q: '아이 혼자 써도 괜찮나요?',
    a: '부모님 계정 아래에 아이 프로필을 만들어 쓰는 방식이에요. 아이 화면에는 광고와 외부 링크가 없고, 결제·주문·설정은 어른만 풀 수 있는 부모 잠금 뒤에 있어요.',
  },
  {
    q: '아이 사진이나 그림을 올려도 안전한가요?',
    a: '올린 사진과 그림은 가족별로 나뉜 보관함에 비공개로 저장되고, 다른 가족은 열어 볼 수 없어요. AI 학습 데이터로도 쓰지 않아요.',
  },
  {
    q: '피규어 가격과 제작 기간은 어떻게 되나요?',
    a: '주문 기능을 여는 시점에 크기(5·8·12cm)와 재질별 가격, 제작·배송 기간을 함께 안내해 드릴게요. 모든 피규어는 국내에서 출력해 보내 드려요.',
  },
  {
    q: '3세 미만 아이에게 피규어를 줘도 되나요?',
    a: '피규어에는 작은 부분이 있을 수 있어 3세 미만 아이에게는 권하지 않아요. 주문할 때 크기와 재질에 맞는 안전 안내를 꼭 확인해 주세요.',
  },
  {
    q: '지금 바로 쓸 수 있나요?',
    a: '지금은 미리 보기 단계라 데모 그림책 읽기와 읽어 주기를 해 볼 수 있어요. 책 만들기, 3D 미리 보기, 피규어 주문은 차례로 열릴 예정이에요.',
  },
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

      <footer className="site-footer">
        <Logo />
        <span>wow3d가 만드는 우리 아이 맞춤 그림책과 피규어</span>
        <span className="footer-links">개인정보처리방침 · 이용약관 · 사업자 정보 (정식 출시 때 공개)</span>
        <span>© 2026 wow3d-Toybook (와우쓰리디 - 토이북)</span>
      </footer>
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
