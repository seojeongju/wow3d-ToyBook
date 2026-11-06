import { useEffect } from 'react';
import { BUILTIN_ROOMS, type RoomTemplate } from '../rooms/templates';
import ClayArt from './ClayArt';
import { LineIcon } from './Icons';

interface Props {
  current: string;
  onPick: (room: RoomTemplate) => void;
  onClose: () => void;
  /** 2단계(사진으로 만들기) 안내 */
  onPhoto: () => void;
}

/** "책장 꾸미기" 아래에서 올라오는 시트 */
export default function RoomPicker({ current, onPick, onClose, onPhoto }: Props) {
  // Esc 로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="책장 꾸미기" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>어떤 책장이 좋아요?</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <LineIcon name="back" />
          </button>
        </header>

        <div className="room-options">
          {BUILTIN_ROOMS.map((r) => (
            <button
              key={r.id}
              className={`room-option ${r.id === current ? 'on' : ''}`}
              onClick={() => onPick(r)}
              aria-pressed={r.id === current}
            >
              <span className="room-thumb" style={{ aspectRatio: `1 / ${r.ratio}` }}>
                {r.Art && <r.Art />}
              </span>
              <strong>{r.name}</strong>
              <span>{r.blurb}</span>
              {r.id === current && (
                <span className="room-check" aria-hidden>
                  <LineIcon name="check" size={18} />
                </span>
              )}
            </button>
          ))}

          <button className="room-option room-photo" onClick={onPhoto}>
            <span className="room-thumb room-thumb-photo">
              <ClayArt name="sparkles" size={56} />
            </span>
            <strong>내 방 사진으로 만들기</strong>
            <span>어른과 함께 · 곧 열려요</span>
          </button>
        </div>
      </section>
    </div>
  );
}
