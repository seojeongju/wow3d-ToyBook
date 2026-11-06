import type { Env } from '../_lib/env';
import { json } from '../_lib/http';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const result = { ok: true, d1: false, r2: false };
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
