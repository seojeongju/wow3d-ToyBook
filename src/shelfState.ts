import type { ClayArtName } from './components/ClayArt';

export type ShelfFigureId = 'star' | 'rabbit' | 'dino' | 'robot' | 'fairy';

export interface ShelfFigureInfo {
  id: ShelfFigureId;
  name: string;
  role: string;
  art: ClayArtName;
  image: string;
  tone: 'yellow' | 'pink' | 'mint' | 'lavender' | 'peach';
  greeting: string;
  storyPreview: {
    place: string;
    title: string;
    summary: string;
  };
}

export const SHELF_FIGURES: ShelfFigureInfo[] = [
  {
    id: 'fairy',
    name: '치카 요정',
    role: '반짝 습관 요정',
    art: 'fairy',
    image: '/hero-fairy.jpg',
    tone: 'peach',
    greeting: '반짝반짝 안녕! 나는 치카 요정이야! 오늘도 이가 반짝반짝 빛나네!',
    storyPreview: {
      place: '민트 거품 왕국',
      title: '치카 요정과 요술 칫솔의 비밀',
      summary: '요술 칫솔을 흔들면 민트 거품 별이 퐁퐁! 충치 벌레들을 물리치고 반짝이는 치아 왕국을 지키는 이야기예요.',
    },
  },
  {
    id: 'dino',
    name: '꼬마 공룡',
    role: '용감한 탐험가',
    art: 'dino',
    image: '/hero-dino.jpg',
    tone: 'mint',
    greeting: '크앙! 반가워! 나는 꼬마 공룡이야! 신나는 모험 동화를 만들자!',
    storyPreview: {
      place: '무지개 공룡 섬',
      title: '꼬마 공룡과 블록 보물섬',
      summary: '알록달록 블록 다리를 건너 무지개 공룡 섬으로 떠나요! 숲속에 숨겨진 반짝이는 공룡 알을 찾아볼까요?',
    },
  },
  {
    id: 'robot',
    name: '장난감 로봇',
    role: '우주 비행 친구',
    art: 'robot',
    image: '/hero-robot.jpg',
    tone: 'lavender',
    greeting: '삐빅! 안녕! 나는 장난감 로봇이야! 우주 끝까지 날아가 볼까?',
    storyPreview: {
      place: '별빛 우주 정거장',
      title: '장난감 로봇의 은하수 출동',
      summary: '머리 위 별 안테나가 반짝! 꼬마 로켓을 타고 달님 정거장까지 날아가 길 잃은 아기 별을 도와주는 모험이에요.',
    },
  },
  {
    id: 'rabbit',
    name: '달님 토끼',
    role: '포근한 꿈 친구',
    art: 'rabbit',
    image: '/hero-rabbit.jpg',
    tone: 'pink',
    greeting: '깡총깡총 안녕! 나는 달님 토끼야! 오늘 밤 어떤 동화를 만들어 볼까?',
    storyPreview: {
      place: '솜사탕 구름 숲',
      title: '달님 토끼의 포근한 자장가',
      summary: '폭신폭신 구름 징검다리를 깡총깡총 건너 초승달 그네를 타요. 잠들기 전에 읽으면 예쁜 꿈을 꾸게 해 준답니다.',
    },
  },
  {
    id: 'star',
    name: '반짝 별곰',
    role: '토이북 마스코트',
    art: 'star',
    image: '/hero-art.jpg',
    tone: 'yellow',
    greeting: '반가워! 나는 반짝반짝 별곰이야! 책 속에서 장난감으로 튀어나왔어!',
    storyPreview: {
      place: '마법의 동화 책상',
      title: '반짝 별곰과 살아나는 그림책',
      summary: '내가 그린 그림이 동화책 속에서 뿅! 하고 걸어 나와 함께 춤추고 노래하는 신기한 마법 공방 이야기예요.',
    },
  },
];

export function findShelfFigure(id: string | null | undefined): ShelfFigureInfo {
  return SHELF_FIGURES.find((f) => f.id === id) ?? SHELF_FIGURES[0];
}

export function defaultFigureForChild(childId: string): ShelfFigureId {
  if (childId.includes('junho') || childId === 'c-junho') return 'dino';
  if (childId.includes('minji') || childId === 'c-minji') return 'fairy';
  return 'star';
}

const figKey = (childId: string) => `toybook.figure.${childId || 'default'}`;
const readKey = (childId: string) => `toybook.read.${childId || 'default'}`;
const nightKey = (childId: string) => `toybook.night.${childId || 'default'}`;
const wishKey = (childId: string) => `toybook.wish.${childId || 'default'}`;

export function loadShelfFigureId(childId: string): ShelfFigureId {
  try {
    const saved = localStorage.getItem(figKey(childId)) as ShelfFigureId | null;
    if (saved && SHELF_FIGURES.some((f) => f.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return defaultFigureForChild(childId);
}

export function saveShelfFigureId(childId: string, figureId: ShelfFigureId) {
  try {
    localStorage.setItem(figKey(childId), figureId);
  } catch {
    /* ignore */
  }
}

export function loadReadBookIds(childId: string): string[] {
  try {
    const raw = localStorage.getItem(readKey(childId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markBookAsRead(childId: string, bookId: string): string[] {
  const current = loadReadBookIds(childId);
  if (current.includes(bookId)) return current;
  const next = [...current, bookId];
  try {
    localStorage.setItem(readKey(childId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function loadShelfNight(childId: string): boolean {
  try {
    return localStorage.getItem(nightKey(childId)) === 'on';
  } catch {
    return false;
  }
}

export function saveShelfNight(childId: string, on: boolean) {
  try {
    localStorage.setItem(nightKey(childId), on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export interface WishItem {
  figureId: ShelfFigureId;
  sizeCm: 5 | 8 | 12;
  savedAt: string;
}

export function loadWishList(childId: string): WishItem[] {
  try {
    const raw = localStorage.getItem(wishKey(childId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addWishItem(childId: string, figureId: ShelfFigureId, sizeCm: 5 | 8 | 12): WishItem[] {
  const current = loadWishList(childId).filter((w) => !(w.figureId === figureId && w.sizeCm === sizeCm));
  const next: WishItem[] = [{ figureId, sizeCm, savedAt: new Date().toISOString() }, ...current].slice(0, 6);
  try {
    localStorage.setItem(wishKey(childId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

