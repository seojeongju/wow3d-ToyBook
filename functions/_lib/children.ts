import type { Env } from './env';
import { familyPrefix } from './http';

/** 아이 프로필 규칙 (PRD 9.1): 실명·연락처 없이 별명·태어난 해·아바타·좋아하는 것만 */
export const AVATARS = ['🐻', '🐰', '🦖', '🐣', '🤖', '🧚'];
export const MAX_CHILDREN = 6;
export type AgeMode = 'sprout' | 'kid' | 'author';

export interface ChildInput {
  nickname?: unknown;
  birthYear?: unknown;
  avatar?: unknown;
  likes?: unknown;
  ageMode?: unknown;
}

export interface ChildFields {
  nickname: string;
  birth_year: number;
  avatar: string;
  likes: string | null;
  age_mode: AgeMode;
}

/** 나이로 화면 모드 고르기 (PRD 8.5): 3~5세 새싹, 6~8세 꼬마 작가, 9~12세 작가 */
export function modeForBirthYear(year: number, now = new Date()): AgeMode {
  const age = now.getFullYear() - year;
  return age <= 5 ? 'sprout' : age <= 8 ? 'kid' : 'author';
}

/** 입력 검사. 맞으면 저장할 값, 틀리면 안내 문장 */
export function parseChild(body: ChildInput): ChildFields | string {
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim().replace(/\s+/g, ' ') : '';
  if (nickname.length < 1 || nickname.length > 10) return '별명은 1~10자로 적어 주세요';
  if (/[0-9]{4,}|@/.test(nickname)) return '별명에는 전화번호·이메일 같은 정보를 넣지 말아 주세요';

  const thisYear = new Date().getFullYear();
  const birthYear = Number(body.birthYear);
  if (!Number.isInteger(birthYear) || birthYear < thisYear - 13 || birthYear > thisYear - 2) return '태어난 해를 골라 주세요 (3~12세)';

  const avatar = typeof body.avatar === 'string' && AVATARS.includes(body.avatar) ? body.avatar : null;
  if (!avatar) return '캐릭터를 골라 주세요';

  const likes = typeof body.likes === 'string' ? body.likes.trim().slice(0, 40) : '';
  const ageMode = body.ageMode === 'sprout' || body.ageMode === 'kid' || body.ageMode === 'author' ? body.ageMode : modeForBirthYear(birthYear);
  return { nickname, birth_year: birthYear, avatar, likes: likes || null, age_mode: ageMode };
}

/** R2 에서 이 가족 폴더 안의 파일만 지움 (다른 가족 파일은 건드리지 않음) */
export async function deleteFamilyFiles(env: Env, parentId: string, keys: (string | null)[]) {
  const mine = keys.filter((k): k is string => Boolean(k && k.startsWith(familyPrefix(parentId))));
  for (let i = 0; i < mine.length; i += 1000) await env.BUCKET.delete(mine.slice(i, i + 1000));
}

/** 아이 한 명과 그 아이의 책·쪽·그림 파일을 모두 지움 */
export async function deleteChildData(env: Env, parentId: string, childId: string) {
  const { results } = await env.DB.prepare(
    `SELECT b.cover_key AS k FROM books b WHERE b.parent_id = ?1 AND b.child_id = ?2
     UNION ALL
     SELECT p.image_key FROM book_pages p JOIN books b ON b.id = p.book_id WHERE b.parent_id = ?1 AND b.child_id = ?2`,
  )
    .bind(parentId, childId)
    .all<{ k: string | null }>();
  await deleteFamilyFiles(env, parentId, results.map((r) => r.k));

  const books = 'SELECT id FROM books WHERE parent_id = ?1 AND child_id = ?2';
  await env.DB.batch([
    env.DB.prepare('DELETE FROM wishes WHERE child_id = ?2 AND child_id IN (SELECT id FROM children WHERE parent_id = ?1)').bind(parentId, childId),
    env.DB.prepare(`DELETE FROM book_characters WHERE book_id IN (${books})`).bind(parentId, childId),
    env.DB.prepare(`DELETE FROM book_pages WHERE book_id IN (${books})`).bind(parentId, childId),
    env.DB.prepare(`UPDATE models_3d SET book_id = NULL WHERE book_id IN (${books})`).bind(parentId, childId),
    env.DB.prepare('DELETE FROM books WHERE parent_id = ?1 AND child_id = ?2').bind(parentId, childId),
    env.DB.prepare('DELETE FROM children WHERE id = ?2 AND parent_id = ?1').bind(parentId, childId),
  ]);
}
