import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Child } from '../api';
import { send, useMe } from '../auth';
import { josa } from '../korean';
import { SHELF_FIGURES, findShelfFigure, type ShelfFigureId } from '../shelfState';
import { speak, stopSpeaking } from '../speech';
import ClayArt from './ClayArt';
import { ClayIcon, LineIcon } from './Icons';
import Tobi from './Tobi';

/**
 * 이야기 공방 (PRD 7.1·B-01): 친구 → 장소 → 주제 → AI 줄거리 → (어른이 고치기) → 책 만들기 → 동화 극장으로.
 * 그림은 이미지 AI 를 정하기 전까지 점토 그림 목록에서 장면에 맞게 고름 (functions/_lib/story.ts)
 * 로그인 전(데모)에는 고르는 것까지 체험하고, 진짜 책은 로그인 후에 만들 수 있음
 */
const PLACES = [
  { id: 'mint', label: '민트 거품 왕국', art: 'toothbrush' as const },
  { id: 'island', label: '무지개 공룡 섬', art: 'island' as const },
  { id: 'space', label: '별빛 우주 정거장', art: 'sparkles' as const },
  { id: 'cloud', label: '솜사탕 구름 숲', art: 'moon' as const },
  { id: 'home', label: '우리 집 거실', art: 'blocks' as const },
  { id: 'forest', label: '도토리 숲속 마을', art: 'tree' as const },
];

const TOPICS = [
  { id: 'brush', label: '양치하기', art: 'tooth' as const },
  { id: 'sleep', label: '잠자리 들기', art: 'moon' as const },
  { id: 'share', label: '친구와 나누기', art: 'heart' as const },
  { id: 'brave', label: '씩씩한 용기', art: 'star' as const },
  { id: 'tidy', label: '장난감 정리', art: 'blocks' as const },
  { id: 'adventure', label: '신나는 모험', art: 'island' as const },
];

interface Outline {
  title: string;
  summary: string;
  beats: { label: string; text: string }[];
  lesson: string;
}

type Step = 'pick' | 'thinking' | 'outline' | 'writing';

const WAIT_LINES = ['토비가 연필을 깎고 있어요…', '주인공 친구를 깨우는 중이에요…', '장면마다 어울리는 그림을 고르고 있어요…', '마지막 쪽을 따뜻하게 마무리하는 중이에요…'];

export default function StoryStudio({
  child,
  initialFigureId,
  onCreated,
  onClose,
}: {
  child: Child | undefined;
  initialFigureId: ShelfFigureId;
  onCreated: (bookId: string) => void;
  onClose: () => void;
}) {
  const { loading, user } = useMe();
  const member = user?.status === 'active';
  const [heroId, setHeroId] = useState<ShelfFigureId>(initialFigureId);
  const [placeId, setPlaceId] = useState(PLACES[0].id);
  const [topicId, setTopicId] = useState<string>(TOPICS[0].id);
  const [ownTopic, setOwnTopic] = useState('');
  const [pageCount, setPageCount] = useState(8);
  const [step, setStep] = useState<Step>('pick');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitIdx, setWaitIdx] = useState(0);
  const alive = useRef(true);

  const childName = child?.nickname ?? '우리 아이';
  const sprout = child?.age_mode === 'sprout';
  const hero = findShelfFigure(heroId);
  const place = PLACES.find((p) => p.id === placeId) ?? PLACES[0];
  const topic = topicId === 'own' ? ownTopic.trim() : (TOPICS.find((t) => t.id === topicId)?.label ?? '');
  const busy = step === 'thinking' || step === 'writing';

  useEffect(() => {
    alive.current = true;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      alive.current = false;
      window.removeEventListener('keydown', onKey);
      stopSpeaking();
    };
  }, [onClose, busy]);

  // 기다리는 동안 토비의 말이 바뀜 (PRD 8: 기다림도 놀이)
  useEffect(() => {
    if (!busy) return;
    setWaitIdx(0);
    const t = window.setInterval(() => setWaitIdx((i) => (i + 1) % WAIT_LINES.length), 2600);
    return () => window.clearInterval(t);
  }, [busy]);

  const payload = () => ({ childId: child?.id, hero: hero.name, place: place.label, topic, pageCount });

  const makeOutline = async () => {
    setError(null);
    setStep('thinking');
    speak(`${josa(hero.name, '이랑', '랑')} ${place.label}에서 어떤 일이 생길까? 생각해 볼게요!`, { style: 'mascot' });
    try {
      const r = await send<{ outline: Outline; pageCount: number }>('/api/studio/outline', 'POST', payload());
      if (!alive.current) return;
      setOutline(r.outline);
      setPageCount(r.pageCount);
      setEditing(false);
      setStep('outline');
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error ? e.message : '줄거리를 만들지 못했어요');
      setStep('pick');
    }
  };

  const makeBook = async () => {
    if (!outline) return;
    setError(null);
    setStep('writing');
    try {
      const r = await send<{ bookId: string }>('/api/studio/book', 'POST', { ...payload(), outline });
      if (!alive.current) return;
      speak('짜잔! 새 책이 완성됐어요!', { force: true, style: 'mascot' });
      onCreated(r.bookId);
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error ? e.message : '책을 만들지 못했어요');
      setStep('outline');
    }
  };

  const setBeat = (i: number, text: string) => setOutline((o) => o && { ...o, beats: o.beats.map((b, j) => (j === i ? { ...b, text } : b)) });

  return (
    <div className="sheet-backdrop" onClick={() => !busy && onClose()}>
      <section className="sheet shelf-modal-sheet studio-sheet" role="dialog" aria-modal="true" aria-label="이야기 공방" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div className="sheet-title-wrap">
            <ClayIcon name="studio" size={38} tile={false} />
            <div>
              <h2>이야기 공방</h2>
              <p className="sheet-sub">{josa(childName, '이', '')}만의 새 그림책을 만들어요</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기" disabled={busy}>
            <LineIcon name="back" />
          </button>
        </header>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        {/* ───── 1. 재료 고르기 ───── */}
        {step === 'pick' && (
          <>
            <div className="modal-step-block">
              <span className="modal-step-label">1 · 누구랑 모험할까요?</span>
              <div className="modal-chip-row">
                {SHELF_FIGURES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`modal-char-chip tone-${f.tone} ${f.id === heroId ? 'active' : ''}`}
                    aria-pressed={f.id === heroId}
                    onClick={() => {
                      setHeroId(f.id);
                      speak(f.greeting, { force: true, style: 'mascot' });
                    }}
                  >
                    <ClayArt name={f.art} size={28} />
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-step-block">
              <span className="modal-step-label">2 · 어디로 떠나 볼까요?</span>
              <div className="modal-chip-row">
                {PLACES.map((p) => (
                  <button key={p.id} type="button" className={`modal-char-chip ${p.id === placeId ? 'active' : ''}`} aria-pressed={p.id === placeId} onClick={() => setPlaceId(p.id)}>
                    <ClayArt name={p.art} size={26} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-step-block">
              <span className="modal-step-label">3 · 어떤 이야기를 담을까요?</span>
              <div className="modal-chip-row">
                {TOPICS.map((t) => (
                  <button key={t.id} type="button" className={`modal-char-chip ${t.id === topicId ? 'active' : ''}`} aria-pressed={t.id === topicId} onClick={() => setTopicId(t.id)}>
                    <ClayArt name={t.art} size={26} />
                    <span>{t.label}</span>
                  </button>
                ))}
                <button type="button" className={`modal-char-chip ${topicId === 'own' ? 'active' : ''}`} aria-pressed={topicId === 'own'} onClick={() => setTopicId('own')}>
                  <ClayArt name="sparkles" size={26} />
                  <span>어른과 직접 쓰기</span>
                </button>
              </div>
              {topicId === 'own' && (
                <input
                  className="studio-own-topic"
                  value={ownTopic}
                  onChange={(e) => setOwnTopic(e.target.value)}
                  maxLength={60}
                  placeholder="예: 동생이 생겨서 설레는 마음, 처음 유치원에 가는 날"
                  aria-label="이야기 주제 직접 쓰기"
                  autoFocus
                />
              )}
            </div>

            {!sprout && (
              <div className="modal-step-block">
                <span className="modal-step-label">4 · 몇 쪽짜리 책일까요?</span>
                <div className="modal-chip-row">
                  {[8, 12].map((n) => (
                    <button key={n} type="button" className={`modal-char-chip ${n === pageCount ? 'active' : ''}`} aria-pressed={n === pageCount} onClick={() => setPageCount(n)}>
                      <span>{n}쪽</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading ? null : member && child ? (
              <button type="button" className="pill-btn studio-go" onClick={makeOutline} disabled={!topic}>
                <ClayArt name="sparkles" size={26} /> 줄거리 만들기
              </button>
            ) : (
              <div className="studio-login">
                <p>
                  <strong>
                    {josa(hero.name, '과', '와')} {place.label}에서 '{topic || '…'}'
                  </strong>{' '}
                  이야기, 멋져요! 진짜 그림책은 어른이 로그인하면 만들 수 있어요.
                </p>
                <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`} className="pill-btn small-pill">
                  어른과 로그인하기
                </Link>
              </div>
            )}
          </>
        )}

        {/* ───── 기다리는 동안 ───── */}
        {busy && (
          <div className="studio-wait" role="status" aria-live="polite">
            <div className="studio-wait-tobi">
              <Tobi pose="wave" size={130} />
            </div>
            <strong>{step === 'thinking' ? '토비가 줄거리를 생각하고 있어요' : `${pageCount}쪽 그림책을 쓰고 있어요`}</strong>
            <span>{WAIT_LINES[waitIdx]}</span>
            <span className="studio-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
        )}

        {/* ───── 2. 줄거리 확인 (어른이 고칠 수 있음) ───── */}
        {step === 'outline' && outline && (
          <div className="studio-outline">
            <span className="studio-badge">AI 줄거리 · {pageCount}쪽</span>
            {editing ? (
              <input className="studio-title-input" value={outline.title} maxLength={40} onChange={(e) => setOutline({ ...outline, title: e.target.value })} aria-label="책 제목" />
            ) : (
              <h3>{outline.title}</h3>
            )}
            <ol className="studio-beats">
              {outline.beats.map((b, i) => (
                <li key={i}>
                  <span className="studio-beat-label">{b.label}</span>
                  {editing ? <textarea value={b.text} maxLength={200} rows={2} onChange={(e) => setBeat(i, e.target.value)} aria-label={`${b.label} 줄거리`} /> : <p>{b.text}</p>}
                </li>
              ))}
            </ol>
            {outline.lesson && (
              <p className="studio-lesson">
                <ClayArt name="heart" size={22} /> {outline.lesson}
              </p>
            )}

            <div className="studio-outline-actions">
              <button type="button" className="pill-btn studio-go" onClick={makeBook}>
                <ClayArt name="book" size={26} /> 이대로 책 만들기
              </button>
              <button
                type="button"
                className="pill-btn small-pill alt"
                onClick={() => speak(`${outline.title}. ${outline.beats.map((b) => b.text).join(' ')}`, { force: true, style: 'story' })}
              >
                <LineIcon name="speaker" size={18} /> 들어보기
              </button>
              <button type="button" className="pill-btn small-pill alt" onClick={() => setEditing((v) => !v)}>
                {editing ? '고치기 끝' : '어른이 고치기'}
              </button>
              <button type="button" className="ghost-pill-btn" onClick={() => setStep('pick')}>
                ← 다시 고르기
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
