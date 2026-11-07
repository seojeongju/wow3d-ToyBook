-- 운영자 AI 설정: 그림(삽화) AI 공급사를 화면에서 추가·순서·끄기·시험 (functions/_lib/imageai.ts)
-- API 키는 AI_KEYS_SECRET(Cloudflare 비밀값)으로 암호화(AES-GCM)해 저장하고, 화면에는 끝 4자리만 보여 줌

CREATE TABLE ai_providers (
  id             TEXT PRIMARY KEY,
  purpose        TEXT NOT NULL DEFAULT 'image' CHECK (purpose IN ('image')),
  kind           TEXT NOT NULL CHECK (kind IN ('gemini', 'openai', 'fal')),
  label          TEXT NOT NULL,
  model          TEXT NOT NULL,
  key_cipher     TEXT,            -- 암호화한 키 (없으면 Cloudflare 환경 변수 키 사용)
  key_hint       TEXT,            -- 화면에 보일 끝 4자리
  enabled        INTEGER NOT NULL DEFAULT 1,
  priority       INTEGER NOT NULL DEFAULT 100,  -- 작을수록 먼저 (실패하면 다음 순서로)
  cost_per_image REAL,            -- 장당 비용(USD, 운영자가 적음)
  last_test_at   TEXT,
  last_test_ok   INTEGER,
  last_test_ms   INTEGER,
  last_test_note TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_ai_providers_purpose ON ai_providers(purpose, enabled, priority);

-- 그림 AI 사용 기록 (공급사별 성공률·속도·비용)
CREATE TABLE ai_usage (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT,
  purpose     TEXT NOT NULL,
  ok          INTEGER NOT NULL,
  ms          INTEGER,
  cost        REAL,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_ai_usage_provider ON ai_usage(provider_id, created_at);

-- 운영자 작업 기록 (누가 언제 무엇을 바꿨는지, 키 값은 남기지 않음)
CREATE TABLE admin_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id  TEXT,
  action     TEXT NOT NULL,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
