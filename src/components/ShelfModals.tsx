import { useEffect, useState } from 'react';
import { wishApi } from '../api';
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

  const handleSaveWish = async () => {
    setPrinting(true);
    try {
      await wishApi
        .create({
          childId,
          figureId: selectedId,
          figureName: fig.name,
          figureImage: fig.image,
          role: fig.role,
          sizeCm,
          createWish: true,
        })
        .catch(() => null);
    } finally {
      window.setTimeout(() => {
        const next = addWishItem(childId, selectedId, sizeCm);
        setWishes(next);
        setPrinting(false);
        onWishSaved(`💜 ${fig.name} ${sizeCm}cm 피규어를 부모님께 찜 요청으로 보냈어요!`);
      }, 500);
    }
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

