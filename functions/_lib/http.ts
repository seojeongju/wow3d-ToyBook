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

/** R2 에서 가족마다 파일을 분리하는 폴더 접두어 */
export function familyPrefix(parentId: string): string {
  return `families/${parentId}/`;
}
