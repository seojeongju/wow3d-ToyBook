import { useId, type ReactNode } from 'react';
import { applyPalette, type RoomPalette, type ToneRole } from './palette';

/**
 * 우리 집 책장 템플릿.
 * 배경 그림 + "책 자리" 정보로 이루어지고, 좌표는 모두 그림 크기에 대한 비율(0~1).
 * 기본 템플릿(점토 SVG)과 2단계의 사진 변환 템플릿(이미지 URL)이 같은 형식을 씀.
 */
export interface Slot {
  /** 선반 왼쪽·오른쪽 끝 (가로 비율) */
  x0: number;
  x1: number;
  /** 책이 서는 선반 윗면 (세로 비율, 위에서부터) */
  y: number;
}

export interface RoomTemplate {
  id: string;
  name: string;
  kind: 'builtin' | 'photo';
  /** 세로 ÷ 가로 */
  ratio: number;
  /** 책을 세울 선반들 (위에서 아래 순서) */
  shelves: Slot[];
  /** 이름표 위치 (가운데 기준) */
  plaque: { x: number; y: number };
  /** 3단계: 주문한 피규어를 올려 둘 자리 */
  figure?: { x: number; y: number };
  /** 터치하면 낮/밤 무드등이 켜지는 조명 위치 */
  lamp?: { x: number; y: number; label: string };
  /** 기본 템플릿 그림 (사진 템플릿은 imageUrl). palette 를 주면 사진에서 뽑은 색으로 칠함 (1.5단계) */
  Art?: (props: ArtProps) => ReactNode;
  imageUrl?: string;
  /** 고르기 화면에 보여 줄 한 줄 설명 */
  blurb: string;
}

/** 책 한 권의 크기 (그림 가로에 대한 비율) */
export const BOOK = { w: 0.095, h: 0.13, gap: 0.016 };

/** 선반 하나에 들어가는 책 수 */
export function slotCapacity(s: Slot): number {
  return Math.max(0, Math.floor((s.x1 - s.x0 + BOOK.gap) / (BOOK.w + BOOK.gap)));
}

// 점토 그라데이션 정의 (템플릿마다 id 가 겹치지 않게 접두어 사용)
function ClayDefs({ p, tones }: { p: string; tones: Record<string, [string, string, string]> }) {
  return (
    <defs>
      {Object.entries(tones).map(([k, [l, b, d]]) => (
        <radialGradient key={k} id={`${p}${k}`} cx="32%" cy="22%" r="95%">
          <stop offset="0" stopColor={l} />
          <stop offset="0.55" stopColor={b} />
          <stop offset="1" stopColor={d} />
        </radialGradient>
      ))}
    </defs>
  );
}

const usePrefix = () => useId().replace(/:/g, '');

export interface ArtProps {
  palette?: RoomPalette | null;
}

// 사진 색을 입힐 때 각 색이 맡는 역할 (역할이 없는 잎·전구·별 등은 원래 색 유지)
const WOOD_ROLES: Record<string, ToneRole> = { wall: 'wall', floor: 'floor', frame: 'main', back: 'mainLight', plank: 'main', rug: 'accent', pot: 'accent' };
const CLOUD_ROLES: Record<string, ToneRole> = { sky: 'wall', cloud: 'mainLight', pink: 'accent', lav: 'main' };
const DESK_ROLES: Record<string, ToneRole> = { wall: 'wall', floor: 'floor', frame: 'accent', wood: 'main', stand: 'accent' };

/* ───────── 1. 나무 책장 ───────── */
function WoodArt({ palette }: ArtProps) {
  const p = usePrefix();
  const u = (k: string) => `url(#${p}${k})`;
  return (
    <svg viewBox="0 0 1000 700" className="room-art" aria-hidden>
      <ClayDefs
        p={p}
        tones={applyPalette(
          {
            wall: ['#fbf6ff', '#f1e9fd', '#e2d6f7'],
            floor: ['#ffe9dc', '#f6cdb4', '#e3ab8b'],
            frame: ['#f2c9a0', '#d79d6c', '#b07444'],
            back: ['#fff4e6', '#f7e1c8', '#e8c9a6'],
            plank: ['#f6d4ae', '#e0a978', '#bf8452'],
            rug: ['#e6dcfc', '#c4b2f3', '#9f88e3'],
            pot: ['#ffd9c9', '#ffae8f', '#ef8466'],
            leaf: ['#d2f3e4', '#6cc79c', '#3f9d72'],
            lamp: ['#fff3c4', '#ffc94d', '#e6a51f'],
          },
          WOOD_ROLES,
          palette,
        )}
      />
      <rect width="1000" height="700" fill={u('wall')} />
      <rect y="600" width="1000" height="100" fill={u('floor')} />
      <ellipse cx="500" cy="660" rx="330" ry="30" fill={u('rug')} />
      {/* 책장 틀 */}
      <rect x="170" y="70" width="660" height="540" rx="38" fill={u('frame')} />
      <rect x="200" y="100" width="600" height="490" rx="22" fill={u('back')} />
      {[250, 410, 570].map((y) => (
        <g key={y}>
          <rect x="188" y={y} width="624" height="24" rx="12" fill={u('plank')} />
          <rect x="196" y={y + 2} width="608" height="6" rx="3" fill="#fff" opacity="0.35" />
        </g>
      ))}
      {/* 책장 위 화분과 별 램프 */}
      <path d="M262 18 c-14 -28 -8 -52 10 -64 c8 22 6 44 -10 64 z" fill={u('leaf')} transform="translate(0 50)" />
      <path d="M270 70 c10 -30 34 -44 58 -44 c-6 26 -26 42 -58 44 z" fill={u('leaf')} />
      <path d="M232 46 h70 l-8 26 h-54 z" fill={u('pot')} />
      <path d="M720 30 l9 19 21 3 -15 15 4 21 -19 -10 -19 10 4 -21 -15 -15 21 -3 z" fill={u('lamp')} />
      <circle cx="729" cy="58" r="40" fill="#ffc94d" opacity="0.12" />
      {/* 바닥 장난감 블록 */}
      <rect x="860" y="600" width="60" height="44" rx="10" fill={u('pot')} />
      <rect x="872" y="590" width="14" height="12" rx="5" fill={u('pot')} />
      <rect x="896" y="590" width="14" height="12" rx="5" fill={u('pot')} />
      <rect x="80" y="610" width="54" height="40" rx="10" fill={u('rug')} />
    </svg>
  );
}

/* ───────── 2. 구름 책장 ───────── */
function CloudArt({ palette }: ArtProps) {
  const p = usePrefix();
  const u = (k: string) => `url(#${p}${k})`;
  const cloud = (x0: number, x1: number, y: number) => {
    const w = x1 - x0;
    return (
      <g>
        <ellipse cx={x0 + w * 0.2} cy={y + 34} rx={w * 0.22} ry="40" fill={u('cloud')} />
        <ellipse cx={x0 + w * 0.5} cy={y + 46} rx={w * 0.3} ry="48" fill={u('cloud')} />
        <ellipse cx={x0 + w * 0.8} cy={y + 34} rx={w * 0.22} ry="40" fill={u('cloud')} />
        <rect x={x0 - 14} y={y} width={w + 28} height="40" rx="20" fill={u('cloud')} />
        <rect x={x0} y={y + 4} width={w} height="6" rx="3" fill="#fff" opacity="0.8" />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 1000 700" className="room-art" aria-hidden>
      <ClayDefs
        p={p}
        tones={applyPalette(
          {
            sky: ['#f4eefe', '#e6dcfc', '#f9dfe9'],
            cloud: ['#ffffff', '#f6f1fc', '#ddd2ef'],
            moon: ['#fff3c4', '#ffc94d', '#e6a51f'],
            star: ['#fff3c4', '#ffd166', '#f0b43a'],
            pink: ['#ffdbe2', '#f4a0b2', '#d97890'],
            lav: ['#e3d9fc', '#a993ea', '#7b62cf'],
          },
          CLOUD_ROLES,
          palette,
        )}
      />
      <rect width="1000" height="700" fill={u('sky')} />
      <path d="M880 40 A70 70 0 1 0 930 160 A56 56 0 1 1 880 40 Z" fill={u('moon')} />
      {[
        [120, 80, 14],
        [430, 60, 10],
        [640, 130, 12],
        [930, 300, 9],
        [60, 420, 11],
        [940, 560, 13],
      ].map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - r} Q${x + r * 0.25} ${y - r * 0.25} ${x + r} ${y} Q${x + r * 0.25} ${y + r * 0.25} ${x} ${y + r} Q${x - r * 0.25} ${y + r * 0.25} ${x - r} ${y} Q${x - r * 0.25} ${y - r * 0.25} ${x} ${y - r} Z`}
          fill={u('star')}
        />
      ))}
      {cloud(110, 560, 250)}
      {cloud(440, 890, 420)}
      {cloud(120, 570, 590)}
      <circle cx="760" cy="230" r="26" fill={u('pink')} opacity="0.85" />
      <circle cx="290" cy="440" r="18" fill={u('lav')} opacity="0.8" />
    </svg>
  );
}

/* ───────── 3. 내 책상 ───────── */
function DeskArt({ palette }: ArtProps) {
  const p = usePrefix();
  const u = (k: string) => `url(#${p}${k})`;
  return (
    <svg viewBox="0 0 1000 700" className="room-art" aria-hidden>
      <ClayDefs
        p={p}
        tones={applyPalette(
          {
            wall: ['#fffaf4', '#fbefe4', '#f1dccb'],
            floor: ['#efe7fd', '#ddd0fb', '#c3b1f2'],
            sky: ['#eef6ff', '#cfe3fb', '#a9c8f2'],
            frame: ['#e3d9fc', '#a993ea', '#7b62cf'],
            cloud: ['#ffffff', '#f6f1fc', '#ddd2ef'],
            wood: ['#f6d4ae', '#e0a978', '#bf8452'],
            lamp: ['#d2f3e4', '#6cc79c', '#3f9d72'],
            bulb: ['#fff3c4', '#ffc94d', '#e6a51f'],
            stand: ['#ffd9c9', '#ffae8f', '#ef8466'],
          },
          DESK_ROLES,
          palette,
        )}
      />
      <rect width="1000" height="700" fill={u('wall')} />
      <rect y="640" width="1000" height="60" fill={u('floor')} />
      {/* 창문 */}
      <rect x="80" y="60" width="340" height="200" rx="30" fill={u('frame')} />
      <rect x="100" y="80" width="300" height="160" rx="20" fill={u('sky')} />
      <ellipse cx="200" cy="170" rx="56" ry="24" fill={u('cloud')} />
      <ellipse cx="320" cy="130" rx="40" ry="18" fill={u('cloud')} />
      <rect x="244" y="80" width="12" height="160" fill={u('frame')} />
      {/* 벽 선반 */}
      <rect x="505" y="260" width="410" height="24" rx="12" fill={u('wood')} />
      <path d="M560 284 v34 h22 z M840 284 v34 h-22 z" fill={u('wood')} />
      {/* 책상 */}
      <rect x="60" y="520" width="880" height="34" rx="17" fill={u('wood')} />
      <rect x="70" y="524" width="860" height="7" rx="3" fill="#fff" opacity="0.35" />
      <rect x="110" y="552" width="30" height="92" rx="12" fill={u('wood')} />
      <rect x="860" y="552" width="30" height="92" rx="12" fill={u('wood')} />
      {/* 스탠드 */}
      <ellipse cx="160" cy="518" rx="54" ry="12" fill={u('lamp')} />
      <path d="M160 516 L196 410" stroke="#3f9d72" strokeWidth="12" strokeLinecap="round" />
      <path d="M150 388 q46 -52 96 0 z" fill={u('lamp')} />
      <ellipse cx="198" cy="396" rx="18" ry="9" fill={u('bulb')} />
      {/* 피규어 받침대 (3단계: 주문한 피규어가 이 자리에 놓임) */}
      <ellipse cx="855" cy="514" rx="44" ry="11" fill={u('stand')} />
      <rect x="815" y="494" width="80" height="20" rx="10" fill={u('stand')} />
    </svg>
  );
}

export const BUILTIN_ROOMS: RoomTemplate[] = [
  {
    id: 'wood',
    name: '나무 책장',
    kind: 'builtin',
    ratio: 0.7,
    shelves: [
      { x0: 0.21, x1: 0.79, y: 250 / 700 },
      { x0: 0.21, x1: 0.79, y: 410 / 700 },
      { x0: 0.21, x1: 0.79, y: 570 / 700 },
    ],
    plaque: { x: 0.5, y: 0.1 },
    figure: { x: 0.89, y: 588 / 700 },
    lamp: { x: 0.729, y: 58 / 700, label: '별 무드등' },
    Art: WoodArt,
    blurb: '포근한 나무 책장에 책을 꽂아요',
  },
  {
    id: 'cloud',
    name: '구름 책장',
    kind: 'builtin',
    ratio: 0.7,
    shelves: [
      { x0: 0.12, x1: 0.55, y: 250 / 700 },
      { x0: 0.45, x1: 0.88, y: 420 / 700 },
      { x0: 0.13, x1: 0.56, y: 590 / 700 },
    ],
    plaque: { x: 0.74, y: 0.2 },
    figure: { x: 0.78, y: 590 / 700 },
    lamp: { x: 0.89, y: 100 / 700, label: '달님 무드등' },
    Art: CloudArt,
    blurb: '밤하늘 구름 위에 책이 둥실둥실',
  },
  {
    id: 'desk',
    name: '내 책상',
    kind: 'builtin',
    ratio: 0.7,
    shelves: [
      { x0: 0.52, x1: 0.9, y: 260 / 700 },
      { x0: 0.26, x1: 0.78, y: 520 / 700 },
    ],
    // 벽 선반 위쪽 이름표 (하단 메뉴와 겹치지 않도록 상단 배치)
    plaque: { x: 0.71, y: 115 / 700 },
    figure: { x: 0.855, y: 494 / 700 },
    lamp: { x: 0.198, y: 396 / 700, label: '책상 스탠드' },
    Art: DeskArt,
    blurb: '책상 위에 책과 피규어를 올려요',
  },
];

export const DEFAULT_ROOM = BUILTIN_ROOMS[0];

export function findRoom(id: string | null | undefined): RoomTemplate {
  return BUILTIN_ROOMS.find((r) => r.id === id) ?? DEFAULT_ROOM;
}

// 아이별로 고른 템플릿 (로그인 연동 전에는 이 기기에 기억, 이후 DB 로 옮김)
const roomKey = (childId: string) => `toybook.room.${childId}`;

export function loadRoomId(childId: string): string | null {
  try {
    return localStorage.getItem(roomKey(childId));
  } catch {
    return null;
  }
}

export function saveRoomId(childId: string, roomId: string) {
  try {
    localStorage.setItem(roomKey(childId), roomId);
  } catch {
    /* 저장 못 해도 이번 화면에는 적용됨 */
  }
}
