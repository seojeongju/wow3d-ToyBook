-- 이야기 공방: 하루 생성 횟수 (AI 비용·남용 막기). day = 한국 날짜 YYYY-MM-DD
CREATE TABLE studio_usage (
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  day       TEXT NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('outline', 'book')),
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (parent_id, day, kind)
);
