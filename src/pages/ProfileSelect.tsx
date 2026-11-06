import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { LineIcon } from '../components/Icons';
import { Logo } from '../components/SiteHeader';
import { useAsync } from '../useAsync';
import { ClayEmoji } from '../components/ClayArt';

export default function ProfileSelect() {
  const navigate = useNavigate();
  const children = useAsync(api.children, []);

  return (
    <main className="screen center">
      <Logo variant="hero" />
      <h1 className="title">누가 볼까요?</h1>

      {children.status === 'loading' && <p className="muted">불러오는 중…</p>}
      {children.status === 'error' && <p className="error">{children.message}</p>}
      {children.status === 'ok' && (
        <div className="profiles">
          {children.data.map((c) => (
            <button key={c.id} className="profile" onClick={() => navigate(`/shelf/${c.id}`)}>
              <span className="avatar" aria-hidden>
                <ClayEmoji emoji={c.avatar} size={110} />
              </span>
              <span className="profile-name">{c.nickname}</span>
            </button>
          ))}
          {children.data.length === 0 && <p className="muted">아직 아이 프로필이 없어요. 부모 모드에서 추가해 주세요.</p>}
        </div>
      )}

      <Link to="/parent" className="parent-link">
        <LineIcon name="lock" size={18} /> 부모 모드
      </Link>
    </main>
  );
}
