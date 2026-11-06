export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  /** "true" 일 때만 쓰기 API 허용. 로그인 연동 전까지 운영에서는 비워 둠 (.dev.vars 에서만 켬) */
  ALLOW_DEMO_WRITES?: string;
  ANTHROPIC_API_KEY?: string;
  IMAGE_API_KEY?: string;
  MESHY_API_KEY?: string;
  KAKAO_REST_API_KEY?: string;
  KAKAO_REDIRECT_URI?: string;
  SESSION_SECRET?: string;
  PORTONE_API_SECRET?: string;
}
