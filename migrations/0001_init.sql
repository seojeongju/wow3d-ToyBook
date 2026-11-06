-- 토이북 초기 스키마 (PRD 9.4 데이터 모델)
-- 시각은 ISO8601 UTC 문자열, id 는 앱에서 만든 UUID

-- 부모(로그인 계정). 만 14세 미만 아이 정보는 부모 동의(consent_at) 후 저장
CREATE TABLE parents (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email        TEXT,
  kakao_id     TEXT UNIQUE,
  pin_hash     TEXT,
  consent_at   TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 아이 프로필 (PRD 9.1): 이메일·전화·실명 없이 닉네임·나이만. 연령 모드로 화면 구성이 바뀜 (PRD 8.5)
CREATE TABLE children (
  id         TEXT PRIMARY KEY,
  parent_id  TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  nickname   TEXT NOT NULL,
  birth_year INTEGER,
  avatar     TEXT NOT NULL DEFAULT '🐻',
  age_mode   TEXT NOT NULL DEFAULT 'kid' CHECK (age_mode IN ('sprout', 'kid', 'author')),
  likes      TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_children_parent ON children(parent_id);

-- 캐릭터 카드: 외형 설명 + 기준 이미지. 삽화 일관성과 3D 기준 이미지로 함께 사용
CREATE TABLE characters (
  id            TEXT PRIMARY KEY,
  parent_id     TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  ref_image_key TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_characters_parent ON characters(parent_id);

CREATE TABLE books (
  id         TEXT PRIMARY KEY,
  parent_id  TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id   TEXT REFERENCES children(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  format     TEXT NOT NULL DEFAULT 'picture' CHECK (format IN ('picture', 'webtoon')),
  art_style  TEXT,
  cover_key  TEXT,
  cover_emoji TEXT NOT NULL DEFAULT '📘',
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'done')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_books_parent ON books(parent_id);
CREATE INDEX idx_books_child ON books(child_id);

CREATE TABLE book_pages (
  id          TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_no     INTEGER NOT NULL,
  text        TEXT NOT NULL DEFAULT '',
  image_key   TEXT,
  layout_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE (book_id, page_no)
);

CREATE TABLE book_characters (
  book_id      TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, character_id)
);

-- 이미지 → 3D 결과. glb_key 는 뷰어용, print_file_key 는 출력 가능성 검사를 통과한 STL/3MF
CREATE TABLE models_3d (
  id                TEXT PRIMARY KEY,
  parent_id         TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  book_id           TEXT REFERENCES books(id) ON DELETE SET NULL,
  character_id      TEXT REFERENCES characters(id) ON DELETE SET NULL,
  source_image_key  TEXT NOT NULL,
  glb_key           TEXT,
  print_file_key    TEXT,
  check_result_json TEXT,
  provider          TEXT,
  provider_job_id   TEXT,
  status            TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_models_parent ON models_3d(parent_id);

-- 아이가 누르는 "갖고 싶어요" → 부모가 승인해야 주문으로 넘어감
CREATE TABLE wishes (
  id         TEXT PRIMARY KEY,
  child_id   TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  model_id   TEXT NOT NULL REFERENCES models_3d(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  decided_at TEXT
);
CREATE INDEX idx_wishes_child ON wishes(child_id);

-- 출력 주문 (PRD 7.3). 상태: 결제대기 → 결제완료 → 접수 → 검수 → 출력 → 후가공 → 배송 → 완료
CREATE TABLE orders (
  id                TEXT PRIMARY KEY,
  parent_id         TEXT NOT NULL REFERENCES parents(id),
  model_id          TEXT NOT NULL REFERENCES models_3d(id),
  wish_id           TEXT REFERENCES wishes(id) ON DELETE SET NULL,
  options_json      TEXT NOT NULL,
  amount            INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending_payment'
                    CHECK (status IN ('pending_payment', 'paid', 'received', 'inspecting',
                                      'printing', 'finishing', 'shipping', 'done', 'cancelled')),
  payment_id        TEXT,
  wow3dpro_order_no TEXT,
  shipping_json     TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_orders_parent ON orders(parent_id);

CREATE TABLE order_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_order_events_order ON order_events(order_id);
