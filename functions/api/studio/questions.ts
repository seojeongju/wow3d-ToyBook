import type { Env } from '../../_lib/env';
import { error, json } from '../../_lib/http';
import { makeQuestions } from '../../_lib/story';
import { addUsage, readStudioRequest } from '../../_lib/studio';

/** 이야기 공방 2단계(함께 짓기): 고른 재료로 토비가 아이에게 물어볼 질문 3개 (줄거리 하루 횟수에 함께 셈) */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const req = await readStudioRequest(request, env, 'outline');
  if (req instanceof Response) return req;

  const r = await makeQuestions(env, req.input);
  if (!r.ok) return error(r.message, r.status);
  await addUsage(env, req.parentId, 'outline');
  return json({ questions: r.data });
};
