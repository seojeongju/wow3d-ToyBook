import type { Env } from '../_lib/env';
import { error, familyPrefix, json, newId, requireParentForWrite } from '../_lib/http';

const MAX_BYTES = 20 * 1024 * 1024;

// 허용 형식 → 저장 확장자. GLB 는 브라우저가 type 을 비워 보내는 경우가 많아 확장자로도 판별
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'model/gltf-binary': 'glb',
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const parentId = await requireParentForWrite(request, env);
  if (parentId instanceof Response) return parentId;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error('multipart/form-data 로 보내 주세요');
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') return error('file 필드가 없습니다');
  if (file.size === 0 || file.size > MAX_BYTES) return error('파일은 20MB 이하여야 합니다', 413);

  let contentType = file.type;
  if (!contentType && file.name.toLowerCase().endsWith('.glb')) contentType = 'model/gltf-binary';
  const ext = ALLOWED[contentType];
  if (!ext) return error('PNG·JPG·WEBP 이미지 또는 GLB 파일만 올릴 수 있습니다', 415);

  const kind = ext === 'glb' ? 'models' : 'images';
  const key = `${familyPrefix(parentId)}${kind}/${newId()}.${ext}`;
  await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType } });

  return json({ key, url: `/api/files/${key}` }, 201);
};
