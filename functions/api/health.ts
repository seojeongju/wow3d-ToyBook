import type { Env } from '../_lib/env';
import { json } from '../_lib/http';
import { storyMode } from '../_lib/story';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  // story: 이야기 공방 AI 가 켜졌는지만 알려 줌 (claude · dev · off, 키 값은 보이지 않음)
  const result = { ok: true, d1: false, r2: false, story: storyMode(env) };
  try {
    await env.DB.prepare('SELECT 1').first();
    result.d1 = true;
  } catch {
    result.ok = false;
  }
  try {
    await env.BUCKET.list({ limit: 1 });
    result.r2 = true;
  } catch {
    result.ok = false;
  }
  return json(result, result.ok ? 200 : 503);
};
