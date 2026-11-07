-- 토이북 광장: 모두의 도서관(무료 공유·대출) & 동화 서점(판매·구매) 스키마

-- 1. 출품 카탈로그 (내 책을 도서관 또는 서점에 공개)
CREATE TABLE IF NOT EXISTS market_listings (
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
);
CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status, kind);
CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller_parent_id);

-- 2. 도서관 대출 기록 (기본 7일 대여, 만료 전이거나 반납 전이면 아이 책장에 표시)
CREATE TABLE IF NOT EXISTS book_loans (
  id                 TEXT PRIMARY KEY,
  listing_id         TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  book_id            TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  borrower_parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id           TEXT REFERENCES children(id) ON DELETE SET NULL,
  borrowed_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  due_at             TEXT NOT NULL,
  returned_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_book_loans_borrower ON book_loans(borrower_parent_id, returned_at, due_at);
CREATE INDEX IF NOT EXISTS idx_book_loans_book ON book_loans(book_id, borrower_parent_id);

-- 3. 서점 영구 구매 기록 (구매한 책은 아이 책장에 영구 보관)
CREATE TABLE IF NOT EXISTS book_purchases (
  id              TEXT PRIMARY KEY,
  listing_id      TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  book_id         TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  buyer_parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id        TEXT REFERENCES children(id) ON DELETE SET NULL,
  amount          INTEGER NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL DEFAULT 'points',
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (buyer_parent_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_book_purchases_buyer ON book_purchases(buyer_parent_id);

-- 4. 안전한 칭찬 스티커 반응 (자유 댓글 대신 어린이 안심 스티커 4종)
CREATE TABLE IF NOT EXISTS market_reactions (
  listing_id TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  parent_id  TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  sticker    TEXT NOT NULL DEFAULT 'star' CHECK (sticker IN ('star', 'art', 'heart', 'again')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (listing_id, parent_id)
);

-- 5. 토이북 별 코인 지갑 (기본 가입 축하 3,000 코인 지급, 판매·공유 보상 적립)
CREATE TABLE IF NOT EXISTS market_wallets (
  parent_id    TEXT PRIMARY KEY,
  balance      INTEGER NOT NULL DEFAULT 3000,
  total_earned INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

