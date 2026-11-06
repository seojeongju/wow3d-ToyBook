import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { BookSummary } from '../api';
import { fileUrl } from '../api';
import { BOOK, slotCapacity, type RoomTemplate } from '../rooms/templates';
import ClayArt, { ClayEmoji } from './ClayArt';
import { LineIcon } from './Icons';

interface Props {
  room: RoomTemplate;
  books: BookSummary[];
  /** 이름표 글자 (예: "민지의 책장") */
  plaque: string;
  /** 책을 고르면 (튀어나오는 연출이 끝난 뒤) 호출 */
  onOpen: (book: BookSummary) => void;
  /** 빈 "새 책" 자리를 누르면 호출 */
  onNewBook: () => void;
  /** 책을 고른 순간 (제목 읽어 주기 등) */
  onPick?: (book: BookSummary) => void;
}

// 표지 바탕 파스텔 (책마다 돌려 씀)
const COVERS = ['lavender', 'peach', 'mint', 'yellow', 'pink'];

interface Placed {
  book: BookSummary | null; // null 이면 "새 책" 자리
  left: number;
  bottom: number;
  tilt: number;
  index: number;
}

/** 선반 자리에 책을 왼쪽부터 채우고, 넘치는 책은 다음 장으로 */
function layout(room: RoomTemplate, books: BookSummary[]): Placed[][] {
  const spots: { left: number; bottom: number }[] = [];
  for (const s of room.shelves) {
    const n = slotCapacity(s);
    // 선반 가운데 정렬
    const used = n * BOOK.w + (n - 1) * BOOK.gap;
    const start = s.x0 + (s.x1 - s.x0 - used) / 2;
    for (let i = 0; i < n; i++) spots.push({ left: start + i * (BOOK.w + BOOK.gap), bottom: 1 - s.y });
  }
  if (spots.length === 0) return [[]];

  // 마지막 장에 빈자리가 있으면 "새 책" 자리를 하나 둠
  const items: (BookSummary | null)[] = [...books, null];
  const pages: Placed[][] = [];
  for (let i = 0; i < items.length; i += spots.length) {
    pages.push(
      items.slice(i, i + spots.length).map((book, j) => ({
        book,
        ...spots[j],
        tilt: ((i + j) % 3) - 1, // -1, 0, 1 도로 살짝 기울여 손으로 꽂은 느낌
        index: i + j,
      })),
    );
  }
  return pages;
}

export default function ShelfScene({ room, books, plaque, onOpen, onNewBook, onPick }: Props) {
  const pages = useMemo(() => layout(room, books), [room, books]);
  const [page, setPage] = useState(0);
  const [flying, setFlying] = useState<{ book: BookSummary; rect: DOMRect; tone: string; stage: 'lift' | 'center' | 'open' } | null>(null);
  const timers = useRef<number[]>([]);

  // 템플릿이나 책 수가 바뀌면 첫 장으로
  useEffect(() => setPage(0), [room.id, books.length]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const pick = (book: BookSummary, el: HTMLElement, tone: string) => {
    if (flying) return;
    onPick?.(book);
    if (reduceMotion) return onOpen(book);
    // 책이 선반에서 튀어나와 화면 가운데로 온 뒤 표지가 열림
    setFlying({ book, rect: el.getBoundingClientRect(), tone, stage: 'lift' });
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    later(30, () => setFlying((f) => f && { ...f, stage: 'center' }));
    later(520, () => setFlying((f) => f && { ...f, stage: 'open' }));
    later(1150, () => onOpen(book));
  };

  const current = pages[Math.min(page, pages.length - 1)] ?? [];

  return (
    <div className="room-wrap">
      <div className="room" style={{ aspectRatio: `1 / ${room.ratio}` }}>
        {room.Art ? <room.Art /> : room.imageUrl && <img className="room-art" src={room.imageUrl} alt="" />}

        <span className="room-plaque" style={{ left: `${room.plaque.x * 100}%`, top: `${room.plaque.y * 100}%` }}>
          {plaque}
        </span>

        {current.map((p) => {
          const style: CSSProperties = {
            left: `${p.left * 100}%`,
            bottom: `${p.bottom * 100}%`,
            width: `${BOOK.w * 100}%`,
            '--tilt': `${p.tilt * 1.5}deg`,
          } as CSSProperties;
          if (!p.book) {
            return (
              <button key="new" className="shelf-book shelf-new" style={style} onClick={onNewBook} aria-label="새 책 만들기">
                <span className="shelf-plus" aria-hidden>
                  +
                </span>
              </button>
            );
          }
          const tone = COVERS[p.index % COVERS.length];
          const b = p.book;
          return (
            <button
              key={b.id}
              className={`shelf-book tone-${tone} ${flying?.book.id === b.id ? 'is-flying' : ''}`}
              style={style}
              onClick={(e) => pick(b, e.currentTarget, tone)}
              aria-label={`${b.title} 읽기`}
              title={b.title}
            >
              <span className="shelf-cover">
                {b.cover_key ? <img src={fileUrl(b.cover_key)} alt="" /> : <ClayEmoji emoji={b.cover_emoji} size={64} />}
              </span>
            </button>
          );
        })}

        {room.figure && (
          <span className="room-figure-spot" style={{ left: `${room.figure.x * 100}%`, bottom: `${(1 - room.figure.y) * 100}%` }} aria-hidden>
            <ClayArt name="sparkles" size={34} />
          </span>
        )}
      </div>

      {pages.length > 1 && (
        <div className="room-pager">
          <button className="icon-btn" onClick={() => setPage((n) => Math.max(0, n - 1))} disabled={page === 0} aria-label="앞 책장">
            <LineIcon name="prev" />
          </button>
          <span>
            {page + 1} / {pages.length}
          </span>
          <button
            className="icon-btn"
            onClick={() => setPage((n) => Math.min(pages.length - 1, n + 1))}
            disabled={page >= pages.length - 1}
            aria-label="다음 책장"
          >
            <LineIcon name="next" />
          </button>
        </div>
      )}

      {flying && <FlyingBook {...flying} />}
    </div>
  );
}

/** 선반에서 튀어나와 가운데에서 펼쳐지는 책 (화면 맨 위 레이어) */
function FlyingBook({ book, rect, tone, stage }: { book: BookSummary; rect: DOMRect; tone: string; stage: 'lift' | 'center' | 'open' }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(260, vw * 0.55);
  const h = w * (BOOK.h / BOOK.w);
  const atShelf = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  const atCenter = { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  const pos = stage === 'lift' ? atShelf : atCenter;

  return (
    <div className={`fly-layer stage-${stage}`} aria-hidden>
      <div className="fly-book" style={pos}>
        <span className="fly-pages" />
        <span className={`fly-cover tone-${tone}`}>
          {book.cover_key ? <img src={fileUrl(book.cover_key)} alt="" /> : <ClayEmoji emoji={book.cover_emoji} size={Math.round(w * 0.6)} />}
          <strong>{book.title}</strong>
        </span>
      </div>
    </div>
  );
}
