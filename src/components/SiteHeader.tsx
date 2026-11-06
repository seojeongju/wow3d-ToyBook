import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LineIcon } from './Icons';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="토이북 처음으로">
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

const NAV = [
  { href: '/#how', label: '만드는 방법' },
  { href: '/#preview', label: '미리 읽기' },
  { href: '/#safety', label: '안심 약속' },
  { href: '/#faq', label: '자주 묻는 질문' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { hash } = useLocation();

  // 메뉴에서 섹션을 고르면 닫기
  useEffect(() => setOpen(false), [hash]);

  return (
    <header className={`site-header ${open ? 'menu-open' : ''}`}>
      <Logo />
      <nav id="site-nav" className="site-nav" aria-label="주요 메뉴">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
            {n.label}
          </a>
        ))}
        <Link to="/login" className="nav-login">
          로그인
        </Link>
      </nav>
      <Link to="/login" className="ghost-link login-link">
        로그인
      </Link>
      <Link to="/profiles" className="pill-btn small-pill">
        시작하기 <LineIcon name="arrow" size={18} />
      </Link>
      <button
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}
