import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LineIcon } from '../components/Icons';
import { SubHeader } from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import ClayArt from '../components/ClayArt';

type Role = 'parent' | 'admin';

/**
 * 로그인 화면 (템플릿). 실제 인증은 아직 연결 전이라 버튼은 안내만 하고,
 * 데모 대시보드로 가는 길을 열어 둠. 연동 시 handleSubmit·SOCIAL 의 onClick 만 교체하면 됨.
 */
export default function Login() {
  const [role, setRole] = useState<Role>('parent');
  const [showPw, setShowPw] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNotice('로그인은 아직 연결 전이에요. 아래 데모로 먼저 둘러보세요.');
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
          다시 만나서 반가워요
          <span className="spark right" aria-hidden />
        </h1>
        <p className="login-sub">로그인하고 우리 아이 책장을 열어요</p>

        <div className="login-mascot">
          <Tobi pose="peek" size={190} />
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="role-switch" role="tablist" aria-label="로그인 대상">
            <button type="button" role="tab" aria-selected={role === 'parent'} className={role === 'parent' ? 'on' : ''} onClick={() => setRole('parent')}>
              부모님
            </button>
            <button type="button" role="tab" aria-selected={role === 'admin'} className={role === 'admin' ? 'on' : ''} onClick={() => setRole('admin')}>
              wow3d 운영자
            </button>
          </div>

          <label className="field">
            <span className="field-icon">
              <LineIcon name="mail" size={20} />
            </span>
            <input type="email" placeholder="이메일" autoComplete="username" aria-label="이메일" />
          </label>
          <label className="field">
            <span className="field-icon">
              <LineIcon name="lock" size={20} />
            </span>
            <input type={showPw ? 'text' : 'password'} placeholder="비밀번호" autoComplete="current-password" aria-label="비밀번호" />
            <button type="button" className="field-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}>
              <LineIcon name={showPw ? 'eyeOff' : 'eye'} size={20} />
            </button>
          </label>
          <button type="button" className="forgot" onClick={() => setNotice('비밀번호 찾기는 로그인 연동 때 함께 열려요.')}>
            비밀번호를 잊으셨나요?
          </button>

          <button type="submit" className="login-btn">
            로그인
          </button>

          {role === 'parent' && (
            <>
              <div className="or-line">
                <span>또는 간편 로그인</span>
              </div>
              <div className="social">
                {SOCIAL.map((s) => (
                  <button key={s.name} type="button" className="social-btn" aria-label={`${s.name}로 로그인`} onClick={() => setNotice(`${s.name} 로그인은 곧 연결돼요.`)}>
                    {s.icon}
                  </button>
                ))}
              </div>
            </>
          )}

          {notice && (
            <div className="login-notice" role="status">
              <p>{notice}</p>
              <div>
                <Link to="/parent" className="demo-link">
                  부모 대시보드 데모
                </Link>
                <Link to="/admin" className="demo-link">
                  관리자 대시보드 데모
                </Link>
              </div>
            </div>
          )}

          <p className="signup">
            아직 회원이 아니신가요?{' '}
            <button type="button" onClick={() => setNotice('회원가입은 로그인 연동 때 함께 열려요.')}>
              가입하기
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

const SOCIAL = [
  {
    name: '카카오',
    icon: (
      <svg viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="20" fill="#FEE500" />
        <path d="M20 11c-6 0-10.5 3.7-10.5 8.2 0 2.9 1.9 5.4 4.8 6.9l-1 3.7c-.1.3.3.6.6.4l4.3-2.9c.6.1 1.2.1 1.8.1 6 0 10.5-3.7 10.5-8.2S26 11 20 11z" fill="#191919" />
      </svg>
    ),
  },
  {
    name: '네이버',
    icon: (
      <svg viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="20" fill="#03C75A" />
        <path d="M14 13h4.6l4 6.2V13H27v14h-4.6l-4-6.2V27H14z" fill="#fff" />
      </svg>
    ),
  },
  {
    name: '구글',
    icon: (
      <svg viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="20" fill="#fff" />
        <path d="M29 20.2c0-.7-.1-1.3-.2-1.9H20v3.6h5c-.2 1.2-.9 2.2-1.9 2.8v2.4h3.1c1.8-1.7 2.8-4.1 2.8-6.9z" fill="#4285F4" />
        <path d="M20 29.5c2.6 0 4.7-.9 6.2-2.3l-3.1-2.4c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.2-3.8h-3.2v2.5c1.5 3 4.7 5.1 8.4 5.1z" fill="#34A853" />
        <path d="M14.8 21.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9v-2.5h-3.2c-.7 1.3-1 2.8-1 4.4s.4 3.1 1 4.4z" fill="#FBBC05" />
        <path d="M20 14.3c1.4 0 2.6.5 3.6 1.4l2.7-2.7c-1.6-1.5-3.8-2.5-6.3-2.5-3.7 0-6.9 2.1-8.4 5.1l3.2 2.5c.8-2.2 2.8-3.8 5.2-3.8z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    name: '애플',
    icon: (
      <svg viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="20" fill="#111" />
        <path d="M24.3 20.6c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8s-1.7-.8-2.9-.8c-1.5 0-2.8.9-3.6 2.2-1.5 2.7-.4 6.6 1.1 8.7.7 1.1 1.6 2.2 2.7 2.2s1.5-.7 2.8-.7 1.7.7 2.9.7 1.9-1.1 2.6-2.1c.8-1.2 1.1-2.4 1.2-2.4-.1 0-2.2-.9-2.2-3.6zM22.2 14c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.6 1.3-.6.6-1.1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2z" fill="#fff" />
      </svg>
    ),
  },
];

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
