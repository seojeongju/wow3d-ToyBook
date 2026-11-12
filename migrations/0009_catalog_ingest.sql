-- 퍼블릭 도메인 고전 동화 인제스트 큐 (도서관 큐레이션용)
-- 원문은 재배포용 스냅샷이 아니라 AI 한국어 그림책 변환 재료로만 보관

CREATE TABLE IF NOT EXISTS catalog_sources (
  id              TEXT PRIMARY KEY,
  provider        TEXT NOT NULL CHECK (provider IN ('childrenstory', 'gutendex')),
  external_id     TEXT NOT NULL,
  title_original  TEXT NOT NULL,
  authors_json    TEXT NOT NULL DEFAULT '[]',
  language        TEXT NOT NULL DEFAULT 'en',
  license         TEXT NOT NULL DEFAULT 'PD',
  source_url      TEXT,
  download_url    TEXT,
  subjects_json   TEXT NOT NULL DEFAULT '[]',
  word_count      INTEGER,
  raw_excerpt     TEXT,
  status          TEXT NOT NULL DEFAULT 'discovered'
                    CHECK (status IN ('discovered', 'imported', 'rewritten', 'published', 'rejected', 'error')),
  book_id         TEXT REFERENCES books(id) ON DELETE SET NULL,
  listing_id      TEXT,
  category        TEXT NOT NULL DEFAULT '전래·명작',
  age_band        TEXT NOT NULL DEFAULT '6-8' CHECK (age_band IN ('3-5', '6-8', '9-12')),
  title_ko        TEXT,
  summary_ko      TEXT,
  author_credit   TEXT,
  cover_emoji     TEXT NOT NULL DEFAULT '📘',
  error_note      TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_sources_status ON catalog_sources(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_sources_book ON catalog_sources(book_id);
CREATE INDEX IF NOT EXISTS idx_catalog_sources_provider ON catalog_sources(provider, category);
