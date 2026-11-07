import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import { ClayIcon, LineIcon, type ClayIconName } from '../components/Icons';
import RoomPicker from '../components/RoomPicker';
import { FactorySheet, MagicBoxSheet } from '../components/ShelfModals';
import StoryStudio from '../components/StoryStudio';
import ShelfScene from '../components/ShelfScene';
import { SubHeader } from '../components/SiteHeader';
import { josa } from '../korean';
import { loadPalette, savePalette } from '../rooms/palette';
import { findRoom, loadRoomId, saveRoomId } from '../rooms/templates';
import {
  findShelfFigure,
  loadReadBookIds,
  loadShelfFigureId,
  loadShelfNight,
  saveShelfFigureId,
  saveShelfNight,
  type ShelfFigureId,
} from '../shelfState';
import { speak, stopSpeaking } from '../speech';
import { useAsync } from '../useAsync';

type ModalKey = 'studio' | 'magic' | 'factory' | null;

const MENU: { key: 'shelf' | 'studio' | 'magic' | 'factory'; icon: ClayIconName; label: string }[] = [
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
  // 1.5단계: 방 사진에서 뽑은 색 (기기에만 기억)
  const [palette, setPalette] = useState(() => loadPalette(childId));
  const [picking, setPicking] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  // 고도화 상태: 다 읽은 책 별 스티커, 진열대 3D 피규어, 낮/밤 무드등
  const [readIds, setReadIds] = useState<string[]>(() => loadReadBookIds(childId));
  const [figureId, setFigureId] = useState<ShelfFigureId>(() => loadShelfFigureId(childId));
  const [nightMode, setNightMode] = useState<boolean>(() => loadShelfNight(childId));

  const child = children.status === 'ok' ? children.data.find((c) => c.id === childId) : undefined;
  const title = child ? `${child.nickname}의 책장` : '우리 집 책장';
  const activeFigure = findShelfFigure(figureId);

  useEffect(() => {
    setRoom(findRoom(loadRoomId(childId)));
    setPalette(loadPalette(childId));
    const mergedRead = Array.from(new Set([...loadReadBookIds(childId), ...loadReadBookIds('default')]));
    setReadIds(mergedRead);
    setFigureId(loadShelfFigureId(childId));
    setNightMode(loadShelfNight(childId));
  }, [childId]);

  useEffect(() => () => stopSpeaking(), []);

  // 오프라인 보기: 책장에 꽂힌 책 내용을 미리 받아 두면 인터넷이 끊겨도 읽을 수 있음 (서비스 워커가 보관)
  useEffect(() => {
    if (books.status !== 'ok' || !navigator.serviceWorker?.controller) return;
    for (const b of books.data) fetch(`/api/books/${encodeURIComponent(b.id)}`).catch(() => {});
  }, [books]);

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

  const handleToggleNight = () => {
    const next = !nightMode;
    setNightMode(next);
    saveShelfNight(childId, next);
    setNotice(next ? '🌙 포근한 밤 무드등을 켰어요!' : '☀️ 환한 낮 조명으로 바꿨어요!');
  };

  const handleSelectFigure = (nextId: ShelfFigureId) => {
    setFigureId(nextId);
    saveShelfFigureId(childId, nextId);
    const f = findShelfFigure(nextId);
    tell(`책장 진열대에 ${f.name} 피규어를 올려두었어요!`);
  };

  const bookList = books.status === 'ok' ? books.data : [];
  const readCount = bookList.filter((b) => readIds.includes(b.id)).length;
  const recommendedBook = bookList.find((b) => !readIds.includes(b.id)) ?? bookList[0];

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
          <div className="shelf-header-actions">
            <button
              type="button"
              className={`mood-toggle-btn ${nightMode ? 'on' : ''}`}
              onClick={handleToggleNight}
              aria-pressed={nightMode}
              aria-label={nightMode ? '낮 모드로 바꾸기' : '밤 무드등 켜기'}
            >
              <ClayArt name={nightMode ? 'moon' : 'star'} size={22} />
              <span>{nightMode ? '밤 무드등' : '낮 조명'}</span>
            </button>
            <button className="decorate-btn" onClick={() => setPicking(true)} aria-label="책장 꾸미기">
              <ClayIcon name="drawing" size={30} tile={false} />
              <span>책장 꾸미기</span>
            </button>
          </div>
        }
      />

      {/* 상단: 독서 칭찬 별 스티커북 & 내 피규어 · 추천 책 바로 읽기 바 */}
      {books.status === 'ok' && (
        <section className="shelf-status-bar" aria-label="나의 독서 별과 오늘의 추천 책">
          <div className="shelf-star-pill" onClick={() => setActiveModal('magic')} role="button" tabIndex={0}>
            <span className="shelf-star-icons" aria-hidden>
              {Array.from({ length: Math.max(bookList.length, 2) }, (_, i) => (
                <i key={i} className={i < readCount ? 'filled' : ''}>
                  ★
                </i>
              ))}
            </span>
            <span className="shelf-star-text">
              독서 별 <strong>{readCount}개</strong>
            </span>
          </div>

          <button
            type="button"
            className={`shelf-figure-chip tone-${activeFigure.tone}`}
            onClick={() => {
              speak(activeFigure.greeting, { force: true, style: 'mascot' });
              setActiveModal('magic');
            }}
          >
            <ClayArt name={activeFigure.art} size={24} />
            <span>내 피규어 · {activeFigure.name}</span>
          </button>

          {recommendedBook && (
            <button
              type="button"
              className="shelf-quick-read-btn"
              onClick={() => {
                speak(`${josa(recommendedBook.title, '을', '를')} 펼쳐요!`);
                navigate(`/book/${recommendedBook.id}`);
              }}
            >
              <LineIcon name="speaker" size={16} />
              <span>오늘의 책 바로 읽기</span>
            </button>
          )}
        </section>
      )}

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
            palette={palette}
            books={books.data}
            plaque={title}
            readBookIds={readIds}
            figureId={figureId}
            nightMode={nightMode}
            onToggleNight={handleToggleNight}
            onFigureClick={() => {
              speak(activeFigure.greeting, { force: true, style: 'mascot' });
              setActiveModal('magic');
            }}
            onPick={(b) => speak(`${josa(b.title, '을', '를')} 펼쳐요!`)}
            onOpen={(b) => navigate(`/book/${b.id}`)}
            onNewBook={() => {
              speak('이야기 공방에서 새 책을 만들 수 있어요!');
              setActiveModal('studio');
            }}
          />
          {books.data.length === 0 && <p className="who-hint">아직 책이 없어요. 반짝이는 + 자리를 눌러 보세요!</p>}
        </>
      )}

      {picking && (
        <RoomPicker
          current={room.id}
          palette={palette}
          onClose={() => setPicking(false)}
          onPick={(r) => {
            setRoom(r);
            saveRoomId(childId, r.id);
            setPicking(false);
            tell(`${josa(r.name, '으로', '로')} 바꿨어요!`);
          }}
          onPalette={(p) => {
            setPalette(p);
            savePalette(childId, p);
            setPicking(false);
            tell(p ? '우리 방 색으로 꾸몄어요!' : '원래 색으로 돌아왔어요!');
          }}
          onPhoto={() => tell('내 방 사진으로 책장을 만드는 기능은 곧 열려요. 어른과 함께 해요!')}
        />
      )}

      {/* 하단 탭 인터랙티브 모달 3종 (이야기 공방 · 마법 상자 · 장난감 공장) */}
      {activeModal === 'studio' && (
        <StoryStudio
          child={child}
          initialFigureId={figureId}
          onCreated={(bookId) => navigate(`/book/${bookId}`)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'magic' && (
        <MagicBoxSheet
          activeFigureId={figureId}
          onSelectFigure={handleSelectFigure}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'factory' && (
        <FactorySheet
          childId={childId}
          activeFigureId={figureId}
          onWishSaved={(msg) => tell(msg)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

      <nav className="bottom-menu">
        {MENU.map((m) => {
          const isActive = m.key === 'shelf' ? activeModal === null : activeModal === m.key;
          return (
            <button
              key={m.key}
              className={`menu-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (m.key === 'shelf') {
                  setActiveModal(null);
                  tell(`여기는 ${title}이에요`);
                } else {
                  setActiveModal(m.key);
                }
              }}
            >
              <ClayIcon name={m.icon} size={40} tile={false} />
              {m.label}
            </button>
          );
        })}
      </nav>
    </main>
  );
}
