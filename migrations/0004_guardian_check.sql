-- 보호자 나이 확인 + 본인인증 자리 (PRD 9.2 "법정대리인 동의(휴대폰 본인인증)")
-- 개인정보 최소 수집: 출생 연도·이름·전화번호·CI 는 저장하지 않고, "언제 어떤 방법으로 확인했는지"만 남김

-- 만 14세 이상 확인 방법: 'provider' = 카카오·네이버가 준 출생 연도·연령대로 확인, 'self' = 가입 화면에서 본인이 확인
ALTER TABLE parents ADD COLUMN age_check TEXT;
-- 보호자 본인인증을 마친 시각과 방법('portone' 등)
ALTER TABLE parents ADD COLUMN guardian_verified_at TEXT;
ALTER TABLE parents ADD COLUMN guardian_verify_method TEXT;
-- 본인인증 건 번호 (같은 인증 결과를 다른 계정에 다시 쓰지 못하게)
ALTER TABLE parents ADD COLUMN guardian_verify_ref TEXT;
CREATE UNIQUE INDEX idx_parents_verify_ref ON parents(guardian_verify_ref) WHERE guardian_verify_ref IS NOT NULL;
