import { Link, NavLink } from 'react-router-dom';
import { LineIcon } from './Icons';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="토이북 홈">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden>
        <defs>
          <radialGradient id="logo-a" cx="32%" cy="28%" r="80%">
            <stop offset="0" stopColor="#c9b8f6" />
            <stop offset="0.55" stopColor="#9a7fe4" />
            <stop offset="1" stopColor="#6f51c8" />
          </radialGradient>
        </defs>
        <path d="M6 20 C18 14 28 15 32 22 V54 C27 48 18 47 6 52 Z" fill="url(#logo-a)" />
        <path d="M58 20 C46 14 36 15 32 22 V54 C37 48 46 47 58 52 Z" fill="#b6a2f2" />
        <circle cx="32" cy="12" r="7" fill="#ffc94d" />
      </svg>
      <span>토이북</span>
    </Link>
  );
}

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Logo />
      <nav className="site-nav" aria-label="주요 메뉴">
        <NavLink to="/" end>
          홈
        </NavLink>
        <a href="/#features">할 수 있는 것</a>
        <NavLink to="/profiles">우리 집 책장</NavLink>
        <NavLink to="/parent">부모 모드</NavLink>
      </nav>
      <Link to="/login" className="ghost-link login-link">
        로그인
      </Link>
      <Link to="/profiles" className="pill-btn small-pill">
        시작하기 <LineIcon name="arrow" size={18} />
      </Link>
    </header>
  );
}
