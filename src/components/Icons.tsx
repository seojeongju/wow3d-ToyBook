import { useId, type ReactNode } from 'react';

/**
 * 점토(클레이) 느낌의 3D 아이콘. 왼쪽 위에서 빛이 오는 방사형 그라데이션으로 입체감을 줌.
 * 글자 없이도 뜻이 통하도록 장소마다 하나씩 (PRD 8.3 아이콘)
 */
export type ClayIconName = 'home' | 'studio' | 'theater' | 'magic' | 'factory' | 'drawing' | 'shield' | 'clock' | 'cube' | 'ruler';

const TILE: Record<ClayIconName, string> = {
  home: 'var(--tile-lavender)',
  studio: 'var(--tile-peach)',
  theater: 'var(--tile-pink)',
  magic: 'var(--tile-lavender)',
  factory: 'var(--tile-yellow)',
  drawing: 'var(--tile-peach)',
  shield: 'var(--tile-mint)',
  clock: 'var(--tile-lavender)',
  cube: 'var(--tile-mint)',
  ruler: 'var(--tile-yellow)',
};

function Clay({ id, light, base, dark }: { id: string; light: string; base: string; dark: string }) {
  return (
    <radialGradient id={id} cx="32%" cy="28%" r="80%">
      <stop offset="0" stopColor={light} />
      <stop offset="0.55" stopColor={base} />
      <stop offset="1" stopColor={dark} />
    </radialGradient>
  );
}

function shapes(name: ClayIconName, g: (k: string) => string): ReactNode {
  switch (name) {
    case 'home':
      return (
        <>
          <path d="M14 30 L32 14 L50 30 V50 a4 4 0 0 1 -4 4 H18 a4 4 0 0 1 -4 -4 Z" fill={g('a')} />
          <path d="M9 31 L32 10 L55 31" fill="none" stroke={g('b')} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="27" y="38" width="10" height="16" rx="4" fill={g('c')} />
          <circle cx="24" cy="30" r="2.4" fill="#fff" opacity="0.7" />
        </>
      );
    case 'studio':
      return (
        <>
          <rect x="12" y="12" width="40" height="40" rx="10" fill={g('a')} transform="rotate(-6 32 32)" />
          <path d="M20 40 Q28 22 44 22" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
          <rect x="34" y="28" width="8" height="26" rx="4" fill={g('b')} transform="rotate(35 38 41)" />
          <path d="M45 18 l3 -6 l3 6 l-3 3 z" fill={g('c')} />
        </>
      );
    case 'theater':
      return (
        <>
          <rect x="10" y="12" width="44" height="40" rx="8" fill={g('c')} />
          <path d="M10 18 a6 6 0 0 1 6 -6 h10 v40 c-6 0 -16 -8 -16 -20 z" fill={g('a')} />
          <path d="M54 18 a6 6 0 0 0 -6 -6 h-10 v40 c6 0 16 -8 16 -20 z" fill={g('a')} />
          <path d="M32 24 l2.6 5.4 5.9 0.8 -4.3 4.1 1 5.8 -5.2 -2.8 -5.2 2.8 1 -5.8 -4.3 -4.1 5.9 -0.8 z" fill={g('b')} />
        </>
      );
    case 'magic':
      return (
        <>
          <rect x="12" y="28" width="40" height="26" rx="6" fill={g('a')} />
          <rect x="9" y="21" width="46" height="11" rx="5" fill={g('b')} />
          <rect x="28" y="21" width="8" height="33" rx="3" fill={g('c')} />
          <path d="M20 8 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill={g('c')} />
          <path d="M46 6 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5 z" fill={g('c')} />
        </>
      );
    case 'factory':
      return (
        <>
          <circle cx="19" cy="20" r="8" fill={g('a')} />
          <circle cx="45" cy="20" r="8" fill={g('a')} />
          <circle cx="32" cy="35" r="19" fill={g('a')} />
          <ellipse cx="32" cy="41" rx="9" ry="7" fill={g('b')} />
          <circle cx="25" cy="31" r="2.6" fill="#3b2a26" />
          <circle cx="39" cy="31" r="2.6" fill="#3b2a26" />
          <ellipse cx="32" cy="38" rx="3" ry="2.2" fill="#3b2a26" />
          <circle cx="21" cy="38" r="3" fill="#f6a3a9" opacity="0.7" />
          <circle cx="43" cy="38" r="3" fill="#f6a3a9" opacity="0.7" />
        </>
      );
    case 'drawing':
      return (
        <>
          <path d="M32 10 C48 10 56 20 56 30 c0 8 -7 9 -11 8 c-4 -1 -6 3 -4 7 c2 5 -2 9 -9 9 C18 54 8 44 8 32 C8 19 18 10 32 10 Z" fill={g('a')} />
          <circle cx="22" cy="24" r="4.5" fill="#f47c8a" />
          <circle cx="34" cy="19" r="4.5" fill="#ffc94d" />
          <circle cx="45" cy="26" r="4.5" fill="#6ccaa6" />
          <circle cx="19" cy="37" r="4.5" fill="#8e74de" />
        </>
      );
    case 'shield':
      return (
        <>
          <path d="M32 8 L52 15 V30 C52 43 43 52 32 56 C21 52 12 43 12 30 V15 Z" fill={g('a')} />
          <path d="M22 32 l7 7 l14 -15" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="32" cy="33" r="21" fill={g('a')} />
          <circle cx="32" cy="33" r="15" fill="#fff" opacity="0.9" />
          <path d="M32 24 V33 L38 37" fill="none" stroke={g('b')} strokeWidth="4" strokeLinecap="round" />
          <rect x="27" y="7" width="10" height="7" rx="3" fill={g('b')} />
        </>
      );
    case 'cube':
      return (
        <>
          <path d="M32 9 L53 20 L32 31 L11 20 Z" fill={g('b')} />
          <path d="M11 20 L32 31 V55 L11 44 Z" fill={g('a')} />
          <path d="M53 20 L32 31 V55 L53 44 Z" fill={g('c')} />
        </>
      );
    case 'ruler':
      return (
        <>
          <rect x="8" y="22" width="48" height="20" rx="6" fill={g('a')} transform="rotate(-20 32 32)" />
          <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" transform="rotate(-20 32 32)">
            <path d="M18 22 v7" />
            <path d="M26 22 v5" />
            <path d="M34 22 v7" />
            <path d="M42 22 v5" />
          </g>
        </>
      );
  }
}

// 아이콘마다 점토 색 3벌 (a: 몸통, b: 보조, c: 포인트)
const PALETTE: Record<ClayIconName, [string, string, string][]> = {
  home: [['#c9b8f6', '#9a7fe4', '#6f51c8'], ['#ffc6b3', '#ff9a85', '#e86f5c'], ['#ffe39a', '#ffc94d', '#e6a51f']],
  studio: [['#ffd9c9', '#ffae8f', '#ef8466'], ['#c9b8f6', '#9a7fe4', '#6f51c8'], ['#ffe39a', '#ffc94d', '#e6a51f']],
  theater: [['#ffb8c3', '#f47c8a', '#d4566a'], ['#ffe39a', '#ffc94d', '#e6a51f'], ['#d8cbfa', '#a993ea', '#7b62cf']],
  magic: [['#c9b8f6', '#9a7fe4', '#6f51c8'], ['#b6a2f2', '#8667dc', '#5d40bd'], ['#ffe39a', '#ffc94d', '#e6a51f']],
  factory: [['#f7d3b0', '#e2a877', '#c27f4d'], ['#fff1e2', '#f9dcc0', '#e8bf98'], ['#000', '#000', '#000']],
  drawing: [['#ffe4d2', '#ffc6a3', '#efa277'], ['#000', '#000', '#000'], ['#000', '#000', '#000']],
  shield: [['#a8e6cf', '#5cc49b', '#33a077'], ['#000', '#000', '#000'], ['#000', '#000', '#000']],
  clock: [['#c9b8f6', '#9a7fe4', '#6f51c8'], ['#b6a2f2', '#8667dc', '#5d40bd'], ['#000', '#000', '#000']],
  cube: [['#a8e6cf', '#5cc49b', '#33a077'], ['#d5f5e8', '#a8e6cf', '#73cfa9'], ['#7fd6b4', '#3fb388', '#258a63']],
  ruler: [['#ffe39a', '#ffc94d', '#e6a51f'], ['#000', '#000', '#000'], ['#000', '#000', '#000']],
};

export function ClayIcon({ name, size = 56, tile = true }: { name: ClayIconName; size?: number; tile?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const keys = ['a', 'b', 'c'];
  const g = (k: string) => `url(#${uid}${k})`;
  const svg = (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        {PALETTE[name].map(([l, b, d], i) => (
          <Clay key={i} id={`${uid}${keys[i]}`} light={l} base={b} dark={d} />
        ))}
      </defs>
      <ellipse cx="32" cy="58" rx="16" ry="3" fill="#5b3fa8" opacity="0.08" />
      {shapes(name, g)}
    </svg>
  );
  if (!tile) return svg;
  return (
    <span className="clay-tile" style={{ background: TILE[name] }}>
      {svg}
    </span>
  );
}

/** 단순 선 아이콘 (상단바·버튼용) */
export type LineIconName =
  | 'back' | 'speaker' | 'stop' | 'lock' | 'arrow' | 'prev' | 'next' | 'home'
  | 'grid' | 'book' | 'smile' | 'cube' | 'box' | 'gear' | 'check' | 'users' | 'flag' | 'bell' | 'search'
  | 'eye' | 'eyeOff' | 'mail' | 'logout' | 'heart' | 'mute' | 'mic';

export function LineIcon({ name, size = 26 }: { name: LineIconName; size?: number }) {
  const paths: Record<LineIconName, ReactNode> = {
    back: <path d="M15 5 L8 12 L15 19" />,
    prev: <path d="M15 5 L8 12 L15 19" />,
    next: <path d="M9 5 L16 12 L9 19" />,
    arrow: (
      <>
        <path d="M5 12 H19" />
        <path d="M13 6 L19 12 L13 18" />
      </>
    ),
    speaker: (
      <>
        <path d="M4 10 v4 h4 l5 4 V6 L8 10 Z" />
        <path d="M16.5 8.5 a5 5 0 0 1 0 7" />
        <path d="M19 6 a8.5 8.5 0 0 1 0 12" />
      </>
    ),
    stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />,
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="3" />
        <path d="M8 11 V8 a4 4 0 0 1 8 0 v3" />
      </>
    ),
    home: (
      <>
        <path d="M4 11 L12 4 L20 11" />
        <path d="M6 10 V20 H18 V10" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="2" />
        <rect x="13" y="4" width="7" height="7" rx="2" />
        <rect x="4" y="13" width="7" height="7" rx="2" />
        <rect x="13" y="13" width="7" height="7" rx="2" />
      </>
    ),
    book: (
      <>
        <path d="M4 6 C7 4.5 10 4.5 12 6.5 V19 C10 17.5 7 17.5 4 19 Z" />
        <path d="M20 6 C17 4.5 14 4.5 12 6.5 V19 C14 17.5 17 17.5 20 19 Z" />
      </>
    ),
    smile: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M9 14 q3 3 6 0" />
        <path d="M9.5 10 h0.01 M14.5 10 h0.01" />
      </>
    ),
    cube: (
      <>
        <path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" />
        <path d="M4 7.5 L12 12 L20 7.5 M12 12 V21" />
      </>
    ),
    box: (
      <>
        <rect x="4" y="8" width="16" height="12" rx="2" />
        <path d="M3 5 h18 v3 H3 z M10 12 h4" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3 v3 M12 18 v3 M3 12 h3 M18 12 h3 M5.6 5.6 l2.1 2.1 M16.3 16.3 l2.1 2.1 M5.6 18.4 l2.1 -2.1 M16.3 7.7 l2.1 -2.1" />
      </>
    ),
    check: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M8 12 l3 3 l5 -6" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="9" r="3.5" />
        <path d="M3 20 c0 -4 3 -6 6 -6 s6 2 6 6" />
        <path d="M16 6 a3 3 0 0 1 0 6 M18 14 c2 1 3 3 3 6" />
      </>
    ),
    flag: (
      <>
        <path d="M5 21 V4" />
        <path d="M5 4 h11 l-2 4 l2 4 H5" />
      </>
    ),
    bell: (
      <>
        <path d="M6 16 V11 a6 6 0 0 1 12 0 v5 l2 2 H4 z" />
        <path d="M10 20 a2 2 0 0 0 4 0" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16 l4 4" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12 C5 7 8.5 5 12 5 s7 2 9.5 7 c-2.5 5 -6 7 -9.5 7 s-7 -2 -9.5 -7 z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M2.5 12 C5 7 8.5 5 12 5 s7 2 9.5 7 c-2.5 5 -6 7 -9.5 7 s-7 -2 -9.5 -7 z" />
        <path d="M4 4 L20 20" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M4 7 l8 6 l8 -6" />
      </>
    ),
    logout: (
      <>
        <path d="M14 4 H7 a2 2 0 0 0 -2 2 v12 a2 2 0 0 0 2 2 h7" />
        <path d="M11 12 H21 M17 8 l4 4 l-4 4" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5.5 11 a6.5 6.5 0 0 0 13 0 M12 17.5 V21 M8.5 21 h7" />
      </>
    ),
    mute: (
      <>
        <path d="M4 10 v4 h4 l5 4 V6 L8 10 Z" />
        <path d="M16.5 9.5 l5 5 M21.5 9.5 l-5 5" />
      </>
    ),
    heart: <path d="M12 20 s-7.5 -4.5 -7.5 -10 a4 4 0 0 1 7.5 -2 a4 4 0 0 1 7.5 2 c0 5.5 -7.5 10 -7.5 10 z" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
