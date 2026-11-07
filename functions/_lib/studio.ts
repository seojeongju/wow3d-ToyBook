import type { Env } from './env';
import { error } from './http';
import { requireActive } from './parent';
import { pageCountFor, type AgeMode, type Outline, type StoryInput } from './story';

/** 하루에 만들 수 있는 횟수 (가족마다, 한국 날짜 기준) */
export const DAILY_LIMIT = { outline: 20, book: 5 } as const;

function kstDay(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

export async function usageLeft(env: Env, parentId: string, kind: keyof typeof DAILY_LIMIT): Promise<number> {
  const row = await env.DB.prepare('SELECT count FROM studio_usage WHERE parent_id = ? AND day = ? AND kind = ?')
    .bind(parentId, kstDay(), kind)
    .first<{ count: number }>();
  return DAILY_LIMIT[kind] - (row?.count ?? 0);
}

export async function addUsage(env: Env, parentId: string, kind: keyof typeof DAILY_LIMIT) {
  await env.DB.prepare(
    'INSERT INTO studio_usage (parent_id, day, kind, count) VALUES (?, ?, ?, 1) ON CONFLICT (parent_id, day, kind) DO UPDATE SET count = count + 1',
  )
    .bind(parentId, kstDay(), kind)
    .run();
}

const short = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

/**
 * 이야기 공방 요청 공통 확인: 가입을 마친 로그인 계정 + 내 아이 + 재료(친구·장소·주제).
 * 아이 화면에서 쓰므로 부모 모드(PIN)까지는 요구하지 않음 — 비용은 하루 횟수로 막음
 */
export async function readStudioRequest(
  request: Request,
  env: Env,
  kind: keyof typeof DAILY_LIMIT,
): Promise<{ parentId: string; childId: string; input: StoryInput; body: Record<string, unknown> } | Response> {
  const me = await requireActive(request, env);
  if (me instanceof Response) return me;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const childId = short(body.childId, 80);
  const child = await env.DB.prepare('SELECT nickname, age_mode, likes FROM children WHERE id = ? AND parent_id = ?')
    .bind(childId, me.id)
    .first<{ nickname: string; age_mode: AgeMode; likes: string | null }>();
  if (!child) return error('아이 프로필을 찾을 수 없어요', 404);

  const hero = short(body.hero, 30);
  const place = short(body.place, 30);
  const topic = short(body.topic, 60);
  if (!hero || !place || !topic) return error('친구·장소·주제를 골라 주세요');

  if ((await usageLeft(env, me.id, kind)) <= 0) {
    return error(kind === 'book' ? `오늘은 책을 ${DAILY_LIMIT.book}권까지 만들 수 있어요. 내일 또 만들어요!` : '오늘은 줄거리를 많이 만들었어요. 내일 또 만들어요!', 429);
  }

  return {
    parentId: me.id,
    childId,
    body,
    input: { childName: child.nickname, mode: child.age_mode, likes: child.likes, hero, place, topic, pageCount: pageCountFor(child.age_mode, body.pageCount) },
  };
}

/** 부모가 고친 줄거리 검사 */
export function parseOutline(v: unknown): Outline | null {
  const o = v as Partial<Outline> | null;
  if (!o || typeof o !== 'object') return null;
  const title = short(o.title, 40);
  const beats = Array.isArray(o.beats) ? o.beats.slice(0, 3).map((b) => ({ label: short(b?.label, 6) || '·', text: short(b?.text, 200) })) : [];
  if (!title || beats.length < 3 || beats.some((b) => !b.text)) return null;
  return { title, summary: short(o.summary, 200), beats, lesson: short(o.lesson, 120) };
}
