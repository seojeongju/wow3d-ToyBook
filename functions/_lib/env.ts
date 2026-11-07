export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  /** "true" 일 때만 쓰기 API 허용. 로그인 연동 전까지 운영에서는 비워 둠 (.dev.vars 에서만 켬) */
  ALLOW_DEMO_WRITES?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TTS_MODEL?: string;
  OPENAI_TTS_VOICE?: string;
  /** 그림 AI (functions/_lib/imageai.ts): 운영자 화면에서 키를 저장하지 않았을 때 쓰는 환경 변수 키 */
  GEMINI_API_KEY?: string;
  FAL_KEY?: string;
  /** 운영자 화면에 저장하는 AI API 키를 암호화하는 비밀값 (16자 이상, 바꾸면 저장한 키를 다시 넣어야 함) */
  AI_KEYS_SECRET?: string;
  IMAGE_API_KEY?: string;
  MESHY_API_KEY?: string;
  /* 간편 로그인 (functions/_lib/auth.ts). 키가 없는 수단은 로그인 화면에서 '준비 중'으로 보임 */
  KAKAO_REST_API_KEY?: string;
  KAKAO_CLIENT_SECRET?: string;
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** 운영자 이메일 (쉼표로 여러 개, functions/_lib/admin.ts). 비밀값으로만 넣고 코드에는 적지 않음 */
  ADMIN_EMAILS?: string;
  /** "on" 이면 카카오·네이버 출생 연도로 만 14세 미만 가입을 막음. 개발 중에는 비워 둠(누구나 로그인), 정식 출시 전 반드시 "on" */
  AGE_CHECK?: string;
  /** "true" 면 로컬 시험용 가짜 로그인을 엶. 운영에는 절대 넣지 말 것 */
  ALLOW_DEV_LOGIN?: string;
  PORTONE_API_SECRET?: string;
  /** 보호자 본인인증 (functions/_lib/verify.ts). 세 값이 모두 있어야 가입 때 본인인증 단계가 켜짐 */
  PORTONE_STORE_ID?: string;
  PORTONE_IDV_CHANNEL_KEY?: string;
}
