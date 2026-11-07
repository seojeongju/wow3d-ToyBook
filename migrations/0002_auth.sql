-- 회원가입·로그인 (간편 가입: 카카오·네이버·구글)
-- 부모 계정은 간편 로그인 직후 'pending'(약관 동의 전) → 동의를 마치면 'active'

ALTER TABLE parents ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active'));
ALTER TABLE parents ADD COLUMN terms_agreed_at TEXT;
ALTER TABLE parents ADD COLUMN privacy_agreed_at TEXT;
ALTER TABLE parents ADD COLUMN marketing_agreed_at TEXT;
ALTER TABLE parents ADD COLUMN last_login_at TEXT;

-- 간편 로그인 연결: 한 부모 계정에 여러 로그인 수단을 붙일 수 있게 분리
CREATE TABLE auth_identities (
  provider         TEXT NOT NULL CHECK (provider IN ('kakao', 'naver', 'google', 'dev')),
  provider_user_id TEXT NOT NULL,
  parent_id        TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  email            TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX idx_identities_parent ON auth_identities(parent_id);

-- 로그인 세션: 쿠키에는 무작위 토큰만, DB 에는 그 SHA-256 값만 저장 (DB 가 새어도 세션을 흉내 낼 수 없게)
CREATE TABLE sessions (
  id_hash    TEXT PRIMARY KEY,
  parent_id  TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_sessions_parent ON sessions(parent_id);
