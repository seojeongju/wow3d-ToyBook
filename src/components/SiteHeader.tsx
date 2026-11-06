import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LineIcon } from './Icons';

export function Logo({ variant = 'header' }: { variant?: 'header' | 'hero' }) {
  const goLandingWithReload = (e: MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd/Shift 클릭이나 새 탭 열기는 브라우저 기본 동작 유지
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    window.scrollTo(0, 0);
    window.location.href = '/';
  };

  if (variant === 'hero') {
    return (
      <a href="/" onClick={goLandingWithReload} className="logo logo-hero" aria-label="와우쓰리디 토이북 메인페이지 새로고침 및 이동">
        <img src="/logo-440.webp" width={440} height={440} alt="wow3d-Toybook · 와우쓰리디 - 토이북" className="logo-hero-img" />
      </a>
    );
  }

  return (
    <a href="/" onClick={goLandingWithReload} className="logo" aria-label="와우쓰리디 토이북 메인페이지 새로고침 및 이동">
      <img src="/icon.svg" width="42" height="42" alt="" aria-hidden className="logo-mark" />
      <span className="logo-wordmark">
        <strong className="logo-en">
          <span className="logo-wow">wow3d</span>-Toybook
        </strong>
        <small className="logo-ko">와우쓰리디 - 토이북</small>
      </span>
    </a>
  );
}

// 공개 페이지는 실제 주소로 연결 (검색엔진이 따라가는 내부 링크), 홈 섹션은 해시 링크
const NAV = [
  { href: '/about', label: '토이북 소개' },
  { href: '/#how', label: '만드는 방법' },
  { href: '/figure', label: '피규어 안내' },
  { href: '/safety', label: '안심 약속' },
  { href: '/faq', label: '자주 묻는 질문' },
];

const SUB_NAV = [
  { to: '/', icon: 'home' as const, label: '메인페이지' },
  { to: '/profiles', icon: 'book' as const, label: '아이 책장' },
  { to: '/parent', icon: 'grid' as const, label: '부모 모드' },
  { to: '/login', icon: 'users' as const, label: '로그인' },
];

export interface SubHeaderProps {
  /** 페이지 왼쪽 보조 버튼 (뒤로가기·프로필 전환 등) */
  left?: ReactNode;
  /** 현재 화면 제목 */
  title?: string;
  /** 페이지 오른쪽 보조 버튼 (소리 켜기·읽어 주기 등) */
  right?: ReactNode;
}

/**
 * 모든 서브 페이지 상단에 표시되는 공통 헤더 메뉴.
 * 로고 클릭 또는 '메인페이지' 메뉴 버튼으로 언제든 홈(/)으로 이동할 수 있음.
 */
export function SubHeader({ left, title, right }: SubHeaderProps) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const hasPageBar = Boolean(left || title);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className={`sub-header-wrap ${open ? 'menu-open' : ''}`}>
      <div className="site-header sub-header">
        <Logo />

        <nav id="sub-site-nav" className="site-nav sub-nav" aria-label="서브 페이지 이동 메뉴">
          {SUB_NAV.map((item) => {
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`sub-nav-link ${active ? 'active' : ''} ${item.to === '/' ? 'home-highlight' : ''}`}
                onClick={() => setOpen(false)}
              >
                <LineIcon name={item.icon} size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sub-header-actions">
          {!hasPageBar && right}
          <Link to="/" className="pill-btn small-pill sub-home-btn" aria-label="메인페이지로 이동">
            <LineIcon name="home" size={18} />
            <span>메인으로</span>
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="sub-site-nav"
            aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {hasPageBar && (
        <div className="sub-pagebar">
          {left && <div className="sub-pagebar-left">{left}</div>}
          {title && <h1 className="title-sm sub-pagebar-title">{title}</h1>}
          {right && <div className="sub-pagebar-right">{right}</div>}
        </div>
      )}
    </header>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { hash } = useLocation();

  // 메뉴에서 섹션을 고르면 닫기
  useEffect(() => setOpen(false), [hash]);

  return (
    <header className={`site-header ${open ? 'menu-open' : ''}`}>
      <Logo />
      <nav id="site-nav" className="site-nav" aria-label="주요 메뉴">
        {NAV.map((n) =>
          n.href.includes('#') ? (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ) : (
            <Link key={n.href} to={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ),
        )}
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
