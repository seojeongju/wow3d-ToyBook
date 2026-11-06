import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { ClayEmoji } from '../components/ClayArt';
import { ClayIcon, type ClayIconName } from '../components/Icons';
import RoomPicker from '../components/RoomPicker';
import ShelfScene from '../components/ShelfScene';
import { SubHeader } from '../components/SiteHeader';
import { josa } from '../korean';
import { findRoom, loadRoomId, saveRoomId } from '../rooms/templates';
import { speak, stopSpeaking } from '../speech';
import { useAsync } from '../useAsync';

const MENU: { key: string; icon: ClayIconName; label: string }[] = [
  { key: 'shelf', icon: 'home', label: '우리 집 책장' },
  { key: 'studio', icon: 'studio', label: '이야기 공방' },
  { key: 'magic', icon: 'magic', label: '마법 상자' },
  { key: 'factory', icon: 'factory', label: '장난감 공장' },
];

export default function Bookshelf() {
  const { childId = '' } = useParams();
  const navigate = useNavigate();
  const books = useAsync(() => api.books(childId), [childId]);
  const children = useAsync(api.children, []);
  const [notice, setNotice] = useState<string | null>(null);
  const [room, setRoom] = useState(() => findRoom(loadRoomId(childId)));
  const [picking, setPicking] = useState(false);

  const child = children.status === 'ok' ? children.data.find((c) => c.id === childId) : undefined;
  const title = child ? `${child.nickname}의 책장` : '우리 집 책장';

  useEffect(() => setRoom(findRoom(loadRoomId(childId))), [childId]);
  useEffect(() => () => stopSpeaking(), []);

  // 안내는 잠깐 보여 주고 사라짐 (말로도 읽어 줌)
  const tell = (text: string) => {
    setNotice(text);
    speak(text);
  };
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [notice]);

  return (
    <main className="screen with-menu shelf-screen">
      <SubHeader
        left={
          <Link to="/profiles" className="icon-btn" aria-label="프로필 바꾸기">
            <ClayEmoji emoji={child?.avatar ?? '🐻'} size={46} />
          </Link>
        }
        title={title}
        right={
          <button className="decorate-btn" onClick={() => setPicking(true)} aria-label="책장 꾸미기">
            <ClayIcon name="drawing" size={30} tile={false} />
            <span>책장 꾸미기</span>
          </button>
        }
      />

      {books.status === 'loading' && <div className="room-skeleton" aria-busy="true" aria-label="책장을 여는 중" />}
      {books.status === 'error' && (
        <div className="who-empty">
          <ClayEmoji emoji="🤖" size={110} />
          <p>앗, 책장을 열지 못했어요.</p>
          <button className="pill-btn small-pill" onClick={() => window.location.reload()}>
            다시 해 보기
          </button>
        </div>
      )}
      {books.status === 'ok' && (
        <>
          <ShelfScene
            room={room}
            books={books.data}
            plaque={title}
            onPick={(b) => speak(`${josa(b.title, '을', '를')} 펼쳐요!`)}
            onOpen={(b) => navigate(`/book/${b.id}`)}
            onNewBook={() => tell('이야기 공방에서 새 책을 만들 수 있어요. 곧 열려요!')}
          />
          {books.data.length === 0 && <p className="who-hint">아직 책이 없어요. 반짝이는 + 자리를 눌러 보세요!</p>}
        </>
      )}

      {picking && (
        <RoomPicker
          current={room.id}
          onClose={() => setPicking(false)}
          onPick={(r) => {
            setRoom(r);
            saveRoomId(childId, r.id);
            setPicking(false);
            tell(`${josa(r.name, '으로', '로')} 바꿨어요!`);
          }}
          onPhoto={() => tell('내 방 사진으로 책장을 만드는 기능은 곧 열려요. 어른과 함께 해요!')}
        />
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
            onClick={() => (m.key === 'shelf' ? tell(`여기는 ${title}이에요`) : tell(`${josa(m.label, '은', '는')} 곧 열려요!`))}
          >
            <ClayIcon name={m.icon} size={40} tile={false} />
            {m.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
