-- 토이북 2차 전체 고도화 스키마:
-- 1) 콘텐츠 신고(market_reports)
-- 2) 별 코인 거래 원장(wallet_transactions)
-- 3) 피규어 찜(wishes) · 3D 모델 · 주문 연동 보조 컬럼

CREATE TABLE IF NOT EXISTS market_reports (
  id                 TEXT PRIMARY KEY,
  listing_id         TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  reporter_parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  reason             TEXT NOT NULL,
  detail             TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  resolved_at        TEXT,
  UNIQUE (listing_id, reporter_parent_id)
);
CREATE INDEX IF NOT EXISTS idx_market_reports_status ON market_reports(status, created_at);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT NOT NULL,
  delta       INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('welcome', 'publish_bonus', 'loan_reward', 'sale_income', 'book_purchase', 'topup', 'figure_order')),
  title       TEXT NOT NULL,
  ref_id      TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_parent ON wallet_transactions(parent_id, created_at DESC);
