import { Link } from 'react-router-dom';
import { Logo } from './SiteHeader';

/** 공개 페이지 공용 바닥글: 모든 소개 페이지를 서로 잇는 내부 링크 (SEO) */
export const INFO_LINKS = [
  { to: '/about', label: '토이북 소개' },
  { to: '/figure', label: '3D 피규어 안내' },
  { to: '/safety', label: '안심 약속' },
  { to: '/faq', label: '자주 묻는 질문' },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <Logo />
      <span>wow3d가 만드는 우리 아이 맞춤 그림책과 피규어</span>
      <nav className="footer-nav" aria-label="토이북 안내 페이지">
        {INFO_LINKS.map((l) => (
          <Link key={l.to} to={l.to}>
            {l.label}
          </Link>
        ))}
      </nav>
      <nav className="footer-nav footer-legal" aria-label="약관과 정책">
        <Link to="/privacy">
          <strong>개인정보처리방침</strong>
        </Link>
        <Link to="/terms">이용약관</Link>
        <Link to="/licenses">오픈소스 라이선스</Link>
      </nav>
      <span className="footer-links">사업자 정보는 정식 출시 때 공개해요</span>
      <span>© 2026 wow3d-Toybook (와우쓰리디 - 토이북)</span>
    </footer>
  );
}
