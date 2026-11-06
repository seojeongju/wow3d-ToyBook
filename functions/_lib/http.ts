import type { Env } from './env';

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function newId(): string {
  return crypto.randomUUID();
}

/**
 * 로그인한 부모 id. 지금은 데모 계정 고정.
 * TODO(MVP 1): 카카오 로그인 세션 쿠키 검증으로 교체하고, 세션이 없으면 null 반환 → 401
 */
export async function getParentId(_request: Request, _env: Env): Promise<string | null> {
  return 'demo-parent';
}

/** 부모 id 를 꺼내고, 없으면 401 응답을 돌려줌 */
export async function requireParent(request: Request, env: Env): Promise<string | Response> {
  const parentId = await getParentId(request, env);
  return parentId ?? error('로그인이 필요합니다', 401);
}

/**
 * 쓰기 API(책 생성·업로드)용 부모 확인.
 * 로그인이 없는 지금은 누구나 데모 계정으로 쓸 수 있으므로, ALLOW_DEMO_WRITES 가 켜진 곳(로컬)에서만 허용
 */
export async function requireParentForWrite(request: Request, env: Env): Promise<string | Response> {
  if (env.ALLOW_DEMO_WRITES !== 'true') return error('지금은 보기 전용 데모입니다', 403);
  return requireParent(request, env);
}

/** R2 에서 가족마다 파일을 분리하는 폴더 접두어 */
export function familyPrefix(parentId: string): string {
  return `families/${parentId}/`;
}
