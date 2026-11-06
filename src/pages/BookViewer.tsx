import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl, type Page } from '../api';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import { LineIcon } from '../components/Icons';
import { SubHeader } from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import { josa } from '../korean';
import { markBookAsRead } from '../shelfState';
import { canSpeak, speak, stopSpeaking as stopTts } from '../speech';
import { useAsync } from '../useAsync';

/**
 * 동화 극장 (PRD 8.1 "무대 커튼이 열리며 책이 펼쳐짐, 낭독 중 글자가 하이라이트됨", R-01, B-07)
 * 표지(커튼) → 한 쪽씩 읽기(넘김 연출·읽는 글자 밝히기·끝까지 읽어 주기) → 다 읽었어요
 * 잠자리 모드: 남색 어두운 화면 (PRD 8.3·10, 밤 8시~아침 6시에는 저절로 켜짐)
 */
type Stage = 'cover' | 'reading' | 'end';

const NIGHT_KEY = 'toybook.night';
const COVER_TONES = ['lavender', 'peach', 'mint', 'yellow', 'pink'];

function initialNight(): boolean {
  try {
    const saved = localStorage.getItem(NIGHT_KEY);
    if (saved === 'on') return true;
    if (saved === 'off') return false;
  } catch {
    /* 기기 저장소를 못 쓰면 시간으로만 판단 */
  }
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

/** 글을 낱말로 나누고 글자 위치를 기억 (읽는 만큼 밝히기용) */
function splitWords(text: string) {
  const words: { word: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) words.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  return words;
}

export default function BookViewer() {
  const { bookId = '' } = useParams();
  const navigate = useNavigate();
  const detail = useAsync(() => api.book(bookId), [bookId]);
  const children = useAsync(api.children, []);

  const [stage, setStage] = useState<Stage>('cover');
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [speaking, setSpeaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [auto, setAuto] = useState(false);
  const [night, setNight] = useState(initialNight);
  const autoRef = useRef(false);
  const timer = useRef<number>();
  const touchX = useRef<number | null>(null);

  const pages: Page[] = detail.status === 'ok' ? detail.data.pages : [];
  const page = pages[index];
  const last = pages.length - 1;
  const book = detail.status === 'ok' ? detail.data.book : null;
  const child = children.status === 'ok' && book ? children.data.find((c) => c.id === book.child_id) : undefined;
  const tone = COVER_TONES[(bookId.length + (book?.title.length ?? 0)) % COVER_TONES.length];

  const stopReading = useCallback(() => {
    window.clearTimeout(timer.current);
    stopTts();
    setSpeaking(false);
  }, []);

  const setAutoMode = (on: boolean) => {
    autoRef.current = on;
    setAuto(on);
  };

  // 다른 책으로 바뀌면 표지부터
  useEffect(() => {
    setStage('cover');
    setIndex(0);
    setAutoMode(false);
  }, [bookId]);

  useEffect(() => () => stopReading(), [stopReading]);

  // 다 읽으면 아이 책장에 '다 읽었어요 ★' 스티커 기록
  useEffect(() => {
    if (stage !== 'end' || !book) return;
    if (book.child_id) markBookAsRead(book.child_id, book.id);
    markBookAsRead('default', book.id);
    speak(child ? `다 읽었어요! ${josa(child.nickname, '이', '')} 정말 잘했어요!` : '다 읽었어요! 정말 잘했어요!', { style: 'mascot' });
  }, [stage, book, child]);

  /** i 쪽을 읽어 줌. 끝까지 읽어 주기 모드면 다 읽은 뒤 다음 쪽으로 넘어가 이어서 읽음 */
  const readPage = useCallback(
    (i: number) => {
      const p = pages[i];
      if (!p) return;
      setProgress(0);
      const started = speak(p.text, {
        force: true,
        cacheKey: p.id,
        style: 'story',
        useServerTts: true,
        onProgress: setProgress,
        onEnd: () => {
          setSpeaking(false);
          setProgress(1);
          if (!autoRef.current) return;
          timer.current = window.setTimeout(() => {
            if (!autoRef.current) return;
            if (i < pages.length - 1) {
              setDir(1);
              setIndex(i + 1);
              readPage(i + 1);
            } else {
              setAutoMode(false);
              setStage('end');
            }
          }, 900);
        },
      });
      setSpeaking(started);
    },
    [pages],
  );

  const goTo = useCallback(
    (next: number) => {
      stopReading();
      setAutoMode(false);
      setProgress(0);
      if (next > last) return setStage('end');
      if (next < 0) return setStage('cover');
      setDir(next >= index ? 1 : -1);
      setIndex(next);
      setStage('reading');
    },
    [index, last, stopReading],
  );

  const toggleRead = () => {
    if (!canSpeak || !page) return;
    if (speaking) {
      setAutoMode(false);
      return stopReading();
    }
    readPage(index);
  };

  const startAuto = (from = 0) => {
    stopReading();
    setAutoMode(true);
    setDir(1);
    setIndex(from);
    setStage('reading');
    readPage(from);
  };

  const toggleNight = () => {
    setNight((v) => {
      try {
        localStorage.setItem(NIGHT_KEY, v ? 'off' : 'on');
      } catch {
        /* 이번 화면에만 적용 */
      }
      return !v;
    });
  };

  // 키보드: ← → 넘기기, 스페이스 읽어 주기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stage === 'cover' && (e.key === 'ArrowRight' || e.key === 'Enter')) return goTo(0);
      if (stage !== 'reading') return;
      if (e.key === 'ArrowRight') goTo(index + 1);
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === ' ') {
        e.preventDefault();
        toggleRead();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const words = useMemo(() => splitWords(page?.text ?? ''), [page]);

  if (detail.status === 'loading') {
    return (
      <main className={`screen viewer ${night ? 'night' : ''}`}>
        <SubHeader />
        <div className="theater-loading" aria-busy="true">
          <Tobi pose="wave" size={120} />
          <p>무대를 준비하는 중…</p>
        </div>
      </main>
    );
  }
  if (detail.status === 'error' || !book) {
    return (
      <main className="screen viewer">
        <SubHeader />
        <div className="theater-loading">
          <ClayArt name="robot" size={110} />
          <p className="error">{detail.status === 'error' ? detail.message : '책을 찾을 수 없어요'}</p>
          <button className="pill-btn small-pill" onClick={() => navigate('/profiles')}>
            책장으로
          </button>
        </div>
      </main>
    );
  }

  const charPos = progress * (page?.text.length ?? 0);
  const backToShelf = () => navigate(book.child_id ? `/shelf/${book.child_id}` : '/profiles');

  return (
    <main
      className={`screen viewer theater ${night ? 'night' : ''} ${child?.age_mode === 'sprout' ? 'mode-sprout' : ''}`}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || stage !== 'reading') return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <SubHeader
        left={
          <button className="icon-btn" onClick={backToShelf} aria-label="책장으로">
            <LineIcon name="back" />
          </button>
        }
        title={book.title}
        right={
          <div className="theater-tools">
            <button className={`icon-btn ${night ? 'active' : ''}`} onClick={toggleNight} aria-pressed={night} aria-label={night ? '잠자리 모드 끄기' : '잠자리 모드 켜기'}>
              <ClayArt name="moon" size={34} />
            </button>
            {canSpeak && stage === 'reading' && (
              <button className={`icon-btn ${speaking ? 'active' : ''}`} onClick={toggleRead} aria-label={speaking ? '그만 읽기' : '이 쪽 읽어 주기'}>
                <LineIcon name={speaking ? 'stop' : 'speaker'} />
              </button>
            )}
          </div>
        }
      />

      {/* ───── 표지: 무대 커튼이 열리며 책이 나타남 ───── */}
      {stage === 'cover' && (
        <section className="stage-cover" aria-label="책 표지">
          <div className="curtain left" aria-hidden />
          <div className="curtain right" aria-hidden />
          <div className="valance" aria-hidden />
          <div className={`cover-book tone-${tone}`}>
            {book.cover_key ? <img src={fileUrl(book.cover_key)} alt="" /> : <ClayEmoji emoji={book.cover_emoji} size={170} />}
            <h2>{book.title}</h2>
            <span className="cover-sub">
              {child ? `${child.nickname}의 그림책 · ` : ''}
              {pages.length}쪽
            </span>
          </div>
          <div className="cover-actions">
            <button className="pill-btn" onClick={() => goTo(0)} disabled={pages.length === 0}>
              <LineIcon name="book" size={22} /> 펼쳐서 읽기
            </button>
            {canSpeak && pages.length > 0 && (
              <button className="pill-btn alt" onClick={() => startAuto(0)}>
                <LineIcon name="speaker" size={22} /> 끝까지 읽어 줘
              </button>
            )}
          </div>
          {pages.length === 0 && <p className="muted center-text">아직 빈 책이에요.</p>}
        </section>
      )}

      {/* ───── 읽기 ───── */}
      {stage === 'reading' && page && (
        <>
          <article className={`page turn-${dir > 0 ? 'next' : 'prev'}`} key={page.id}>
            <div className="illust" style={{ background: page.layout.bg ?? 'var(--soft-blue)' }}>
              {page.image_key ? <img src={fileUrl(page.image_key)} alt="" /> : <ClayEmoji emoji={page.layout.emoji ?? book.cover_emoji} size={220} />}
            </div>
            <p
              className={`page-text ${speaking ? 'reading' : ''}`}
              onClick={toggleRead}
              title={canSpeak ? '누르면 읽어 줘요' : undefined}
            >
              {words.map((w, i) => (
                <span key={i} className={`w ${speaking || progress >= 1 ? (w.end <= charPos ? 'done' : w.start <= charPos ? 'now' : '') : ''}`}>
                  {w.word}{' '}
                </span>
              ))}
            </p>
          </article>

          {auto && (
            <p className="auto-badge" role="status">
              <LineIcon name="speaker" size={18} /> 끝까지 읽어 주는 중이에요
              <button
                onClick={() => {
                  setAutoMode(false);
                  stopReading();
                }}
              >
                멈추기
              </button>
            </p>
          )}

          <footer className="pager">
            <button className="big-btn" onClick={() => goTo(index - 1)} aria-label={index === 0 ? '표지로' : '이전 쪽'}>
              <LineIcon name="prev" size={30} />
            </button>
            <nav className="page-dots" aria-label="쪽 고르기">
              {pages.map((p, i) => (
                <button key={p.id} className={i === index ? 'on' : ''} onClick={() => goTo(i)} aria-label={`${i + 1}쪽`} aria-current={i === index ? 'page' : undefined} />
              ))}
            </nav>
            <button className="big-btn" onClick={() => goTo(index + 1)} aria-label={index === last ? '다 읽었어요' : '다음 쪽'}>
              <LineIcon name={index === last ? 'check' : 'next'} size={30} />
            </button>
          </footer>
        </>
      )}

      {/* ───── 다 읽었어요 ───── */}
      {stage === 'end' && (
        <section className="stage-end" aria-live="polite">
          <div className="end-stars" aria-hidden>
            <ClayArt name="star" size={64} />
            <ClayArt name="star" size={90} />
            <ClayArt name="star" size={64} />
          </div>
          <Tobi pose="wave" size={140} />
          <h2>다 읽었어요!</h2>
          <p>{child ? `${josa(child.nickname, '이', '')} 책장에 반짝 별 스티커가 붙었어요.` : '책장에 반짝 별 스티커가 붙었어요.'}</p>
          <div className="cover-actions">
            <button className="pill-btn" onClick={() => goTo(0)}>
              처음부터 다시 읽기
            </button>
            <button className="pill-btn alt" onClick={backToShelf}>
              책장으로 가기
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
