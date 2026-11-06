import type { Env } from '../../_lib/env';
import { error, familyPrefix, requireParent } from '../../_lib/http';

export const onRequestGet: PagesFunction<Env, 'path'> = async ({ request, env, params }) => {
  const parentId = await requireParent(request, env);
  if (parentId instanceof Response) return parentId;

  const key = ((params.path as string[] | undefined) ?? []).join('/');
  // 자기 가족 폴더 밖은 열 수 없음 ('..' 경로 조작도 차단)
  if (!key.startsWith(familyPrefix(parentId)) || key.split('/').includes('..')) {
    return error('접근 권한이 없습니다', 403);
  }

  const object = await env.BUCKET.get(key);
  if (!object) return error('파일을 찾을 수 없습니다', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=86400');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
};
