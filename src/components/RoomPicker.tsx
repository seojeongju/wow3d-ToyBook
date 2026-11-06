import { useEffect, useState, type ChangeEvent } from 'react';
import { josa } from '../korean';
import { extractPalette, swatch, type RoomPalette } from '../rooms/palette';
import { BUILTIN_ROOMS, findRoom, type RoomTemplate } from '../rooms/templates';
import ClayArt from './ClayArt';
import { LineIcon } from './Icons';

interface Props {
  current: string;
  /** 지금 쓰는 사진 색 (없으면 기본 색) */
  palette: RoomPalette | null;
  onPick: (room: RoomTemplate) => void;
  /** 사진 색 적용(또는 null 로 되돌리기) */
  onPalette: (palette: RoomPalette | null) => void;
  onClose: () => void;
  /** 2단계(사진 자체를 점토 책장으로 바꾸기) 안내 */
  onPhoto: () => void;
}

type Step = { view: 'pick' } | { view: 'photo'; file?: File; preview?: string; candidate?: RoomPalette; busy?: boolean; error?: string };

/** "책장 꾸미기" 아래에서 올라오는 시트 */
export default function RoomPicker({ current, palette, onPick, onPalette, onClose, onPhoto }: Props) {
  const [step, setStep] = useState<Step>({ view: 'pick' });
  const room = findRoom(current);

  // Esc 로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 미리 보기용 사진 주소는 다 쓰면 정리 (사진은 기기 안에서만)
  const preview = step.view === 'photo' ? step.preview : undefined;
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const choose = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setStep({ view: 'photo', error: '사진 파일을 골라 주세요.' });
    setStep({ view: 'photo', file, preview: URL.createObjectURL(file), busy: true });
    try {
      const candidate = await extractPalette(file);
      setStep((s) => (s.view === 'photo' && s.file === file ? { ...s, candidate, busy: false } : s));
    } catch (err) {
      setStep((s) => (s.view === 'photo' && s.file === file ? { ...s, busy: false, error: (err as Error).message } : s));
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="책장 꾸미기" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>{step.view === 'pick' ? '어떤 책장이 좋아요?' : '우리 방 색으로 꾸며요'}</h2>
          <button
            className="icon-btn"
            onClick={() => (step.view === 'pick' ? onClose() : setStep({ view: 'pick' }))}
            aria-label={step.view === 'pick' ? '닫기' : '뒤로'}
          >
            <LineIcon name="back" />
          </button>
        </header>

        {step.view === 'pick' && (
          <>
            <div className="room-options">
              {BUILTIN_ROOMS.map((r) => (
                <button key={r.id} className={`room-option ${r.id === current ? 'on' : ''}`} onClick={() => onPick(r)} aria-pressed={r.id === current}>
                  <span className="room-thumb" style={{ aspectRatio: `1 / ${r.ratio}` }}>
                    {r.Art && <r.Art palette={palette} />}
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

              <button className="room-option room-photo" onClick={() => setStep({ view: 'photo' })}>
                <span className="room-thumb room-thumb-photo">
                  <ClayArt name="sparkles" size={56} />
                </span>
                <strong>우리 방 색으로 꾸미기</strong>
                <span>방 사진의 색을 책장에 입혀요</span>
              </button>
            </div>

            <div className="room-extra">
              {palette && (
                <button className="ghost-pill" onClick={() => onPalette(null)}>
                  원래 색으로 되돌리기
                </button>
              )}
              <button className="ghost-pill" onClick={onPhoto}>
                사진 그대로 점토 책장 만들기 · 곧 열려요
              </button>
            </div>
          </>
        )}

        {step.view === 'photo' && (
          <div className="tint">
            <p className="tint-help">
              방이나 책상 사진을 고르면 그 색으로 {josa(room.name, '을', '를')} 칠해 줘요. <strong>사진은 이 기기 안에서 색만 읽고 바로 버려요.</strong> 어디에도 보내거나 저장하지 않아요.
            </p>

            <div className="tint-body">
              <div className="tint-photo">
                {step.preview ? <img src={step.preview} alt="고른 방 사진" /> : <ClayArt name="sparkles" size={72} />}
                <label className="pill-btn small-pill tint-pick">
                  {step.preview ? '다른 사진 고르기' : '사진 고르기'}
                  <input type="file" accept="image/*" capture="environment" onChange={choose} hidden />
                </label>
              </div>

              <div className="tint-result">
                {step.busy && <p className="muted">색을 찾는 중…</p>}
                {step.error && <p className="error">{step.error}</p>}
                {step.candidate && (
                  <>
                    <ul className="tint-swatches" aria-label="찾은 색">
                      {(
                        [
                          ['wall', '벽'],
                          ['main', '가구'],
                          ['accent', '포인트'],
                        ] as const
                      ).map(([role, label]) => (
                        <li key={role}>
                          <span className="tint-dot" style={{ background: swatch(step.candidate![role], role) }} />
                          {label}
                        </li>
                      ))}
                    </ul>
                    <span className="room-thumb tint-preview" style={{ aspectRatio: `1 / ${room.ratio}` }}>
                      {room.Art && <room.Art palette={step.candidate} />}
                    </span>
                    <button className="pill-btn" onClick={() => onPalette(step.candidate!)}>
                      이 색으로 꾸미기 <LineIcon name="check" size={18} />
                    </button>
                  </>
                )}
                {!step.preview && !step.error && <p className="muted">사진을 고르면 여기에 미리 보여 줘요.</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
