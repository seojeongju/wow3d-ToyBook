import { ApiError, send } from './auth';
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
  /** 퍼블릭 도메인 큐레이션(고전 동화) 여부 */
  is_classic?: boolean;
  catalog_license?: string | null;
  catalog_provider?: string | null;
  catalog_title_original?: string | null;
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
  const res = await fetch(path, { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? `요청 실패 (${res.status})`, res.status);
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

export type ReportReason = 'unsafe' | 'pii' | 'copyright' | 'other';

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
  report: (listingId: string, reason: ReportReason, detail: string) =>
    send<{ ok: boolean; autoHidden: boolean; openCount: number }>(
      `/api/market/${encodeURIComponent(listingId)}/report`,
      'POST',
      { reason, detail },
    ),
};

/* ───────── 별 코인 지갑 & 충전소 ───────── */
export interface WalletTx {
  id: string;
  delta: number;
  balance_after: number;
  kind: string;
  title: string;
  ref_id: string | null;
  created_at: string;
}

export interface CoinPackage {
  id: string;
  coins: number;
  bonus: number;
  priceKrw: number;
  label: string;
  badge?: string;
}

export interface WalletOverview {
  wallet: MarketWallet;
  transactions: WalletTx[];
  packages: CoinPackage[];
  portoneStoreId: string | null;
}

export const walletApi = {
  get: () => get<WalletOverview>('/api/wallet'),
  topup: (packageId: string, paymentId?: string) =>
    send<{ ok: boolean; added: number; wallet: MarketWallet }>('/api/wallet', 'POST', { packageId, paymentId }),
};

/* ───────── 3D 모델 & 아이 '갖고 싶어요' 요청 ───────── */
export interface Model3DMeta {
  figureId: string;
  figureName: string;
  role: string;
  sizeCm: number;
  printable: boolean;
  minWallMm: number;
  overhangOk: boolean;
  supportNote: string;
}

export interface Model3DItem {
  id: string;
  book_id: string | null;
  character_id: string | null;
  source_image_key: string;
  glb_key: string | null;
  print_file_key: string | null;
  provider: string | null;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  created_at: string;
  meta: Model3DMeta;
}

export interface WishRecord {
  id: string;
  child_id: string;
  model_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  decided_at: string | null;
  child_nickname: string;
  child_avatar: string;
  source_image_key: string;
  meta: Model3DMeta;
}

export const wishApi = {
  list: () => get<{ models: Model3DItem[]; wishes: WishRecord[] }>('/api/wishes'),
  create: (payload: {
    childId?: string | null;
    figureId: string;
    figureName: string;
    figureImage: string;
    role?: string;
    sizeCm: 5 | 8 | 12;
    createWish?: boolean;
  }) => send<{ ok: boolean; modelId: string; wishId: string | null }>('/api/wishes', 'POST', payload),
  decide: (wishId: string, status: 'approved' | 'rejected') =>
    send<{ ok: boolean }>('/api/wishes', 'PATCH', { wishId, status }),
};

/* ───────── 실물 3D 피규어 주문·배송 ───────── */
export type FigureMaterial = 'fdm' | 'resin' | 'fullcolor';

export interface FigureOrderItem {
  id: string;
  model_id: string;
  wish_id: string | null;
  amount: number;
  status: string;
  wow3dpro_order_no: string | null;
  created_at: string;
  updated_at: string;
  source_image_key: string;
  options: {
    sizeCm: 5 | 8 | 12;
    material: FigureMaterial;
    materialLabel: string;
    payMethod: 'coins' | 'card';
    coinUsed: number;
  };
  shipping: {
    recipient: string;
    phone: string;
    address: string;
    memo?: string;
  };
  modelMeta: {
    figureName: string;
    role?: string;
  };
  events: { status: string; note: string | null; created_at: string }[];
}

export const orderApi = {
  list: () => get<{ wallet: MarketWallet; orders: FigureOrderItem[] }>('/api/orders'),
  create: (payload: {
    modelId: string;
    wishId?: string | null;
    sizeCm: 5 | 8 | 12;
    material: FigureMaterial;
    payMethod: 'coins' | 'card';
    recipient: string;
    phone: string;
    address: string;
    memo?: string;
  }) =>
    send<{ ok: boolean; orderId: string; orderNo: string; amountKrw: number; coinUsed: number; wallet: MarketWallet }>(
      '/api/orders',
      'POST',
      payload,
    ),
};

/* ───────── 운영자 대시보드 실시간 관리 ───────── */
export interface AdminReportRow {
  id: string;
  listing_id: string;
  reason: string;
  detail: string;
  status: 'open' | 'actioned' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  book_id: string;
  author_name: string;
  listing_status: string;
  book_title: string;
  cover_emoji: string;
}

export interface AdminOrderRow {
  id: string;
  amount: number;
  status: string;
  wow3dpro_order_no: string | null;
  created_at: string;
  updated_at: string;
  parent_name: string;
  source_image_key: string;
  options: { sizeCm: number; material: string; materialLabel: string };
  shipping: { recipient: string; phone: string; address: string };
  modelMeta: { figureName: string; supportNote?: string };
}

export interface AdminOverview {
  stats: {
    total_parents: number;
    total_books: number;
    published_listings: number;
    open_reports: number;
    active_orders: number;
  };
  reports: AdminReportRow[];
  orders: AdminOrderRow[];
}

/* ───────── 운영자 · 고전 동화 인제스트 ───────── */
export type CatalogProvider = 'childrenstory' | 'gutendex';
export type CatalogStatus = 'discovered' | 'imported' | 'rewritten' | 'published' | 'rejected' | 'error';

export interface CatalogSearchHit {
  provider: CatalogProvider;
  externalId: string;
  title: string;
  authors: string[];
  sourceUrl: string;
  downloadUrl: string | null;
  subjects: string[];
  wordCount: number | null;
  language: string;
  license: string;
  categoryHint: string;
}

export interface CatalogSourceView {
  id: string;
  provider: CatalogProvider;
  externalId: string;
  titleOriginal: string;
  titleKo: string | null;
  summaryKo: string | null;
  authors: string[];
  subjects: string[];
  language: string;
  license: string;
  sourceUrl: string | null;
  wordCount: number | null;
  status: CatalogStatus;
  bookId: string | null;
  listingId: string | null;
  category: string;
  ageBand: '3-5' | '6-8' | '9-12';
  authorCredit: string | null;
  coverEmoji: string;
  errorNote: string | null;
  hasExcerpt: boolean;
  excerptPreview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogOverview {
  storyMode: 'claude' | 'dev' | 'off';
  counts: Record<string, number>;
  sources: CatalogSourceView[];
  pilotCount: number;
  pendingPublish: number;
}

export interface CatalogBatchResult {
  published: CatalogSourceView[];
  failed: { id: string; title: string; error: string }[];
  remaining: number;
}

export interface CatalogPilotPublishResult extends CatalogBatchResult {
  imported: CatalogSourceView[];
  skipped: string[];
  warnings: string[];
}

export const adminApi = {
  overview: () => get<AdminOverview>('/api/admin/overview'),
  resolveReport: (reportId: string, decision: 'blind' | 'dismiss') =>
    send<{ ok: boolean; listingStatus: string }>('/api/admin/overview', 'POST', {
      action: 'resolve_report',
      reportId,
      decision,
    }),
  advanceOrder: (orderId: string, nextStatus: string, note?: string) =>
    send<{ ok: boolean; nextStatus: string }>('/api/admin/overview', 'POST', {
      action: 'advance_order',
      orderId,
      nextStatus,
      note,
    }),
  catalog: () => get<CatalogOverview>('/api/admin/catalog'),
  catalogSearch: (payload: { provider?: CatalogProvider | 'all'; q?: string; category?: string; limit?: number }) =>
    send<{ hits: CatalogSearchHit[]; warnings: string[] }>('/api/admin/catalog', 'POST', { action: 'search', ...payload }),
  catalogEnqueue: (hit: CatalogSearchHit, extras?: { category?: string; ageBand?: '3-5' | '6-8' | '9-12' }) =>
    send<{ source: CatalogSourceView }>('/api/admin/catalog', 'POST', { action: 'enqueue', hit, ...extras }),
  catalogPilot: () =>
    send<{ imported: CatalogSourceView[]; skipped: string[]; warnings: string[] }>('/api/admin/catalog', 'POST', {
      action: 'pilot',
    }),
  catalogPilotPublish: () =>
    send<CatalogPilotPublishResult>('/api/admin/catalog', 'POST', { action: 'pilot_publish' }),
  catalogBatchPublish: (batchLimit?: number) =>
    send<CatalogBatchResult>('/api/admin/catalog', 'POST', { action: 'batch_publish', batchLimit }),
  catalogRewrite: (sourceId: string) =>
    send<{ source: CatalogSourceView; preview: { title: string; summary: string; pages: { text: string }[] } }>(
      '/api/admin/catalog',
      'POST',
      { action: 'rewrite', sourceId },
    ),
  catalogPublish: (sourceId: string) =>
    send<{ source: CatalogSourceView }>('/api/admin/catalog', 'POST', { action: 'publish', sourceId }),
  catalogRewritePublish: (sourceId: string) =>
    send<{ source: CatalogSourceView }>('/api/admin/catalog', 'POST', { action: 'rewrite_publish', sourceId }),
  catalogReject: (sourceId: string, note?: string) =>
    send<{ source: CatalogSourceView }>('/api/admin/catalog', 'POST', { action: 'reject', sourceId, note }),
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
