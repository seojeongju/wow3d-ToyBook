import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Child } from '../api';
import { send, useMe } from '../auth';
import { josa } from '../korean';
import { SHELF_FIGURES, findShelfFigure, type ShelfFigureId } from '../shelfState';
import { speak, stopSpeaking } from '../speech';
import ClayArt, { type ClayArtName } from './ClayArt';
import { ClayIcon, LineIcon } from './Icons';
import Tobi from './Tobi';

/**
 * 이야기 공방 (PRD 7.1·B-01) — 1단계 고도화: 직접 입력 + 자세히 만들기.
 * 이야기 씨앗(직접 쓰기) → 주인공·등장인물 → 장소·주제(직접 쓰기 가능) → 분위기·결말·배움 → 쪽수
 * → AI 줄거리 후보 3개 중 고르기 → 어른이 고치기 → 책 만들기 → 동화 극장으로.
 * 그림은 이미지 AI 를 정하기 전까지 점토 그림 목록에서 장면에 맞게 고름 (functions/_lib/story.ts)
 * 로그인 전(데모)에는 고르는 것까지 체험하고, 진짜 책은 로그인 후에 만들 수 있음
 */
type Chip = { id: string; label: string; art: ClayArtName };

const PLACES: Chip[] = [
  { id: 'mint', label: '민트 거품 왕국', art: 'toothbrush' },
  { id: 'island', label: '무지개 공룡 섬', art: 'island' },
  { id: 'space', label: '별빛 우주 정거장', art: 'sparkles' },
  { id: 'cloud', label: '솜사탕 구름 숲', art: 'moon' },
  { id: 'home', label: '우리 집 거실', art: 'blocks' },
  { id: 'forest', label: '도토리 숲속 마을', art: 'tree' },
];

const TOPICS: Chip[] = [
  { id: 'brush', label: '양치하기', art: 'tooth' },
  { id: 'sleep', label: '잠자리 들기', art: 'moon' },
  { id: 'share', label: '친구와 나누기', art: 'heart' },
  { id: 'brave', label: '씩씩한 용기', art: 'star' },
  { id: 'tidy', label: '장난감 정리', art: 'blocks' },
  { id: 'adventure', label: '신나는 모험', art: 'island' },
];

/** 서버 functions/_lib/story.ts 의 MOODS·ENDINGS·LEARNINGS 와 같은 id */
const MOODS: Chip[] = [
  { id: 'adventure', label: '신나는 모험', art: 'island' },
  { id: 'funny', label: '깔깔 웃긴', art: 'sparkles' },
  { id: 'calm', label: '잔잔한 잠자리', art: 'moon' },
  { id: 'mystery', label: '궁금한 수수께끼', art: 'star' },
  { id: 'touching', label: '따뜻한 감동', art: 'heart' },
];
const ENDINGS: Chip[] = [
  { id: 'happy', label: '모두 행복하게', art: 'heart' },
  { id: 'twist', label: '깜짝 반전', art: 'sparkles' },
  { id: 'open', label: '상상하는 열린 결말', art: 'sunset' },
];
const LEARNINGS: Chip[] = [
  { id: 'habit', label: '생활 습관', art: 'toothbrush' },
  { id: 'feelings', label: '마음 다루기', art: 'heart' },
  { id: 'science', label: '자연·과학', art: 'sprout' },
  { id: 'words', label: '한글·숫자', art: 'blocks' },
];

const SEED_EXAMPLES = ['놀이터에서 넘어졌는데 울지 않고 일어났어요', '동생이 태어나서 설레기도 하고 샘도 나요', '우리 집 강아지 콩이와 바닷가에 갔어요'];

interface Outline {
  title: string;
  summary: string;
  beats: { label: string; text: string }[];
  lesson: string;
}

interface Person {
  name: string;
  role: string;
  look: string;
}

type Step = 'pick' | 'thinking' | 'outline' | 'writing';

const WAIT_LINES = ['토비가 연필을 깎고 있어요…', '주인공 친구를 깨우는 중이에요…', '장면마다 어울리는 그림을 고르고 있어요…', '마지막 쪽을 따뜻하게 마무리하는 중이에요…'];
const NO_FRIEND = 'none';
const OWN = 'own';

/** 칩 한 줄: 다시 누르면 선택 해제(optional 일 때) */
function ChipRow({ items, value, onChange, optional }: { items: Chip[]; value: string | null; onChange: (v: string | null) => void; optional?: boolean }) {
  return (
    <>
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`modal-char-chip ${c.id === value ? 'active' : ''}`}
          aria-pressed={c.id === value}
          onClick={() => onChange(optional && c.id === value ? null : c.id)}
        >
          <ClayArt name={c.art} size={26} />
          <span>{c.label}</span>
        </button>
      ))}
    </>
  );
}

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
  const childName = child?.nickname ?? '우리 아이';
  const sprout = child?.age_mode === 'sprout';

  // 재료
  const [seed, setSeed] = useState('');
  const [childIsHero, setChildIsHero] = useState(true);
  const [heroId, setHeroId] = useState<string>(initialFigureId);
  const [people, setPeople] = useState<Person[]>([]);
  const [placeId, setPlaceId] = useState<string | null>(PLACES[0].id);
  const [ownPlace, setOwnPlace] = useState('');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [ownTopic, setOwnTopic] = useState('');
  const [more, setMore] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [learning, setLearning] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(8);

  // 진행
  const [step, setStep] = useState<Step>('pick');
  const [options, setOptions] = useState<Outline[]>([]);
  const [chosen, setChosen] = useState(0);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitIdx, setWaitIdx] = useState(0);
  const alive = useRef(true);

  const hero = heroId === NO_FRIEND ? null : findShelfFigure(heroId as ShelfFigureId);
  const place = placeId === OWN ? ownPlace.trim() : (PLACES.find((p) => p.id === placeId)?.label ?? '');
  const topic = topicId === OWN ? ownTopic.trim() : (TOPICS.find((t) => t.id === topicId)?.label ?? '');
  const ready = Boolean(seed.trim() || topic);
  const busy = step === 'thinking' || step === 'writing';
  const outline = options[chosen];

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

  const payload = () => ({
    childId: child?.id,
    seed: seed.trim(),
    childIsHero,
    hero: hero?.name ?? '',
    characters: people.filter((p) => p.name.trim()),
    place,
    topic,
    mood,
    ending,
    learning,
    pageCount,
  });

  const makeOutlines = async () => {
    setError(null);
    setStep('thinking');
    speak('어떤 이야기가 될까? 토비가 줄거리 세 가지를 생각해 볼게요!', { style: 'mascot' });
    try {
      const r = await send<{ options: Outline[]; pageCount: number }>('/api/studio/outline', 'POST', payload());
      if (!alive.current) return;
      setOptions(r.options);
      setChosen(0);
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

  const setOutline = (o: Outline) => setOptions((all) => all.map((x, i) => (i === chosen ? o : x)));
  const setBeat = (i: number, text: string) => outline && setOutline({ ...outline, beats: outline.beats.map((b, j) => (j === i ? { ...b, text } : b)) });
  const setPerson = (i: number, patch: Partial<Person>) => setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

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
            <div className="modal-step-block studio-seed">
              <label className="modal-step-label" htmlFor="studio-seed">
                1 · 어떤 이야기를 만들고 싶어요? <em>직접 쓰기</em>
              </label>
              <textarea
                id="studio-seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder={`예: ${SEED_EXAMPLES[0]}`}
              />
              <div className="studio-seed-foot">
                <span>
                  {SEED_EXAMPLES.slice(1).map((ex) => (
                    <button key={ex} type="button" className="studio-example" onClick={() => setSeed(ex)}>
                      {ex}
                    </button>
                  ))}
                </span>
                <small>{seed.length}/300 · 비워 두면 아래에서 골라 만들어요</small>
              </div>
            </div>

            <div className="modal-step-block">
              <span className="modal-step-label">2 · 누가 나올까요?</span>
              <div className="modal-chip-row">
                <button type="button" className={`modal-char-chip ${childIsHero ? 'active' : ''}`} aria-pressed={childIsHero} onClick={() => setChildIsHero((v) => !v)}>
                  <ClayArt name="heart" size={26} />
                  <span>{josa(childName, '이', '')}가 주인공</span>
                </button>
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
                <button type="button" className={`modal-char-chip ${heroId === NO_FRIEND ? 'active' : ''}`} aria-pressed={heroId === NO_FRIEND} onClick={() => setHeroId(NO_FRIEND)}>
                  <span>친구 없이</span>
                </button>
              </div>

              {people.map((p, i) => (
                <div key={i} className="studio-person">
                  <input value={p.name} onChange={(e) => setPerson(i, { name: e.target.value })} maxLength={10} placeholder="이름(별명) 예: 콩이" aria-label={`등장인물 ${i + 1} 이름`} />
                  <input value={p.role} onChange={(e) => setPerson(i, { role: e.target.value })} maxLength={12} placeholder="누구? 예: 우리 집 강아지" aria-label={`등장인물 ${i + 1} 관계`} />
                  <input value={p.look} onChange={(e) => setPerson(i, { look: e.target.value })} maxLength={60} placeholder="생김새·성격 예: 하얀 털, 겁이 많음" aria-label={`등장인물 ${i + 1} 생김새`} />
                  <button type="button" className="studio-person-del" onClick={() => setPeople((ps) => ps.filter((_, j) => j !== i))} aria-label={`등장인물 ${i + 1} 빼기`}>
                    ×
                  </button>
                </div>
              ))}
              {people.length < 3 && (
                <button type="button" className="ghost-pill-btn studio-add-person" onClick={() => setPeople((ps) => [...ps, { name: '', role: '', look: '' }])}>
                  + 등장인물 추가 (가족·반려동물·상상 친구)
                </button>
              )}
              {people.length > 0 && <small className="studio-hint">실제 가족이라면 실명 대신 별명으로 적어 주세요.</small>}
            </div>

            <div className="modal-step-block">
              <span className="modal-step-label">3 · 어디에서 일어날까요?</span>
              <div className="modal-chip-row">
                <ChipRow items={PLACES} value={placeId} onChange={setPlaceId} optional />
                <button type="button" className={`modal-char-chip ${placeId === OWN ? 'active' : ''}`} aria-pressed={placeId === OWN} onClick={() => setPlaceId(OWN)}>
                  <ClayArt name="sparkles" size={26} />
                  <span>직접 쓰기</span>
                </button>
              </div>
              {placeId === OWN && (
                <input className="studio-own-topic" value={ownPlace} onChange={(e) => setOwnPlace(e.target.value)} maxLength={30} placeholder="예: 할머니 댁 시골 마당, 바닷속 산호 학교" aria-label="장소 직접 쓰기" autoFocus />
              )}
            </div>

            <div className="modal-step-block">
              <span className="modal-step-label">4 · 어떤 이야기를 담을까요? {seed.trim() ? '(골라도 되고 안 골라도 돼요)' : ''}</span>
              <div className="modal-chip-row">
                <ChipRow items={TOPICS} value={topicId} onChange={setTopicId} optional />
                <button type="button" className={`modal-char-chip ${topicId === OWN ? 'active' : ''}`} aria-pressed={topicId === OWN} onClick={() => setTopicId(OWN)}>
                  <ClayArt name="sparkles" size={26} />
                  <span>직접 쓰기</span>
                </button>
              </div>
              {topicId === OWN && (
                <input
                  className="studio-own-topic"
                  value={ownTopic}
                  onChange={(e) => setOwnTopic(e.target.value)}
                  maxLength={60}
                  placeholder="예: 처음 유치원에 가는 날, 편식하지 않기"
                  aria-label="이야기 주제 직접 쓰기"
                  autoFocus
                />
              )}
            </div>

            <div className="modal-step-block">
              <button type="button" className="studio-more" aria-expanded={more} onClick={() => setMore((v) => !v)}>
                {more ? '▾' : '▸'} 더 자세히 정하기 (분위기 · 결말 · 배움 · 쪽수)
              </button>
              {more && (
                <div className="studio-more-body">
                  <span className="studio-more-label">분위기</span>
                  <div className="modal-chip-row">
                    <ChipRow items={MOODS} value={mood} onChange={setMood} optional />
                  </div>
                  <span className="studio-more-label">결말</span>
                  <div className="modal-chip-row">
                    <ChipRow items={ENDINGS} value={ending} onChange={setEnding} optional />
                  </div>
                  <span className="studio-more-label">함께 배우기</span>
                  <div className="modal-chip-row">
                    <ChipRow items={LEARNINGS} value={learning} onChange={setLearning} optional />
                  </div>
                  {!sprout && (
                    <>
                      <span className="studio-more-label">쪽수</span>
                      <div className="modal-chip-row">
                        {[8, 12].map((n) => (
                          <button key={n} type="button" className={`modal-char-chip ${n === pageCount ? 'active' : ''}`} aria-pressed={n === pageCount} onClick={() => setPageCount(n)}>
                            <span>{n}쪽</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {loading ? null : member && child ? (
              <>
                <button type="button" className="pill-btn studio-go" onClick={makeOutlines} disabled={!ready}>
                  <ClayArt name="sparkles" size={26} /> 줄거리 3가지 만들기
                </button>
                {!ready && <small className="studio-hint center">하고 싶은 이야기를 쓰거나 주제를 하나 골라 주세요.</small>}
              </>
            ) : (
              <div className="studio-login">
                <p>멋진 이야기 재료예요! 진짜 그림책은 어른이 로그인하면 만들 수 있어요.</p>
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
            <strong>{step === 'thinking' ? '토비가 줄거리 세 가지를 생각하고 있어요' : `${pageCount}쪽 그림책을 쓰고 있어요`}</strong>
            <span>{WAIT_LINES[waitIdx]}</span>
            <span className="studio-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
        )}

        {/* ───── 2. 줄거리 고르기 (어른이 고칠 수 있음) ───── */}
        {step === 'outline' && outline && (
          <>
            <div className="studio-options" role="radiogroup" aria-label="줄거리 고르기">
              {options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={i === chosen}
                  className={`studio-option ${i === chosen ? 'on' : ''}`}
                  onClick={() => {
                    setChosen(i);
                    setEditing(false);
                  }}
                >
                  <span className="studio-option-no">{i + 1}</span>
                  <strong>{o.title}</strong>
                  <span>{o.summary}</span>
                </button>
              ))}
            </div>

            <div className="studio-outline">
              <span className="studio-badge">고른 줄거리 · {pageCount}쪽</span>
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
                  <ClayArt name="book" size={26} /> 이 줄거리로 책 만들기
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
                <button type="button" className="pill-btn small-pill alt" onClick={makeOutlines}>
                  다른 줄거리 3개
                </button>
                <button type="button" className="ghost-pill-btn" onClick={() => setStep('pick')}>
                  ← 재료 다시 고르기
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
