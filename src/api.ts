import { send } from './auth';
export interface Child {
  id: string;
  nickname: string;
  birth_year: number | null;
  avatar: string;
  /** PRD 8.5: 새싹(3~5세) / 꼬마 작가(6~8세) / 작가(9~12세) */
  age_mode: 'sprout' | 'kid' | 'author';
  likes: string | null;
}

export type BookOwnership = 'mine' | 'borrowed' | 'purchased' | 'market';
export type MarketKind = 'library' | 'bookstore' | 'both';
export type StickerType = 'star' | 'art' | 'heart' | 'again';

export interface BookSummary {
  id: string;
  child_id: string | null;
  title: string;
  format: 'picture' | 'webtoon';
  cover_key: string | null;
  cover_emoji: string;
  status: 'draft' | 'done';
  updated_at: string;
  page_count: number;
  ownership?: BookOwnership;
  due_at?: string | null;
  author_name?: string | null;
  listing_id?: string | null;
  market_kind?: MarketKind | null;
  market_price?: number | null;
  preview_only?: boolean;
}

export interface Page {
  id: string;
  page_no: number;
  text: string;
  image_key: string | null;
  layout: { emoji?: string; bg?: string };
}

export interface MarketListing {
  id: string;
  book_id: string;
  seller_parent_id: string;
  author_name: string;
  kind: MarketKind;
  price: number;
  rent_days: number;
  summary: string;
  category: string;
  status: 'published' | 'hidden';
  loan_count: number;
  sales_count: number;
  likes_count: number;
  created_at: string;
  title: string;
  format: 'picture' | 'webtoon';
  cover_key: string | null;
  cover_emoji: string;
  page_count: number;
  borrowed_until?: string | null;
  is_purchased?: boolean;
  is_mine?: boolean;
  my_sticker?: StickerType | null;
}

export interface MyMarketBook extends BookSummary {
  listing_id: string | null;
  market_kind: MarketKind | null;
  market_price: number | null;
  market_rent_days: number | null;
  market_summary: string | null;
  market_category: string | null;
  market_author_name: string | null;
  market_status: 'published' | 'hidden' | null;
  loan_count: number | null;
  sales_count: number | null;
  likes_count: number | null;
}

export interface MarketWallet {
  balance: number;
  total_earned: number;
}

export interface MarketOverview {
  listings: MarketListing[];
  myBooks: MyMarketBook[];
  wallet: MarketWallet;
}

export interface BookDetail {
  book: BookSummary;
  pages: Page[];
  listing?: {
    id: string;
    author_name: string;
    kind: MarketKind;
    price: number;
    rent_days: number;
    summary: string;
    category: string;
    status: string;
    loan_count: number;
    sales_count: number;
    likes_count: number;
  } | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `요청 실패 (${res.status})`);
  }
  return res.json();
}

export const api = {
  children: () => get<{ children: Child[] }>('/api/children').then((r) => r.children),
  books: (childId?: string) =>
    get<{ books: BookSummary[] }>(`/api/books${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`).then(
      (r) => r.books,
    ),
  book: (id: string) => get<BookDetail>(`/api/books/${encodeURIComponent(id)}`),
  market: (params?: { category?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.category && params.category !== '전체') sp.set('category', params.category);
    if (params?.q) sp.set('q', params.q);
    const qs = sp.toString();
    return get<MarketOverview>(`/api/market${qs ? `?${qs}` : ''}`);
  },
};

export interface PublishBookPayload {
  bookId: string;
  kind: MarketKind;
  price: number;
  rentDays: number;
  summary: string;
  category: string;
  authorName: string;
  status?: 'published' | 'hidden';
}

export const marketApi = {
  publish: (payload: PublishBookPayload) =>
    send<{ ok: boolean; listingId: string; bonusEarned: number; wallet: MarketWallet }>('/api/market', 'POST', payload),
  borrow: (listingId: string, childId?: string | null, action: 'borrow' | 'return' = 'borrow') =>
    send<{ ok: boolean; loanId?: string; dueAt?: string; bookId?: string; extended?: boolean; status?: string }>(
      `/api/market/${encodeURIComponent(listingId)}/borrow`,
      'POST',
      { childId, action },
    ),
  buy: (listingId: string, childId?: string | null) =>
    send<{ ok: boolean; purchaseId?: string; alreadyOwned?: boolean; bookId: string; wallet: MarketWallet }>(
      `/api/market/${encodeURIComponent(listingId)}/buy`,
      'POST',
      { childId },
    ),
  react: (listingId: string, sticker: StickerType) =>
    send<{ ok: boolean; sticker: StickerType; likesCount: number }>(
      `/api/market/${encodeURIComponent(listingId)}/react`,
      'POST',
      { sticker },
    ),
};

/** 아이 프로필 만들기·고치기에 쓰는 값 */
export interface ChildForm {
  nickname: string;
  birthYear: number;
  avatar: string;
  likes: string;
  ageMode?: Child['age_mode'];
}

/** 아이 프로필로 고를 수 있는 점토 캐릭터 (functions/_lib/children.ts AVATARS 와 같게) */
export const AVATARS = ['🐻', '🐰', '🦖', '🐣', '🤖', '🧚'];

export const childApi = {
  create: (f: ChildForm) => send<{ child: Child }>('/api/children', 'POST', f),
  update: (id: string, f: ChildForm) => send<{ child: Child }>(`/api/children/${encodeURIComponent(id)}`, 'PATCH', f),
  remove: (id: string) => send(`/api/children/${encodeURIComponent(id)}`, 'DELETE'),
};

export const fileUrl = (key: string) => `/api/files/${key}`;
