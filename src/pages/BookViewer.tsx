import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl } from '../api';
import { LineIcon } from '../components/Icons';
import { SubHeader } from '../components/SiteHeader';
import { useAsync } from '../useAsync';
import { ClayEmoji } from '../components/ClayArt';

export default function BookViewer() {
  const { bookId = '' } = useParams();
  const navigate = useNavigate();
  const detail = useAsync(() => api.book(bookId), [bookId]);
  const [index, setIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const touchX = useRef<number | null>(null);

  const pages = detail.status === 'ok' ? detail.data.pages : [];
  const page = pages[index];
  const canTts = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopSpeaking = useCallback(() => {
    if (canTts) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [canTts]);

  const go = useCallback(
    (delta: number) => {
      stopSpeaking();
      setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(pages.length - 1, 0)));
    },
    [pages.length, stopSpeaking],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  useEffect(() => stopSpeaking, [stopSpeaking]);

  const readAloud = () => {
    if (!canTts || !page) return;
    if (speaking) return stopSpeaking();
    const u = new SpeechSynthesisUtterance(page.text);
    u.lang = 'ko-KR';
    u.rate = 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  if (detail.status === 'loading') {
    return (
      <main className="screen viewer">
        <SubHeader />
        <p className="muted center-text">책을 펼치는 중…</p>
      </main>
    );
  }
  if (detail.status === 'error') {
    return (
      <main className="screen viewer">
        <SubHeader />
        <p className="error center-text">{detail.message}</p>
      </main>
    );
  }

  const { book } = detail.data;

  return (
    <main
      className="screen viewer"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <SubHeader
        left={
          <button className="icon-btn" onClick={() => navigate(book.child_id ? `/shelf/${book.child_id}` : '/profiles')} aria-label="책장으로">
            <LineIcon name="back" />
          </button>
        }
        title={book.title}
        right={
          canTts ? (
            <button className={`icon-btn ${speaking ? 'active' : ''}`} onClick={readAloud} aria-label="읽어 주기">
              <LineIcon name={speaking ? 'stop' : 'speaker'} />
            </button>
          ) : undefined
        }
      />

      {page ? (
        <article className="page" key={page.id}>
          <div className="illust" style={{ background: page.layout.bg ?? 'var(--soft-blue)' }}>
            {page.image_key ? (
              <img src={fileUrl(page.image_key)} alt="" />
            ) : (
              <ClayEmoji emoji={page.layout.emoji ?? book.cover_emoji} size={220} />
            )}
          </div>
          <p className="page-text">{page.text}</p>
        </article>
      ) : (
        <p className="muted center">아직 빈 책이에요.</p>
      )}

      <footer className="pager">
        <button className="big-btn" onClick={() => go(-1)} disabled={index === 0} aria-label="이전 쪽">
          <LineIcon name="prev" size={30} />
        </button>
        <span className="page-no">
          {pages.length ? index + 1 : 0} / {pages.length}
        </span>
        <button className="big-btn" onClick={() => go(1)} disabled={index >= pages.length - 1} aria-label="다음 쪽">
          <LineIcon name="next" size={30} />
        </button>
      </footer>
    </main>
  );
}
