import { useEffect, useState } from 'react';
import type { BookSummary } from '../api';
import {
  SHELF_FIGURES,
  addWishItem,
  findShelfFigure,
  loadWishList,
  type ShelfFigureId,
  type WishItem,
} from '../shelfState';
import ClayArt from './ClayArt';
import { ClayIcon, LineIcon } from './Icons';
import { speak } from '../speech';

const PLACES = [
  { id: 'mint', label: '민트 거품 왕국', art: 'toothbrush' as const, suffix: '에서 반짝이는 양치 마법을 펼쳐요!' },
  { id: 'island', label: '무지개 공룡 섬', art: 'island' as const, suffix: '에서 숨겨진 황금 공룡 알을 찾아요!' },
  { id: 'space', label: '별빛 우주 정거장', art: 'sparkles' as const, suffix: '에서 꼬마 로켓을 타고 은하수를 건너요!' },
  { id: 'cloud', label: '솜사탕 구름 숲', art: 'moon' as const, suffix: '에서 달님 그네를 타며 노래해요!' },
];

/* ───────── 1. 이야기 공방 (AI 동화 조합 체험 시트) ───────── */
export function StudioSheet({
  childName,
  initialFigureId,
  books,
  onOpenBook,
  onClose,
}: {
  childName: string;
  initialFigureId: ShelfFigureId;
  books: BookSummary[];
  onOpenBook: (book: BookSummary) => void;
  onClose: () => void;
}) {
  const [heroId, setHeroId] = useState<ShelfFigureId>(initialFigureId);
  const [placeIdx, setPlaceIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hero = findShelfFigure(heroId);
  const place = PLACES[placeIdx] ?? PLACES[0];
  const previewTitle = `${childName}와 ${hero.name}의 ${place.label} 대모험`;
  const previewBody = `어느 날 ${childName}의 그림책 속에서 ${hero.name} 친구가 뿅! 튀어나왔어요. 둘은 손을 잡고 ${place.label}${place.suffix}`;

  const matchedBook =
    books.find((b) => (heroId === 'fairy' ? b.title.includes('치카') : b.title.includes('공룡'))) ?? books[0];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet shelf-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="이야기 공방"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <div className="sheet-title-wrap">
            <ClayIcon name="studio" size={38} tile={false} />
            <div>
              <h2>이야기 공방 미리보기</h2>
              <p className="sheet-sub">주인공과 장소를 골라 나만의 동화를 조합해 봐요!</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <LineIcon name="back" />
          </button>
        </header>

        <div className="modal-step-block">
          <span className="modal-step-label">1단계 · 누구랑 모험할까요?</span>
          <div className="modal-chip-row">
            {SHELF_FIGURES.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`modal-char-chip tone-${f.tone} ${f.id === heroId ? 'active' : ''}`}
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
          <span className="modal-step-label">2단계 · 어디로 떠나 볼까요?</span>
          <div className="modal-chip-row">
            {PLACES.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className={`modal-char-chip ${idx === placeIdx ? 'active' : ''}`}
                onClick={() => setPlaceIdx(idx)}
              >
                <ClayArt name={p.art} size={26} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`studio-preview-card tone-${hero.tone}`}>
          <div className="studio-preview-art">
            <img src={hero.image} alt={hero.name} />
          </div>
          <div className="studio-preview-body">
            <span className="studio-badge">✨ AI 동화 줄거리 카드</span>
            <h3>{previewTitle}</h3>
            <p>{previewBody}</p>
            <div className="studio-preview-actions">
              <button
                type="button"
                className="pill-btn small-pill"
                onClick={() => speak(`${previewTitle}. ${previewBody}`, { force: true, style: 'story' })}
              >
                <LineIcon name="speaker" size={18} /> 줄거리 들어보기
              </button>
              {matchedBook && (
                <button
                  type="button"
                  className="ghost-pill-btn"
                  onClick={() => {
                    onClose();
                    onOpenBook(matchedBook);
                  }}
                >
                  샘플 그림책 펼치기 →
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────── 2. 마법 상자 (3D 캐릭터 쇼케이스 & 책장 진열대 배치) ───────── */
export function MagicBoxSheet({
  activeFigureId,
  onSelectFigure,
  onClose,
}: {
  activeFigureId: ShelfFigureId;
  onSelectFigure: (id: ShelfFigureId) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<ShelfFigureId>(activeFigureId);
  const [angle, setAngle] = useState(0);
  const [jumping, setJumping] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fig = findShelfFigure(selectedId);

  const triggerJump = () => {
    setJumping(false);
    window.requestAnimationFrame(() => setJumping(true));
    speak(fig.greeting, { force: true, style: 'mascot' });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet shelf-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="마법 상자"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <div className="sheet-title-wrap">
            <ClayIcon name="magic" size={38} tile={false} />
            <div>
              <h2>마법 상자 · 3D 캐릭터 보관함</h2>
              <p className="sheet-sub">캐릭터를 이리저리 돌려보고 내 책장 진열대에 올려 보세요!</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <LineIcon name="back" />
          </button>
        </header>

        <div className="magic-turntable">
          <div
            className={`magic-stage-card ${jumping ? 'is-jumping' : ''}`}
            style={{ transform: `perspective(800px) rotateY(${angle}deg)` }}
            onClick={triggerJump}
          >
            <img key={fig.id} src={fig.image} alt={fig.name} className="magic-stage-img" />
            <span className="magic-stage-badge">
              <ClayArt name={fig.art} size={24} /> {fig.name} · {fig.role}
            </span>
          </div>

          <div className="magic-controls">
            <button type="button" className="magic-ctrl-btn" onClick={() => setAngle((a) => Math.max(a - 18, -36))}>
              ↺ 왼쪽 기울이기
            </button>
            <button type="button" className="magic-ctrl-btn highlight" onClick={triggerJump}>
              <LineIcon name="speaker" size={16} /> 인사 듣기 · 점프!
            </button>
            <button type="button" className="magic-ctrl-btn" onClick={() => setAngle((a) => Math.min(a + 18, 36))}>
              오른쪽 기울이기 ↻
            </button>
          </div>
        </div>

        <div className="modal-chip-row center">
          {SHELF_FIGURES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`modal-char-chip tone-${f.tone} ${f.id === selectedId ? 'active' : ''}`}
              onClick={() => {
                setSelectedId(f.id);
                setAngle(0);
                speak(f.greeting, { force: true, style: 'mascot' });
              }}
            >
              <ClayArt name={f.art} size={28} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        <div className="modal-bottom-bar">
          <button
            type="button"
            className="pill-btn"
            onClick={() => {
              onSelectFigure(selectedId);
              onClose();
            }}
          >
            내 책장 진열대에 ‘{fig.name}’ 올려두기 <LineIcon name="check" size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}

/* ───────── 3. 장난감 공장 (3D 피규어 크기 비교 & 찜하기 시트) ───────── */
export function FactorySheet({
  childId,
  activeFigureId,
  onWishSaved,
  onClose,
}: {
  childId: string;
  activeFigureId: ShelfFigureId;
  onWishSaved: (msg: string) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<ShelfFigureId>(activeFigureId);
  const [sizeCm, setSizeCm] = useState<5 | 8 | 12>(8);
  const [printing, setPrinting] = useState(false);
  const [wishes, setWishes] = useState<WishItem[]>(() => loadWishList(childId));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fig = findShelfFigure(selectedId);

  const SIZES: { cm: 5 | 8 | 12; label: string; desc: string; scale: number }[] = [
    { cm: 5, label: '5cm 미니', desc: '한 손에 쏙 들어오는 귀여운 크기', scale: 0.78 },
    { cm: 8, label: '8cm 기본', desc: '책상 위에 두기 가장 좋은 인기 크기', scale: 0.94 },
    { cm: 12, label: '12cm 대왕', desc: '존재감 넘치는 프리미엄 소장용 크기', scale: 1.1 },
  ];

  const currentSize = SIZES.find((s) => s.cm === sizeCm) ?? SIZES[1];

  const handleSaveWish = () => {
    setPrinting(true);
    window.setTimeout(() => {
      const next = addWishItem(childId, selectedId, sizeCm);
      setWishes(next);
      setPrinting(false);
      onWishSaved(`${fig.name} ${sizeCm}cm 피규어를 찜 상자에 담았어요!`);
    }, 650);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet shelf-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="장난감 공장"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <div className="sheet-title-wrap">
            <ClayIcon name="factory" size={38} tile={false} />
            <div>
              <h2>wow3d 장난감 공장</h2>
              <p className="sheet-sub">좋아하는 친구와 크기를 골라 부모님께 조르기 상자에 담아 봐요!</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <LineIcon name="back" />
          </button>
        </header>

        <div className="modal-chip-row">
          {SHELF_FIGURES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`modal-char-chip tone-${f.tone} ${f.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(f.id)}
            >
              <ClayArt name={f.art} size={26} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>

        <div className="factory-preview-grid">
          <div className={`factory-printer-box ${printing ? 'is-printing' : ''}`}>
            <img
              src={fig.image}
              alt={fig.name}
              style={{ transform: `scale(${currentSize.scale})` }}
              className="factory-preview-img"
            />
            <span className="factory-size-pill">{sizeCm}cm 실물 피규어 비율</span>
          </div>

          <div className="factory-size-selector">
            {SIZES.map((s) => (
              <button
                key={s.cm}
                type="button"
                className={`factory-size-card ${s.cm === sizeCm ? 'active' : ''}`}
                onClick={() => setSizeCm(s.cm)}
              >
                <strong>{s.label}</strong>
                <span>{s.desc}</span>
              </button>
            ))}

            <button type="button" className="pill-btn factory-wish-btn" onClick={handleSaveWish} disabled={printing}>
              {printing ? '3D 프린터로 조형 준비 중…' : `💜 부모님께 ‘${fig.name} (${sizeCm}cm)’ 찜하기`}
            </button>
          </div>
        </div>

        {wishes.length > 0 && (
          <div className="factory-wish-list">
            <span className="modal-step-label">내가 찜한 3D 피규어 ({wishes.length})</span>
            <div className="modal-chip-row">
              {wishes.map((w, i) => {
                const wf = findShelfFigure(w.figureId);
                return (
                  <span key={`${w.figureId}-${w.sizeCm}-${i}`} className={`wish-badge tone-${wf.tone}`}>
                    <ClayArt name={wf.art} size={20} />
                    {wf.name} · {w.sizeCm}cm
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

