-- 회원가입 2단계: 부모 PIN 잠금 (PRD 9.4)
-- pin_hash(0001 에 있음): "pbkdf2$반복수$소금$해시" 형식. 4자리 숫자라 틀린 횟수 제한으로 함께 지킴
ALTER TABLE parents ADD COLUMN pin_failed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE parents ADD COLUMN pin_locked_until TEXT;

-- 부모 모드 열림 시각: 이 로그인 세션에서 PIN 을 맞히면 30분 동안 아이 프로필 고치기·탈퇴 같은 부모 기능을 쓸 수 있음
ALTER TABLE sessions ADD COLUMN unlocked_until TEXT;
