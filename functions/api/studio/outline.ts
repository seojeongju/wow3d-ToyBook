import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { makeOutlines } from '../../_lib/story';
import { addUsage, readStudioRequest, usageLeft } from '../../_lib/studio';

/** 이야기 공방 1단계: 이야기 씨앗·등장인물·장소·주제·분위기로 줄거리 후보 3개 만들기 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const req = await readStudioRequest(request, env, 'outline');
  if (req instanceof Response) return req;

  const r = await makeOutlines(env, req.input);
  if (!r.ok) return error(r.message, r.status);
  await addUsage(env, req.parentId, 'outline');
  return json({ options: r.data, pageCount: req.input.pageCount, booksLeft: await usageLeft(env, req.parentId, 'book') });
};
