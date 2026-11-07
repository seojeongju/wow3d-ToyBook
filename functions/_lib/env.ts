export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  /** "true" 일 때만 쓰기 API 허용. 로그인 연동 전까지 운영에서는 비워 둠 (.dev.vars 에서만 켬) */
  ALLOW_DEMO_WRITES?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TTS_MODEL?: string;
  OPENAI_TTS_VOICE?: string;
  IMAGE_API_KEY?: string;
  MESHY_API_KEY?: string;
  /* 간편 로그인 (functions/_lib/auth.ts). 키가 없는 수단은 로그인 화면에서 '준비 중'으로 보임 */
  KAKAO_REST_API_KEY?: string;
  KAKAO_CLIENT_SECRET?: string;
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** "true" 면 로컬 시험용 가짜 로그인을 엶. 운영에는 절대 넣지 말 것 */
  ALLOW_DEV_LOGIN?: string;
  PORTONE_API_SECRET?: string;
  /** 보호자 본인인증 (functions/_lib/verify.ts). 세 값이 모두 있어야 가입 때 본인인증 단계가 켜짐 */
  PORTONE_STORE_ID?: string;
  PORTONE_IDV_CHANNEL_KEY?: string;
}
