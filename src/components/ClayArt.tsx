import { useId, type ReactNode } from 'react';

/**
 * 점토(클레이) 일러스트 모음. 화면에 이모지를 그대로 쓰지 않고 이 그림으로 바꿔 그림.
 * DB 에는 지금처럼 이모지(아바타·표지·페이지 그림)를 키로 저장하고, 화면에서 emojiArt() 로 변환.
 * 새 그림은 같은 방식(clay 그라데이션 3단 + 바닥 그림자)으로 추가.
 */
export type ClayArtName =
  | 'bear' | 'rabbit' | 'dino' | 'chick' | 'sprout' | 'tree' | 'moon' | 'fairy' | 'tooth'
  | 'toothbrush' | 'sparkles' | 'blocks' | 'robot' | 'island' | 'sunset' | 'book' | 'heart' | 'star';

// 점토 색 3단 (밝은 면, 바탕, 그늘)
const C = {
  lav: ['#e3d9fc', '#a993ea', '#7b62cf'],
  peach: ['#ffe2d6', '#ffae8f', '#ef8466'],
  yellow: ['#fff3c4', '#ffc94d', '#e6a51f'],
  mint: ['#d2f3e4', '#6cc79c', '#3f9d72'],
  pink: ['#ffdbe2', '#f4a0b2', '#d97890'],
  cream: ['#fffef9', '#f6ede2', '#dfcdb8'],
  brown: ['#f8dcbf', '#e3a974', '#bf7c47'],
  white: ['#ffffff', '#f1ecf6', '#cdc3db'],
  blue: ['#dcebff', '#9cc2f2', '#6b97d6'],
  green: ['#d4f3c4', '#86d27a', '#4f9f4a'],
  grey: ['#f3f4f9', '#cdd2e0', '#9aa3ba'],
  orange: ['#ffe0b8', '#ffa94d', '#e5791f'],
} as const;
type Tone = keyof typeof C;

const EMOJI: Record<string, ClayArtName> = {
  '🐻': 'bear', '🐰': 'rabbit', '🦖': 'dino', '🐣': 'chick', '🌱': 'sprout', '🌳': 'tree',
  '🌙': 'moon', '🧚': 'fairy', '🦷': 'tooth', '🪥': 'toothbrush', '✨': 'sparkles', '🧱': 'blocks',
  '🤖': 'robot', '🏝️': 'island', '🏝': 'island', '🌅': 'sunset', '📘': 'book', '💜': 'heart', '⭐': 'star',
};

/** 이모지 키를 점토 그림 이름으로 (모르는 이모지는 책 그림) */
export function emojiArt(emoji: string | null | undefined): ClayArtName {
  return (emoji && EMOJI[emoji]) || 'book';
}

export default function ClayArt({ name, size = 64, label }: { name: ClayArtName; size?: number; label?: string }) {
  const uid = useId().replace(/:/g, '');
  const g = (t: Tone) => `url(#${uid}${t})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="clay-art"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        {(Object.keys(C) as Tone[]).map((t) => (
          <radialGradient key={t} id={`${uid}${t}`} cx="32%" cy="26%" r="85%">
            <stop offset="0" stopColor={C[t][0]} />
            <stop offset="0.55" stopColor={C[t][1]} />
            <stop offset="1" stopColor={C[t][2]} />
          </radialGradient>
        ))}
      </defs>
      <ellipse cx="50" cy="92" rx="30" ry="4.5" fill="#5b3fa8" opacity="0.1" />
      {ART[name](g)}
    </svg>
  );
}

const eyes = (lx: number, rx: number, y: number, r = 3.6) => (
  <>
    <circle cx={lx} cy={y} r={r} fill="#2b2850" />
    <circle cx={rx} cy={y} r={r} fill="#2b2850" />
    <circle cx={lx + 1.2} cy={y - 1.3} r={r * 0.35} fill="#fff" />
    <circle cx={rx + 1.2} cy={y - 1.3} r={r * 0.35} fill="#fff" />
  </>
);
const cheeks = (lx: number, rx: number, y: number) => (
  <>
    <ellipse cx={lx} cy={y} rx="4.5" ry="3" fill="#f6a3a9" opacity="0.7" />
    <ellipse cx={rx} cy={y} rx="4.5" ry="3" fill="#f6a3a9" opacity="0.7" />
  </>
);
const smile = (x: number, y: number) => <path d={`M${x - 4} ${y} q4 4 8 0`} fill="none" stroke="#2b2850" strokeWidth="2.4" strokeLinecap="round" />;
const star4 = (x: number, y: number, r: number, fill: string) => (
  <path d={`M${x} ${y - r} Q${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y} Q${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r} Q${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y} Q${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z`} fill={fill} />
);

const ART: Record<ClayArtName, (g: (t: Tone) => string) => ReactNode> = {
  bear: (g) => (
    <>
      <circle cx="27" cy="28" r="12" fill={g('brown')} />
      <circle cx="73" cy="28" r="12" fill={g('brown')} />
      <circle cx="27" cy="28" r="6" fill="#f3c6a3" />
      <circle cx="73" cy="28" r="6" fill="#f3c6a3" />
      <circle cx="50" cy="54" r="34" fill={g('brown')} />
      <ellipse cx="50" cy="64" rx="15" ry="11" fill={g('cream')} />
      <ellipse cx="50" cy="59" rx="5" ry="3.6" fill="#3b2a26" />
      {eyes(38, 62, 48)}
      {cheeks(30, 70, 62)}
      {smile(50, 66)}
    </>
  ),
  rabbit: (g) => (
    <>
      <ellipse cx="36" cy="24" rx="9" ry="22" fill={g('white')} transform="rotate(-10 36 24)" />
      <ellipse cx="64" cy="24" rx="9" ry="22" fill={g('white')} transform="rotate(10 64 24)" />
      <ellipse cx="36" cy="26" rx="4" ry="15" fill="#f8c3cf" transform="rotate(-10 36 26)" />
      <ellipse cx="64" cy="26" rx="4" ry="15" fill="#f8c3cf" transform="rotate(10 64 26)" />
      <ellipse cx="50" cy="60" rx="32" ry="29" fill={g('white')} />
      {eyes(39, 61, 56)}
      <path d="M46 63 h8 l-4 4 z" fill="#f47c8a" />
      {cheeks(30, 70, 66)}
      <path d="M50 67 v3 M46 71 q4 3 8 0" fill="none" stroke="#2b2850" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  dino: (g) => (
    <>
      {/* 등 가시: 아래쪽이 몸통에 묻히도록 몸통보다 먼저 그림 */}
      <path d="M30 44 l5 -13 l7 10 l6 -14 l6 14 l7 -10 l5 13 z" fill={g('yellow')} />
      <path d="M78 74 q16 -2 14 -16 q-8 8 -18 6 z" fill={g('green')} />
      <ellipse cx="52" cy="62" rx="30" ry="27" fill={g('green')} />
      <ellipse cx="54" cy="70" rx="16" ry="13" fill={g('cream')} />
      <ellipse cx="36" cy="86" rx="9" ry="5" fill={g('green')} />
      <ellipse cx="66" cy="86" rx="9" ry="5" fill={g('green')} />
      {eyes(42, 60, 52)}
      {cheeks(35, 67, 60)}
      {smile(51, 60)}
    </>
  ),
  chick: (g) => (
    <>
      <circle cx="50" cy="44" r="26" fill={g('yellow')} />
      <path d="M44 51 l6 6 l6 -6 z" fill={g('orange')} />
      {eyes(41, 59, 42, 3.2)}
      {cheeks(34, 66, 52)}
      <path d="M50 18 q-2 -8 4 -10 q-1 6 -4 10" fill={g('yellow')} />
      <path d="M20 58 h60 v10 a30 24 0 0 1 -60 0 z" fill={g('cream')} />
      <path d="M20 58 l8 8 l8 -8 l7 8 l7 -8 l7 8 l7 -8 l8 8 l8 -8" fill={g('cream')} stroke="#e2d2bf" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  sprout: (g) => (
    <>
      <path d="M50 78 V46" stroke="#4f9f4a" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 52 C34 54 22 44 22 30 C38 28 50 38 50 52 Z" fill={g('green')} />
      <path d="M50 46 C64 48 78 38 78 22 C60 22 50 32 50 46 Z" fill={g('mint')} />
      <ellipse cx="50" cy="82" rx="28" ry="9" fill={g('brown')} />
    </>
  ),
  tree: (g) => (
    <>
      <rect x="43" y="56" width="14" height="32" rx="6" fill={g('brown')} />
      <circle cx="34" cy="48" r="18" fill={g('green')} />
      <circle cx="66" cy="48" r="18" fill={g('green')} />
      <circle cx="50" cy="32" r="22" fill={g('mint')} />
      <circle cx="40" cy="34" r="3" fill="#f47c8a" />
      <circle cx="62" cy="44" r="3" fill="#f47c8a" />
    </>
  ),
  moon: (g) => (
    <>
      <path d="M62 14 A36 36 0 1 0 84 70 A30 30 0 1 1 62 14 Z" fill={g('yellow')} />
      <circle cx="42" cy="46" r="4" fill="#e6a51f" opacity="0.35" />
      <circle cx="34" cy="64" r="3" fill="#e6a51f" opacity="0.35" />
      {star4(78, 24, 8, g('lav'))}
      {star4(86, 46, 5, g('pink'))}
    </>
  ),
  fairy: (g) => (
    <>
      <ellipse cx="30" cy="46" rx="16" ry="22" fill={g('pink')} opacity="0.85" transform="rotate(-25 30 46)" />
      <ellipse cx="70" cy="46" rx="16" ry="22" fill={g('pink')} opacity="0.85" transform="rotate(25 70 46)" />
      <path d="M38 86 L50 50 L62 86 Z" fill={g('lav')} />
      <circle cx="50" cy="38" r="15" fill={g('cream')} />
      <path d="M35 36 q15 -20 30 0 q-4 -6 -15 -6 q-11 0 -15 6" fill={g('brown')} />
      {eyes(45, 55, 40, 2.4)}
      {cheeks(41, 59, 45)}
      <path d="M68 66 L82 34" stroke="#e6a51f" strokeWidth="3" strokeLinecap="round" />
      {star4(83, 30, 7, g('yellow'))}
    </>
  ),
  tooth: (g) => (
    <>
      <path d="M26 30 C26 14 42 14 50 20 C58 14 74 14 74 30 C74 46 70 56 68 72 C66 86 58 86 56 74 C54 64 46 64 44 74 C42 86 34 86 32 72 C30 56 26 46 26 30 Z" fill={g('white')} />
      {eyes(41, 59, 38, 3)}
      {cheeks(35, 65, 46)}
      {smile(50, 46)}
      {star4(80, 18, 6, g('yellow'))}
    </>
  ),
  toothbrush: (g) => (
    <g transform="rotate(-35 50 50)">
      <rect x="44" y="34" width="12" height="58" rx="6" fill={g('pink')} />
      <rect x="40" y="8" width="20" height="28" rx="5" fill={g('white')} />
      <g fill={g('blue')}>
        <rect x="40" y="10" width="5" height="22" rx="2.5" />
        <rect x="47.5" y="10" width="5" height="22" rx="2.5" />
        <rect x="55" y="10" width="5" height="22" rx="2.5" />
      </g>
      <circle cx="50" cy="70" r="4" fill="#fff" opacity="0.7" />
    </g>
  ),
  sparkles: (g) => (
    <>
      {star4(44, 50, 26, g('yellow'))}
      {star4(76, 26, 12, g('lav'))}
      {star4(78, 72, 9, g('pink'))}
      {star4(20, 22, 7, g('mint'))}
    </>
  ),
  blocks: (g) => {
    const brick = (x: number, y: number, w: number, t: Tone) => (
      <g>
        {Array.from({ length: Math.round(w / 14) }, (_, i) => (
          <rect key={i} x={x + 4 + i * 14} y={y - 5} width="8" height="7" rx="3" fill={g(t)} />
        ))}
        <rect x={x} y={y} width={w} height="20" rx="6" fill={g(t)} />
      </g>
    );
    return (
      <>
        {brick(14, 66, 42, 'peach')}
        {brick(56, 66, 30, 'mint')}
        {brick(28, 42, 42, 'lav')}
        {brick(40, 18, 28, 'yellow')}
      </>
    );
  },
  robot: (g) => (
    <>
      <path d="M50 12 V22" stroke="#9aa3ba" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="10" r="5" fill={g('peach')} />
      <rect x="22" y="22" width="56" height="44" rx="18" fill={g('grey')} />
      <rect x="30" y="30" width="40" height="26" rx="12" fill={g('blue')} />
      <circle cx="41" cy="43" r="4.5" fill="#fff" />
      <circle cx="59" cy="43" r="4.5" fill="#fff" />
      <circle cx="16" cy="44" r="6" fill={g('lav')} />
      <circle cx="84" cy="44" r="6" fill={g('lav')} />
      <rect x="32" y="68" width="36" height="20" rx="9" fill={g('lav')} />
      <circle cx="50" cy="78" r="4" fill={g('yellow')} />
    </>
  ),
  island: (g) => (
    <>
      <ellipse cx="50" cy="80" rx="44" ry="10" fill={g('blue')} />
      <ellipse cx="50" cy="72" rx="32" ry="12" fill={g('yellow')} />
      <path d="M52 70 C50 54 54 40 60 30" stroke="#bf7c47" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M60 30 C48 20 34 24 30 32 C42 28 52 30 60 30 Z" fill={g('green')} />
      <path d="M60 30 C70 18 84 20 88 30 C78 26 68 28 60 30 Z" fill={g('green')} />
      <path d="M60 30 C62 18 56 10 48 10 C54 16 58 22 60 30 Z" fill={g('mint')} />
      <circle cx="56" cy="34" r="3.5" fill={g('brown')} />
    </>
  ),
  sunset: (g) => (
    <>
      <rect x="8" y="20" width="84" height="52" rx="22" fill={g('pink')} opacity="0.55" />
      <path d="M22 62 A28 28 0 0 1 78 62 Z" fill={g('orange')} />
      <ellipse cx="50" cy="74" rx="42" ry="12" fill={g('lav')} />
      <path d="M30 72 h16 M54 76 h18 M38 80 h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </>
  ),
  book: (g) => (
    <>
      <path d="M8 74 L16 34 L50 40 L84 34 L92 74 L50 82 Z" fill={g('lav')} />
      <path d="M18 66 L24 30 C36 26 46 30 50 38 V76 C42 70 30 66 18 66 Z" fill={g('cream')} />
      <path d="M82 66 L76 30 C64 26 54 30 50 38 V76 C58 70 70 66 82 66 Z" fill={g('cream')} />
      <path d="M28 42 h14 M27 50 h13 M60 42 h14 M60 50 h13" stroke="#dfcdb8" strokeWidth="2.6" strokeLinecap="round" />
      {star4(50, 16, 8, g('yellow'))}
    </>
  ),
  heart: (g) => <path d="M50 84 C20 64 12 46 18 32 C24 18 42 16 50 30 C58 16 76 18 82 32 C88 46 80 64 50 84 Z" fill={g('pink')} />,
  star: (g) => (
    <path d="M50 10 L61 36 L89 38 L67 56 L74 84 L50 69 L26 84 L33 56 L11 38 L39 36 Z" fill={g('yellow')} stroke="#f3b632" strokeWidth="2" strokeLinejoin="round" />
  ),
};

/** 이모지 키를 받아 점토 그림으로 그려 주는 편의 컴포넌트 */
export function ClayEmoji({ emoji, size = 64, label }: { emoji: string | null | undefined; size?: number; label?: string }) {
  return <ClayArt name={emojiArt(emoji)} size={size} label={label} />;
}
