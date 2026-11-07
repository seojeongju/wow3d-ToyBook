import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { makeOutline } from '../../_lib/story';
import { addUsage, readStudioRequest, usageLeft } from '../../_lib/studio';

/** 이야기 공방 1단계: 친구·장소·주제로 줄거리(제목·처음/가운데/끝) 만들기 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const req = await readStudioRequest(request, env, 'outline');
  if (req instanceof Response) return req;

  const r = await makeOutline(env, req.input);
  if (!r.ok) return error(r.message, r.status);
  await addUsage(env, req.parentId, 'outline');
  return json({ outline: r.data, pageCount: req.input.pageCount, booksLeft: await usageLeft(env, req.parentId, 'book') });
};
