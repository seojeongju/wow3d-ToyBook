import { sessionParent } from './auth';
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
 * 지금 보고 있는 부모 id.
 * 가입을 마친(active) 로그인 세션이면 그 계정, 아니면 둘러보기용 데모 계정(보기 전용)
 */
export async function getParentId(request: Request, env: Env): Promise<string | null> {
  const me = await sessionParent(request, env);
  return me?.status === 'active' ? me.id : 'demo-parent';
}

/** 부모 id 를 꺼내고, 없으면 401 응답을 돌려줌 */
export async function requireParent(request: Request, env: Env): Promise<string | Response> {
  const parentId = await getParentId(request, env);
  return parentId ?? error('로그인이 필요합니다', 401);
}

/**
 * 쓰기 API(책 생성·업로드)용 부모 확인.
 * 가입을 마친 로그인 계정만 허용. 로컬(ALLOW_DEMO_WRITES=true)에서는 로그인 없이 데모 계정으로도 허용
 */
export async function requireParentForWrite(request: Request, env: Env): Promise<string | Response> {
  const me = await sessionParent(request, env);
  if (me?.status === 'active') return me.id;
  if (env.ALLOW_DEMO_WRITES === 'true') return 'demo-parent';
  return error(me ? '가입을 마저 끝내 주세요' : '로그인이 필요해요', 401);
}

/** R2 에서 가족마다 파일을 분리하는 폴더 접두어 */
export function familyPrefix(parentId: string): string {
  return `families/${parentId}/`;
}
