import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LineIcon, type LineIconName } from './Icons';

export interface DashMenuItem {
  icon: LineIconName;
  label: string;
  /** 연결된 화면이 있으면 경로, 없으면 "준비 중" 안내 */
  to?: string;
}

interface Props {
  title: string;
  profile: { avatar: ReactNode; name: string; sub: string };
  menu: DashMenuItem[];
  active: number;
  promo?: ReactNode;
  /** 예시 데이터를 쓰는 화면이면 상단에 표시 */
  sampleNote?: string;
  onLogout: () => void;
  children: ReactNode;
}

export default function DashLayout({ title, profile, menu, active, promo, sampleNote, onLogout, children }: Props) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-profile">
          <span className="dash-avatar">{profile.avatar}</span>
          <strong>{profile.name}</strong>
          <span>{profile.sub}</span>
        </div>
        <nav className="dash-menu" aria-label="대시보드 메뉴">
          {menu.map((m, i) =>
            m.to ? (
              <Link key={m.label} to={m.to} className={`dash-link ${i === active ? 'active' : ''}`}>
                <LineIcon name={m.icon} size={22} />
                {m.label}
              </Link>
            ) : (
              <button
                key={m.label}
                className={`dash-link ${i === active ? 'active' : ''}`}
                onClick={() => setNotice(`${m.label} 화면은 곧 열려요`)}
              >
                <LineIcon name={m.icon} size={22} />
                {m.label}
              </button>
            ),
          )}
        </nav>
        {promo && <div className="dash-promo">{promo}</div>}
        <button className="dash-link dash-logout" onClick={onLogout}>
          <LineIcon name="logout" size={22} />
          나가기
        </button>
      </aside>

      <main className="dash-main">
        <header className="dash-top">
          <h1>{title}</h1>
          <label className="dash-search">
            <LineIcon name="search" size={20} />
            <input placeholder="책, 아이, 주문 검색" aria-label="검색" />
          </label>
          <button className="dash-round" aria-label="알림" onClick={() => setNotice('새 알림이 없어요')}>
            <LineIcon name="bell" size={22} />
          </button>
        </header>
        {sampleNote && <p className="sample-note">{sampleNote}</p>}
        {children}
      </main>

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </div>
  );
}
