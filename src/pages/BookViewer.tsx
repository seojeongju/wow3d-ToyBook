import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl, type Page } from '../api';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import { LineIcon } from '../components/Icons';
import { SubHeader } from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import { josa } from '../korean';
import { logPageRead } from '../readingLog';
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

/** 종이 한 장이 넘어가는 시간 (CSS .leaf 애니메이션과 같게) */
const FLIP_MS = 760;
const SPREAD_QUERY = '(min-width: 900px) and (orientation: landscape)';

/** 넘기는 중인 종이: from 쪽에서 to 쪽으로, dir 1 = 다음, -1 = 이전 */
interface Flip {
  from: number;
  dir: 1 | -1;
  n: number;
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const [flip, setFlip] = useState<Flip | null>(null);
  const [spread, setSpread] = useState(false);
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

  // 태블릿 가로·PC는 펼친 책(왼쪽 그림·오른쪽 글), 휴대폰은 한 쪽씩
  useEffect(() => {
    const mq = window.matchMedia(SPREAD_QUERY);
    const update = () => setSpread(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /** from 쪽에서 to 쪽으로 종이를 넘김 (움직임 줄이기 설정이면 바로 바꿈) */
  const turn = useCallback((from: number, to: number) => {
    setIndex(to);
    if (from === to || reducedMotion()) return setFlip(null);
    setFlip((f) => ({ from, dir: to > from ? 1 : -1, n: (f?.n ?? 0) + 1 }));
  }, []);

  // 애니메이션 끝 이벤트를 놓쳐도 종이가 남지 않게
  useEffect(() => {
    if (!flip) return;
    const t = window.setTimeout(() => setFlip(null), FLIP_MS + 200);
    return () => window.clearTimeout(t);
  }, [flip]);

  // 펼쳐 본 쪽은 이 기기의 읽은 기록에 남김 (부모 대시보드 "이번 주 읽은 쪽 수")
  const pageId = stage === 'reading' ? page?.id : undefined;
  useEffect(() => {
    if (pageId && book) logPageRead(book.child_id, book.id, pageId);
  }, [pageId, book]);

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
              turn(i, i + 1);
              // 종이가 다 넘어간 뒤 이어서 읽기
              timer.current = window.setTimeout(() => autoRef.current && readPage(i + 1), reducedMotion() ? 0 : FLIP_MS);
            } else {
              setAutoMode(false);
              setStage('end');
            }
          }, 900);
        },
      });
      setSpeaking(started);
    },
    [pages, turn],
  );

  const goTo = useCallback(
    (next: number) => {
      stopReading();
      setAutoMode(false);
      setProgress(0);
      if (next > last) return setStage('end');
      if (next < 0) return setStage('cover');
      // 표지·끝 화면에서 들어올 때는 넘김 없이 바로 펼침
      if (stage === 'reading') turn(index, next);
      else {
        setFlip(null);
        setIndex(next);
      }
      setStage('reading');
    },
    [index, last, stage, stopReading, turn],
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
    setFlip(null);
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
  const illust = (p: Page) => (
    <div className="illust" style={{ background: p.layout.bg ?? 'var(--soft-blue)' }}>
      {p.image_key ? <img src={fileUrl(p.image_key)} alt="" /> : <ClayEmoji emoji={p.layout.emoji ?? book.cover_emoji} size={220} />}
    </div>
  );
  const plainText = (p: Page) => <p className="page-text">{p.text}</p>;

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
          <article className={`page book-page ${flip ? 'flipping' : ''}`}>
            {/* 펼친 책에서 넘기는 동안: 다음 쪽이면 왼쪽은 아직 지금 그림, 이전 쪽이면 오른쪽은 아직 지금 글 */}
            <div className="half half-illust">{illust(flip && spread && flip.dir > 0 ? pages[flip.from] : page)}</div>
            <div className="half half-text">
              {flip && spread && flip.dir < 0 ? (
                plainText(pages[flip.from])
              ) : (
                <p className={`page-text ${speaking ? 'reading' : ''}`} onClick={toggleRead} title={canSpeak ? '누르면 읽어 줘요' : undefined}>
                  {words.map((w, i) => (
                    <span key={i} className={`w ${speaking || progress >= 1 ? (w.end <= charPos ? 'done' : w.start <= charPos ? 'now' : '') : ''}`}>
                      {w.word}{' '}
                    </span>
                  ))}
                </p>
              )}
            </div>

            {/* 넘어가는 종이 한 장 (앞면 = 지금 쪽, 뒷면 = 새 쪽) */}
            {flip && pages[flip.from] && (
              <div
                key={flip.n}
                className={`leaf ${spread ? 'spread' : 'single'} ${flip.dir > 0 ? 'to-next' : 'to-prev'}`}
                aria-hidden
                onAnimationEnd={(e) => e.target === e.currentTarget && setFlip(null)}
              >
                {spread ? (
                  <>
                    <div className="face front">{flip.dir > 0 ? plainText(pages[flip.from]) : illust(pages[flip.from])}</div>
                    <div className="face back">{flip.dir > 0 ? illust(page) : plainText(page)}</div>
                  </>
                ) : (
                  <div className="face front">
                    {illust(pages[flip.from])}
                    {plainText(pages[flip.from])}
                  </div>
                )}
              </div>
            )}
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
          {book.preview_only ? (
            <>
              <h2>앞 2쪽 미리보기를 다 읽었어요!</h2>
              <p>
                전체 {book.page_count}쪽 뒷이야기가 궁금한가요? 동화 서점에서 소장하면 끝까지 읽고 내 책장에 영구 보관할 수 있어요!
              </p>
              <div className="cover-actions">
                <button className="pill-btn" onClick={() => navigate('/market?tab=bookstore')}>
                  🏪 서점에서 소장 구매하기 (⭐ {(book.market_price ?? 500).toLocaleString()} 코인)
                </button>
                <button className="pill-btn alt" onClick={() => goTo(0)}>
                  처음부터 다시 보기
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>다 읽었어요!</h2>
              <p>{child ? `${josa(child.nickname, '이', '')} 책장에 반짝 별 스티커가 붙었어요.` : '책장에 반짝 별 스티커가 붙었어요.'}</p>
              <div className="cover-actions">
                <button className="pill-btn" onClick={() => goTo(0)}>
                  처음부터 다시 읽기
                </button>
                {book.ownership === 'mine' ? (
                  <button className="pill-btn alt" onClick={() => navigate(`/market?tab=mine&publish=${encodeURIComponent(book.id)}`)}>
                    🏛️ 도서관 공유 · 서점 판매하기
                  </button>
                ) : (
                  <button className="pill-btn alt" onClick={() => navigate('/market')}>
                    🏛️ 도서관·서점 더 둘러보기
                  </button>
                )}
                <button className="pill-btn alt" onClick={backToShelf}>
                  책장으로 가기
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
