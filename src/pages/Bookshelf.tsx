import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fileUrl } from '../api';
import { ClayIcon, type ClayIconName } from '../components/Icons';
import { useAsync } from '../useAsync';

const MENU: { key: string; icon: ClayIconName; label: string }[] = [
  { key: 'shelf', icon: 'home', label: '우리 집 책장' },
  { key: 'studio', icon: 'studio', label: '이야기 공방' },
  { key: 'magic', icon: 'magic', label: '마법 상자' },
  { key: 'factory', icon: 'factory', label: '장난감 공장' },
];

export default function Bookshelf() {
  const { childId = '' } = useParams();
  const books = useAsync(() => api.books(childId), [childId]);
  const children = useAsync(api.children, []);
  const [notice, setNotice] = useState<string | null>(null);

  const child = children.status === 'ok' ? children.data.find((c) => c.id === childId) : undefined;

  return (
    <main className="screen with-menu">
      <header className="topbar">
        <Link to="/profiles" className="icon-btn" aria-label="프로필 바꾸기">
          {child?.avatar ?? '👤'}
        </Link>
        <h1 className="title-sm">{child ? `${child.nickname}의 책장` : '우리 집 책장'}</h1>
      </header>

      {books.status === 'loading' && <p className="muted">불러오는 중…</p>}
      {books.status === 'error' && <p className="error">{books.message}</p>}
      {books.status === 'ok' && (
        <div className="shelf">
          {books.data.map((b) => (
            <Link key={b.id} to={`/book/${b.id}`} className="book-card">
              <div className="cover">
                {b.cover_key ? <img src={fileUrl(b.cover_key)} alt="" /> : <span aria-hidden>{b.cover_emoji}</span>}
              </div>
              <span className="book-title">{b.title}</span>
              <span className="muted small">{b.page_count}쪽</span>
            </Link>
          ))}
          {books.data.length === 0 && <p className="muted">아직 책이 없어요. 이야기 공방에서 만들어 봐요!</p>}
        </div>
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

      <nav className="bottom-menu">
        {MENU.map((m) => (
          <button
            key={m.key}
            className={`menu-btn ${m.key === 'shelf' ? 'active' : ''}`}
            onClick={() => setNotice(m.key === 'shelf' ? null : `${m.label}은(는) 곧 열려요!`)}
          >
            <ClayIcon name={m.icon} size={40} tile={false} />
            {m.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
