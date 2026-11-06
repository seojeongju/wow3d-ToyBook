export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ANTHROPIC_API_KEY?: string;
  IMAGE_API_KEY?: string;
  MESHY_API_KEY?: string;
  KAKAO_REST_API_KEY?: string;
  KAKAO_REDIRECT_URI?: string;
  SESSION_SECRET?: string;
  PORTONE_API_SECRET?: string;
}
