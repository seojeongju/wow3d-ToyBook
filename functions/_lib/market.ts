import { sessionParent } from './auth';
import type { Env } from './env';
import { error, newId } from './http';
import { isUnlocked } from './parent';

export type MarketKind = 'library' | 'bookstore' | 'both';
export type StickerType = 'star' | 'art' | 'heart' | 'again';
export type WalletTxKind =
  | 'welcome'
  | 'publish_bonus'
  | 'loan_reward'
  | 'sale_income'
  | 'book_purchase'
  | 'topup'
  | 'figure_order';

export const STICKER_META: Record<StickerType, { emoji: string; label: string }> = {
  star: { emoji: '⭐', label: '재미있어요' },
  art: { emoji: '🎨', label: '그림이 멋져요' },
  heart: { emoji: '💖', label: '감동이에요' },
  again: { emoji: '📚', label: '또 읽고 싶어요' },
};

export const MARKET_CATEGORIES = ['전체', '모험', '생활습관', '우주·과학', '잠자리', '감정', '전래·명작'] as const;

let schemaReady = false;

interface SeedBook {
  bookId: string;
  listingId: string;
  title: string;
  authorName: string;
  coverEmoji: string;
  kind: MarketKind;
  price: number;
  rentDays: number;
  category: string;
  summary: string;
  loanCount: number;
  salesCount: number;
  likesCount: number;
  pages: { text: string; emoji: string; bg: string }[];
}

const SEED_BOOKS: SeedBook[] = [
  {
    bookId: 'mkt-book-starbear',
    listingId: 'mkt-list-starbear',
    title: '반짝 별곰과 하늘을 나는 크레파스',
    authorName: '꼬마 작가 하은',
    coverEmoji: '🐻',
    kind: 'library',
    price: 0,
    rentDays: 7,
    category: '모험',
    summary: '무지개 크레파스로 그린 구름 기차를 타고 밤하늘 별자리 소풍을 떠나는 따뜻한 그림책이에요.',
    loanCount: 42,
    salesCount: 0,
    likesCount: 28,
    pages: [
      {
        text: '다락방 책상 위에서 반짝 별곰이 노란 크레파스를 들었어요. "오늘은 밤하늘로 가는 기차를 그려 볼까?"',
        emoji: '🐻',
        bg: '#f3ecff',
      },
      {
        text: '종이 위에 칙칙폭폭 구름 기차를 그리자, 기차가 반짝거리며 책상 밖으로 두둥실 떠올랐어요!',
        emoji: '🚂',
        bg: '#e7f5ff',
      },
      {
        text: '구름 기차는 은하수 철길을 따라 달렸어요. 아기 별들이 손을 흔들며 별사탕을 건네주었지요.',
        emoji: '🌟',
        bg: '#fff4d6',
      },
      {
        text: '소풍을 마치고 돌아온 별곰은 스케치북을 꼭 안고 잠들었어요. 내일은 또 어떤 그림이 살아날까요?',
        emoji: '🌙',
        bg: '#ffe8f0',
      },
    ],
  },
  {
    bookId: 'mkt-book-chika',
    listingId: 'mkt-list-chika',
    title: '치카 요정과 민트 거품 성의 대모험',
    authorName: '꼬마 작가 민지',
    coverEmoji: '🧚',
    kind: 'both',
    price: 500,
    rentDays: 7,
    category: '생활습관',
    summary: '양치하기 싫어하던 아기 하마가 치카 요정과 함께 민트 거품 방패로 세균 악당을 물리치는 이야기예요.',
    loanCount: 65,
    salesCount: 19,
    likesCount: 47,
    pages: [
      {
        text: '"아앙, 양치하기 싫어!" 초콜릿을 먹은 아기 하마가 입을 꾹 다물었어요. 그때 반짝이며 치카 요정이 나타났어요.',
        emoji: '🧚',
        bg: '#ffe9df',
      },
      {
        text: '"요술 칫솔아, 민트 거품 방패를 만들어 줘!" 치카치카 솔질을 하자 보글보글 향기로운 거품 성이 생겼어요.',
        emoji: '🪥',
        bg: '#dff7ee',
      },
      {
        text: '달콤한 냄새를 맡고 찾아온 충치 세균들이 미끄덩! 민트 거품 미끄럼틀을 타고 저 멀리 날아가 버렸답니다.',
        emoji: '✨',
        bg: '#e8f4ff',
      },
      {
        text: '"우와, 이가 보석처럼 반짝거려!" 이제 아기 하마는 매일 밤 스스로 칫솔을 들고 노래를 부른답니다.',
        emoji: '🦷',
        bg: '#fff6da',
      },
    ],
  },
  {
    bookId: 'mkt-book-dino',
    listingId: 'mkt-list-dino',
    title: '꼬마 공룡의 잃어버린 무지개 알',
    authorName: '꼬마 작가 준호',
    coverEmoji: '🦖',
    kind: 'library',
    price: 0,
    rentDays: 7,
    category: '모험',
    summary: '숲속 바람에 굴러간 알록달록 무지개 공룡 알을 찾아 친구들과 힘을 합치는 용기 가득한 모험 동화예요.',
    loanCount: 38,
    salesCount: 0,
    likesCount: 31,
    pages: [
      {
        text: '화창한 아침, 꼬마 공룡이 아끼던 무지개 알이 데구루루 언덕 아래로 굴러가 버렸어요.',
        emoji: '🦖',
        bg: '#e3f9ec',
      },
      {
        text: '"걱정 마! 내가 높은 나무 위에서 찾아볼게!" 아기 익룡이 하늘 높이 날아올라 숲속을 살펴보았어요.',
        emoji: '🦕',
        bg: '#e8f4ff',
      },
      {
        text: '폭신한 민들레 꽃밭 사이에서 반짝이는 무지개 알을 찾았어요! 알 속에서는 귀여운 아기 공룡이 똑똑 노크를 했지요.',
        emoji: '🥚',
        bg: '#fff3d9',
      },
      {
        text: '"안녕, 새 친구야!" 숲속 공룡 친구들은 무지개 알을 둘러싸고 신나는 환영 춤을 추었답니다.',
        emoji: '🌈',
        bg: '#f4ebff',
      },
    ],
  },
  {
    bookId: 'mkt-book-robot',
    listingId: 'mkt-list-robot',
    title: '장난감 로봇 삐빅이의 토성 고리 수리 작전',
    authorName: '별빛 공방 서준',
    coverEmoji: '🤖',
    kind: 'bookstore',
    price: 800,
    rentDays: 7,
    category: '우주·과학',
    summary: '삐빅! 별 안테나를 반짝이며 우주선을 타고 날아가 부서진 토성의 얼음 고리를 멋지게 고쳐 주는 과학 동화예요.',
    loanCount: 15,
    salesCount: 34,
    likesCount: 52,
    pages: [
      {
        text: '"삐빅! 우주 본부에서 구조 신호가 왔어!" 장난감 로봇 삐빅이의 머리 위 별 안테나가 반짝 빛났어요.',
        emoji: '🤖',
        bg: '#ece6ff',
      },
      {
        text: '은빛 로켓을 타고 토성에 도착해 보니, 반짝이던 얼음 고리 한 조각이 유성에 부딪혀 떨어져 있었어요.',
        emoji: '🚀',
        bg: '#e3f2ff',
      },
      {
        text: '삐빅이는 별빛 자석 팔을 쭉 뻗어 흩어진 얼음 별 조각들을 하나하나 제자리에 맞추었어요.',
        emoji: '🪐',
        bg: '#fff4d9',
      },
      {
        text: '다시 둥글게 빛나는 고리를 보며 토성 아저씨가 빙그레 웃었어요. "고마워, 우주 최고 수리공 삐빅아!"',
        emoji: '🌟',
        bg: '#dff8ef',
      },
    ],
  },
  {
    bookId: 'mkt-book-rabbit',
    listingId: 'mkt-list-rabbit',
    title: '달님 토끼의 솜사탕 베개 가게',
    authorName: '구름 작가 소율',
    coverEmoji: '🐰',
    kind: 'bookstore',
    price: 700,
    rentDays: 7,
    category: '잠자리',
    summary: '잠이 오지 않는 숲속 동물 친구들에게 달콤하고 포근한 맞춤형 구름 베개를 만들어 주는 잠자리 그림책이에요.',
    loanCount: 22,
    salesCount: 27,
    likesCount: 39,
    pages: [
      {
        text: '초승달이 뜨면 달님 토끼는 분홍 구름을 모아 폭신폭신 베개 가게 문을 열어요.',
        emoji: '🐰',
        bg: '#ffe9f2',
      },
      {
        text: '"잠이 안 와서 뒤척였어요." 아기 다람쥐에게는 도토리 향기가 솔솔 나는 낙엽 구름 베개를 선물했어요.',
        emoji: '🐿️',
        bg: '#fff2de',
      },
      {
        text: '아기 부엉이에게는 은하수 자장가가 들리는 별빛 베개를 건네주었더니 금세 꾸벅꾸벅 눈이 감겼지요.',
        emoji: '🦉',
        bg: '#ede8ff',
      },
      {
        text: '숲속 친구들이 모두 예쁜 꿈나라로 떠나자, 달님 토끼도 가장 큰 솜사탕 구름 위에서 새근새근 잠들었답니다.',
        emoji: '🌙',
        bg: '#e4f0ff',
      },
    ],
  },
  {
    bookId: 'mkt-book-heart',
    listingId: 'mkt-list-heart',
    title: '화난 구름이 몽실이를 안아 주는 법',
    authorName: '다정 작가 도윤',
    coverEmoji: '🐣',
    kind: 'both',
    price: 600,
    rentDays: 7,
    category: '감정',
    summary: '마음이 속상해 먹구름처럼 변한 몽실이의 이야기를 들어 주고 따뜻한 무지개를 피우는 감정 코칭 동화예요.',
    loanCount: 51,
    salesCount: 23,
    likesCount: 44,
    pages: [
      {
        text: '오늘 아기 병아리 삐약이의 친구 구름 몽실이는 얼굴이 회색빛으로 잔뜩 찌푸려져 있었어요.',
        emoji: '🐣',
        bg: '#fff7db',
      },
      {
        text: '"우르릉! 내 블록 성이 무너져서 속상해!" 몽실이가 눈물 빗방울을 뚝뚝 흘렸어요.',
        emoji: '🌧️',
        bg: '#e6f1ff',
      },
      {
        text: '삐약이는 우산을 접고 몽실이를 폭 안아 주었어요. "많이 속상했구나. 우리 같이 더 멋진 성을 다시 쌓자!"',
        emoji: '💛',
        bg: '#ffeae4',
      },
      {
        text: '따뜻한 말 한마디에 몽실이의 얼굴이 하얗게 개더니, 머리 위로 일곱 빛깔 무지개가 활짝 피어났답니다.',
        emoji: '🌈',
        bg: '#e5f9ef',
      },
    ],
  },
];

export async function ensureMarketSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  try {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS market_listings (
        id               TEXT PRIMARY KEY,
        book_id          TEXT NOT NULL UNIQUE REFERENCES books(id) ON DELETE CASCADE,
        seller_parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        author_name      TEXT NOT NULL DEFAULT '꼬마 작가',
        kind             TEXT NOT NULL DEFAULT 'library' CHECK (kind IN ('library', 'bookstore', 'both')),
        price            INTEGER NOT NULL DEFAULT 0,
        rent_days        INTEGER NOT NULL DEFAULT 7,
        summary          TEXT NOT NULL DEFAULT '',
        category         TEXT NOT NULL DEFAULT '모험',
        status           TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
        loan_count       INTEGER NOT NULL DEFAULT 0,
        sales_count      INTEGER NOT NULL DEFAULT 0,
        likes_count      INTEGER NOT NULL DEFAULT 0,
        created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status, kind)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller_parent_id)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS book_loans (
        id                 TEXT PRIMARY KEY,
        listing_id         TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
        book_id            TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        borrower_parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        child_id           TEXT REFERENCES children(id) ON DELETE SET NULL,
        borrowed_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        due_at             TEXT NOT NULL,
        returned_at        TEXT
      )`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_book_loans_borrower ON book_loans(borrower_parent_id, returned_at, due_at)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_book_loans_book ON book_loans(book_id, borrower_parent_id)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS book_purchases (
        id              TEXT PRIMARY KEY,
        listing_id      TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
        book_id         TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        buyer_parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        child_id        TEXT REFERENCES children(id) ON DELETE SET NULL,
        amount          INTEGER NOT NULL DEFAULT 0,
        payment_method  TEXT NOT NULL DEFAULT 'points',
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (buyer_parent_id, book_id)
      )`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_book_purchases_buyer ON book_purchases(buyer_parent_id)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS market_reactions (
        listing_id TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
        parent_id  TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        sticker    TEXT NOT NULL DEFAULT 'star' CHECK (sticker IN ('star', 'art', 'heart', 'again')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        PRIMARY KEY (listing_id, parent_id)
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS market_wallets (
        parent_id    TEXT PRIMARY KEY,
        balance      INTEGER NOT NULL DEFAULT 3000,
        total_earned INTEGER NOT NULL DEFAULT 0,
        updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS market_reports (
        id                 TEXT PRIMARY KEY,
        listing_id         TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
        reporter_parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        reason             TEXT NOT NULL,
        detail             TEXT NOT NULL DEFAULT '',
        status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
        created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        resolved_at        TEXT,
        UNIQUE (listing_id, reporter_parent_id)
      )`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_market_reports_status ON market_reports(status, created_at)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS wallet_transactions (
        id            TEXT PRIMARY KEY,
        parent_id     TEXT NOT NULL,
        delta         INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        kind          TEXT NOT NULL CHECK (kind IN ('welcome', 'publish_bonus', 'loan_reward', 'sale_income', 'book_purchase', 'topup', 'figure_order')),
        title         TEXT NOT NULL,
        ref_id        TEXT,
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_wallet_tx_parent ON wallet_transactions(parent_id, created_at DESC)`),
      env.DB.prepare(`INSERT OR IGNORE INTO parents (id, display_name, email, status) VALUES ('demo-parent', '데모 부모님', null, 'active')`),
      env.DB.prepare(`INSERT OR IGNORE INTO children (id, parent_id, nickname, avatar, age_mode) VALUES ('c-demo', 'demo-parent', '토비 친구', '🐻', 'kid')`),
    ]);

    const existing = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM market_listings').first<{ cnt: number }>();
    if ((existing?.cnt ?? 0) === 0) {
      await seedInitialMarketCatalog(env);
    }
    schemaReady = true;
  } catch (e) {
    console.error('market schema init error:', e);
  }
}

async function seedInitialMarketCatalog(env: Env): Promise<void> {
  // 공용 큐레이션 작가 계정 보장
  await env.DB.prepare(
    `INSERT OR IGNORE INTO parents (id, display_name, email, status) VALUES ('market-curator', '토이북 동화도서관', null, 'active')`,
  ).run();

  const stmts: D1PreparedStatement[] = [];
  for (const b of SEED_BOOKS) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO books (id, parent_id, child_id, title, format, cover_emoji, status) VALUES (?, 'market-curator', NULL, ?, 'picture', ?, 'done')`,
      ).bind(b.bookId, b.title, b.coverEmoji),
    );
    b.pages.forEach((p, idx) => {
      stmts.push(
        env.DB.prepare(
          `INSERT OR IGNORE INTO book_pages (id, book_id, page_no, text, layout_json) VALUES (?, ?, ?, ?, ?)`,
        ).bind(`${b.bookId}-p${idx + 1}`, b.bookId, idx + 1, p.text, JSON.stringify({ emoji: p.emoji, bg: p.bg })),
      );
    });
    stmts.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO market_listings
         (id, book_id, seller_parent_id, author_name, kind, price, rent_days, summary, category, status, loan_count, sales_count, likes_count)
         VALUES (?, ?, 'market-curator', ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
      ).bind(
        b.listingId,
        b.bookId,
        b.authorName,
        b.kind,
        b.price,
        b.rentDays,
        b.summary,
        b.category,
        b.loanCount,
        b.salesCount,
        b.likesCount,
      ),
    );
  }
  await env.DB.batch(stmts);
}

export async function getOrInitWallet(env: Env, parentId: string): Promise<{ balance: number; total_earned: number }> {
  await ensureMarketSchema(env);
  const existing = await env.DB.prepare(`SELECT balance, total_earned FROM market_wallets WHERE parent_id = ?`)
    .bind(parentId)
    .first<{ balance: number; total_earned: number }>();

  if (!existing) {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO market_wallets (parent_id, balance, total_earned, updated_at) VALUES (?, 3000, 0, ?)`).bind(
        parentId,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO wallet_transactions (id, parent_id, delta, balance_after, kind, title, created_at)
         VALUES (?, ?, 3000, 3000, 'welcome', '토이북 시작 축하 별 코인 지급', ?)`,
      ).bind(newId(), parentId, now),
    ]);
    return { balance: 3000, total_earned: 0 };
  }

  // 기존 지갑에 첫 거래 내역이 없다면 환영 내역 1건 보충
  const txCount = await env.DB.prepare(`SELECT COUNT(*) AS cnt FROM wallet_transactions WHERE parent_id = ?`)
    .bind(parentId)
    .first<{ cnt: number }>();
  if ((txCount?.cnt ?? 0) === 0) {
    await env.DB.prepare(
      `INSERT INTO wallet_transactions (id, parent_id, delta, balance_after, kind, title)
       VALUES (?, ?, ?, ?, 'welcome', '토이북 기본 별 코인 지갑')`,
    )
      .bind(newId(), parentId, existing.balance, existing.balance)
      .run();
  }

  return existing;
}

export async function recordWalletTx(
  env: Env,
  opts: {
    parentId: string;
    delta: number;
    earnedDelta?: number;
    kind: WalletTxKind;
    title: string;
    refId?: string | null;
  },
): Promise<{ balance: number; total_earned: number }> {
  const current = await getOrInitWallet(env, opts.parentId);
  const nextBalance = Math.max(0, current.balance + opts.delta);
  const nextEarned = current.total_earned + (opts.earnedDelta ?? (opts.delta > 0 && opts.kind !== 'topup' && opts.kind !== 'welcome' ? opts.delta : 0));
  const now = new Date().toISOString();

  await env.DB.batch([
    env.DB.prepare(`UPDATE market_wallets SET balance = ?, total_earned = ?, updated_at = ? WHERE parent_id = ?`).bind(
      nextBalance,
      nextEarned,
      now,
      opts.parentId,
    ),
    env.DB.prepare(
      `INSERT INTO wallet_transactions (id, parent_id, delta, balance_after, kind, title, ref_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(newId(), opts.parentId, opts.delta, nextBalance, opts.kind, opts.title, opts.refId ?? null, now),
  ]);

  return { balance: nextBalance, total_earned: nextEarned };
}

/**
 * 출품·유료 구매·피규어 주문 시 보호자 PIN 잠금 확인.
 * 로그인된 active 계정이 부모 PIN 을 설정해 두었고 현재 잠겨 있으면 423 반환 → 프론트엔드가 PIN 모달 표시
 */
export async function checkParentPinForAction(request: Request, env: Env): Promise<Response | null> {
  const me = await sessionParent(request, env);
  if (me && me.status === 'active' && me.has_pin && !isUnlocked(me)) {
    return error('보호자 PIN 확인이 필요해요', 423);
  }
  return null;
}

