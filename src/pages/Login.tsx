import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loginUrl, logout, PROVIDER_NAME, useMe, type Provider } from '../auth';
import { SubHeader } from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import ClayArt from '../components/ClayArt';

/**
 * 로그인·회원가입 (간편 가입: 카카오·네이버·구글).
 * 비밀번호는 만들지 않음. 처음 온 사람은 간편 로그인 → /signup 에서 약관 동의 → 가입 완료
 * 운영자 로그인은 관리자 기능을 열 때 따로 붙임
 */
const ERRORS: Record<string, string> = {
  not_ready: '이 로그인 방법은 아직 준비 중이에요. 다른 방법으로 시작해 주세요.',
  cancelled: '로그인을 취소했어요. 다시 하려면 아래 버튼을 눌러 주세요.',
  expired: '로그인 시간이 지났어요. 버튼을 한 번 더 눌러 주세요.',
  provider: '로그인 서버와 연결하지 못했어요. 잠시 뒤 다시 해 주세요.',
  under14: '토이북 가입은 만 14세 이상 보호자만 할 수 있어요. 어린이는 보호자 계정 안의 프로필로 함께 이용해 주세요.',
};

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  const error = ERRORS[params.get('error') ?? ''];
  const { loading, user, available, reload } = useMe();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
    reload();
  };

  return (
    <div className="login-page">
      <Decor />
      <div className="login-header-wrap">
        <SubHeader />
      </div>

      <section className="login-card">
        <span className="login-heart" aria-hidden>
          <ClayArt name="heart" size={40} />
        </span>
        <h1 className="login-title">
          <span className="spark" aria-hidden />
          토이북 시작하기
          <span className="spark right" aria-hidden />
        </h1>
        <p className="login-sub">카카오·네이버·구글 계정으로 간편하게 로그인하고 가입해요</p>

        <div className="login-mascot">
          <Tobi pose="peek" size={190} />
        </div>

        <div className="login-form">
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="login-wait" aria-busy="true">
              확인하는 중…
            </p>
          ) : user?.status === 'active' ? (
            <div className="login-done">
              <p>
                <strong>{user.name}</strong>님, 로그인되어 있어요.
              </p>
              <button type="button" className="login-btn" onClick={() => navigate(next ?? '/profiles')}>
                우리 아이 책장으로
              </button>
              {user.isAdmin && (
                <Link to="/admin" className="login-sub-btn">
                  운영자 화면
                </Link>
              )}
              <button type="button" className="login-sub-btn" onClick={signOut} disabled={busy}>
                로그아웃
              </button>
            </div>
          ) : user?.status === 'pending' ? (
            <div className="login-done">
              <p>
                <strong>{user.name}</strong>님, 약관 동의만 하면 가입이 끝나요.
              </p>
              <Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="login-btn">
                가입 마저 하기
              </Link>
            </div>
          ) : (
            <>
              <div className="sns-list">
                {(['kakao', 'naver', 'google'] as const).map((p) => (
                  <SnsButton key={p} provider={p} ready={available.includes(p)} next={next} />
                ))}
                {available.includes('dev') && <SnsButton provider="dev" ready next={next} />}
              </div>
              <p className="login-help">
                처음이라면 로그인한 뒤 약관에 동의하면 가입이 끝나요. 비밀번호는 따로 만들지 않아요.
                <br />
                가입은 만 14세 이상 보호자만 할 수 있고, 아이는 보호자 계정 안의 프로필로 들어와요.
              </p>
            </>
          )}

          <div className="or-line">
            <span>먼저 둘러보기</span>
          </div>
          <div className="login-demo">
            <Link to="/profiles" className="demo-link">
              데모 책장
            </Link>
            <Link to="/parent" className="demo-link">
              부모 대시보드 데모
            </Link>
          </div>

          <p className="signup">
            가입하면 <Link to="/terms">이용약관</Link>과 <Link to="/privacy">개인정보처리방침</Link>을 확인할 수 있어요.
          </p>
        </div>
      </section>
    </div>
  );
}

/** 각 회사 디자인 규칙에 맞춘 간편 로그인 버튼 (상표 로고라 점토 스타일 대신 공식 색·모양 그대로) */
function SnsButton({ provider, ready, next }: { provider: Provider; ready: boolean; next: string | null }) {
  const label: Record<Provider, string> = {
    kakao: '카카오 로그인',
    naver: '네이버 로그인',
    google: 'Google 계정으로 로그인',
    dev: '시험용 로그인 (로컬 전용)',
  };
  const body = (
    <>
      <span className="sns-logo" aria-hidden>
        {LOGOS[provider]}
      </span>
      <span className="sns-label">{label[provider]}</span>
      {!ready && <span className="sns-soon">준비 중</span>}
    </>
  );
  if (!ready) {
    return (
      <span className={`sns-btn ${provider} is-off`} aria-disabled="true" title={`${PROVIDER_NAME[provider]} 로그인은 준비 중이에요`}>
        {body}
      </span>
    );
  }
  return (
    <a className={`sns-btn ${provider}`} href={loginUrl(provider, next)}>
      {body}
    </a>
  );
}

const LOGOS: Record<Provider, ReactNode> = {
  kakao: (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M12 3.5C6.8 3.5 2.6 6.8 2.6 10.9c0 2.6 1.7 4.9 4.3 6.2l-1.1 4c-.1.3.3.6.6.4l4.7-3.1c.3 0 .6.1.9.1 5.2 0 9.4-3.3 9.4-7.4S17.2 3.5 12 3.5z" fill="#000" />
    </svg>
  ),
  naver: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M14.6 12.4 9.1 4.5H5v15h4.4v-7.9l5.5 7.9H19v-15h-4.4z" fill="#fff" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 48 48" width="20" height="20">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  ),
  dev: <ClayArt name="robot" size={26} />,
};

/** 배경 장식: 구름·화분·꽃 (점토 느낌) */
function Decor() {
  return (
    <div className="login-decor" aria-hidden>
      <svg className="cloud c1" viewBox="0 0 120 60">
        <path d="M20 50 a18 18 0 0 1 6 -34 a24 24 0 0 1 44 -4 a20 20 0 0 1 30 18 a16 16 0 0 1 -4 20 z" fill="#fffaf6" />
      </svg>
      <svg className="cloud c2" viewBox="0 0 120 60">
        <path d="M20 50 a18 18 0 0 1 6 -34 a24 24 0 0 1 44 -4 a20 20 0 0 1 30 18 a16 16 0 0 1 -4 20 z" fill="#fffaf6" />
      </svg>
      <svg className="plant" viewBox="0 0 160 260">
        <defs>
          <radialGradient id="lg-leaf" cx="35%" cy="30%" r="85%">
            <stop offset="0" stopColor="#bfe3a8" />
            <stop offset="0.6" stopColor="#7fb069" />
            <stop offset="1" stopColor="#557f45" />
          </radialGradient>
          <radialGradient id="lg-pot" cx="35%" cy="25%" r="85%">
            <stop offset="0" stopColor="#f5ddc2" />
            <stop offset="0.6" stopColor="#ddb48c" />
            <stop offset="1" stopColor="#b98c63" />
          </radialGradient>
        </defs>
        <path d="M80 180 V40" stroke="#6b9a57" strokeWidth="5" />
        <ellipse cx="56" cy="70" rx="30" ry="14" transform="rotate(-30 56 70)" fill="url(#lg-leaf)" />
        <ellipse cx="106" cy="96" rx="30" ry="14" transform="rotate(30 106 96)" fill="url(#lg-leaf)" />
        <ellipse cx="52" cy="124" rx="32" ry="15" transform="rotate(-25 52 124)" fill="url(#lg-leaf)" />
        <ellipse cx="108" cy="148" rx="30" ry="14" transform="rotate(25 108 148)" fill="url(#lg-leaf)" />
        <ellipse cx="82" cy="36" rx="12" ry="24" fill="url(#lg-leaf)" />
        <path d="M34 176 h92 l-10 72 a10 10 0 0 1 -10 9 h-52 a10 10 0 0 1 -10 -9 z" fill="url(#lg-pot)" />
        <rect x="28" y="170" width="104" height="18" rx="9" fill="#e7c6a3" />
      </svg>
      <svg className="flower" viewBox="0 0 140 220">
        <defs>
          <radialGradient id="lg-petal" cx="35%" cy="30%" r="85%">
            <stop offset="0" stopColor="#ffd3dc" />
            <stop offset="0.6" stopColor="#f4a0b2" />
            <stop offset="1" stopColor="#d97890" />
          </radialGradient>
          <radialGradient id="lg-fpot" cx="35%" cy="25%" r="85%">
            <stop offset="0" stopColor="#ffc9b8" />
            <stop offset="0.6" stopColor="#f39a83" />
            <stop offset="1" stopColor="#d4735d" />
          </radialGradient>
        </defs>
        <path d="M70 150 V70" stroke="#6b9a57" strokeWidth="5" />
        <ellipse cx="50" cy="120" rx="20" ry="9" transform="rotate(-30 50 120)" fill="#7fb069" />
        <ellipse cx="92" cy="128" rx="20" ry="9" transform="rotate(30 92 128)" fill="#7fb069" />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="70" cy="44" rx="15" ry="22" fill="url(#lg-petal)" transform={`rotate(${a} 70 66)`} />
        ))}
        <circle cx="70" cy="66" r="13" fill="#ffd166" />
        <path d="M28 150 h84 l-8 56 a10 10 0 0 1 -10 9 h-48 a10 10 0 0 1 -10 -9 z" fill="url(#lg-fpot)" />
        <rect x="22" y="144" width="96" height="16" rx="8" fill="#f6b19e" />
      </svg>
    </div>
  );
}
