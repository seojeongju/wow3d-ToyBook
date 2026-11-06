import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LineIcon } from './Icons';

export function Logo({ variant = 'header' }: { variant?: 'header' | 'hero' }) {
  if (variant === 'hero') {
    return (
      <Link to="/" className="logo logo-hero" aria-label="와우쓰리디 토이북 처음으로">
        <img src="/logo.jpg" alt="wow3d-Toybook · 와우쓰리디 - 토이북" className="logo-hero-img" />
      </Link>
    );
  }

  return (
    <Link to="/" className="logo" aria-label="와우쓰리디 토이북 처음으로">
      <img src="/icon.svg" width="42" height="42" alt="" aria-hidden className="logo-mark" />
      <span className="logo-wordmark">
        <strong className="logo-en">
          <span className="logo-wow">wow3d</span>-Toybook
        </strong>
        <small className="logo-ko">와우쓰리디 - 토이북</small>
      </span>
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
