import Anthropic from '@anthropic-ai/sdk';
import type { Env } from './env';

/**
 * 이야기 공방 (PRD 7.1·B-01): Claude 로 줄거리 → 쪽별 글을 만듦.
 * - 나이 모드(새싹·꼬마 작가·작가)에 맞춰 문장 길이·어휘를 조절
 * - 결과는 정해진 JSON 모양(structured outputs)으로만 받음
 * - 그림은 아직 이미지 AI 를 정하기 전이라, 화면에 있는 점토 그림 목록에서 장면에 맞는 것을 고르게 함
 * - 키가 없을 때: 로컬(ALLOW_DEV_LOGIN)에서는 시험용 이야기, 운영에서는 "준비 중"
 */
export const STORY_MODEL = 'claude-opus-5-5';

export type AgeMode = 'sprout' | 'kid' | 'author';

/** 쪽 그림으로 쓸 수 있는 점토 그림 (src/components/ClayArt.tsx EMOJI 와 같은 키) */
export const ART = ['🐻', '🐰', '🦖', '🐣', '🌱', '🌳', '🌙', '🧚', '🦷', '🪥', '✨', '🧱', '🤖', '🏝️', '🌅', '📘', '💜', '⭐'] as const;
/** 쪽 바탕색 (점토 파스텔) */
export const BG = ['#ECE5FD', '#FFE7DD', '#DEF4EA', '#FFF1CF', '#FDE4EA', '#DCEBFF'] as const;

const MODE_RULES: Record<AgeMode, { label: string; pages: number[]; rule: string }> = {
  sprout: {
    label: '새싹(3~5세)',
    pages: [8],
    rule: '한 쪽에 1~2문장, 40자 안팎. 아주 쉬운 낱말, 소리·흉내 말(퐁퐁, 반짝반짝)을 자주. 같은 말 되풀이로 리듬감.',
  },
  kid: {
    label: '꼬마 작가(6~8세)',
    pages: [8, 12],
    rule: '한 쪽에 2~3문장, 80자 안팎. 쉬운 낱말 위주, 대화 문장을 조금 섞기.',
  },
  author: {
    label: '작가(9~12세)',
    pages: [8, 12],
    rule: '한 쪽에 3~4문장, 140자 안팎. 감정 표현과 작은 고민·해결 과정을 담기.',
  },
};

export function pageCountFor(mode: AgeMode, wanted: unknown): number {
  const allowed = MODE_RULES[mode].pages;
  return allowed.includes(Number(wanted)) ? Number(wanted) : allowed[0];
}

const SYSTEM = `당신은 한국 어린이(3~12세)를 위한 그림책 작가예요. 부모와 아이가 고른 재료로 따뜻하고 안전한 창작 동화를 써요.

지켜야 할 것:
- 자연스러운 한국어 동화체(~했어요, ~했답니다). 맞춤법·띄어쓰기를 지켜요.
- 무서운 장면, 폭력, 다침, 죽음, 따돌림을 부추기는 내용, 어른용 주제, 광고·상표는 넣지 않아요. 갈등은 작고 다정하게 풀려요.
- 기존 작품의 캐릭터(예: 디즈니, 뽀로로, 포켓몬)나 특정 작가·스튜디오의 그림체를 흉내 내지 않아요. 요청에 그런 이름이 있으면 비슷한 느낌의 새 캐릭터로 바꿔요.
- 아이 이름은 별명만 쓰고, 실제 주소·학교·연락처 같은 개인정보는 만들지 않아요.
- 교훈은 설교하지 않고 이야기 속 행동으로 자연스럽게 보여 줘요.`;

export interface StoryInput {
  childName: string;
  mode: AgeMode;
  likes: string | null;
  hero: string;
  place: string;
  topic: string;
  pageCount: number;
}

export interface Outline {
  title: string;
  summary: string;
  beats: { label: string; text: string }[];
  lesson: string;
}

export interface WrittenBook {
  title: string;
  cover_art: string;
  pages: { text: string; art: string; bg: string }[];
}

const OUTLINE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '책 제목 (20자 이내)' },
    summary: { type: 'string', description: '한두 문장 줄거리' },
    beats: {
      type: 'array',
      description: '처음·가운데·끝 세 단계',
      items: {
        type: 'object',
        properties: { label: { type: 'string', enum: ['처음', '가운데', '끝'] }, text: { type: 'string' } },
        required: ['label', 'text'],
        additionalProperties: false,
      },
    },
    lesson: { type: 'string', description: '이야기가 자연스럽게 전하는 마음 (한 문장)' },
  },
  required: ['title', 'summary', 'beats', 'lesson'],
  additionalProperties: false,
};

const BOOK_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    cover_art: { type: 'string', enum: [...ART] },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          art: { type: 'string', enum: [...ART], description: '이 쪽 장면에 가장 어울리는 그림' },
          bg: { type: 'string', enum: [...BG], description: '장면 분위기에 맞는 바탕색' },
        },
        required: ['text', 'art', 'bg'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'cover_art', 'pages'],
  additionalProperties: false,
};

function brief(s: StoryInput): string {
  const m = MODE_RULES[s.mode];
  return [
    `주인공 아이 별명: ${s.childName}`,
    `나이 모드: ${m.label}`,
    s.likes ? `아이가 좋아하는 것: ${s.likes}` : null,
    `함께하는 친구 캐릭터: ${s.hero}`,
    `장소: ${s.place}`,
    `이야기 주제: ${s.topic}`,
    `쪽수: ${s.pageCount}쪽`,
  ]
    .filter(Boolean)
    .join('\n');
}

export type StoryResult<T> = { ok: true; data: T } | { ok: false; message: string; status: number };

export function storyMode(env: Env): 'claude' | 'dev' | 'off' {
  if (env.ANTHROPIC_API_KEY) return 'claude';
  if (env.ALLOW_DEV_LOGIN === 'true') return 'dev';
  return 'off';
}

/** Claude 호출 → JSON. 거절·잘림·형식 오류는 아이에게 보여 줄 수 있는 말로 바꿔 돌려줌 */
async function ask<T>(env: Env, prompt: string, schema: Record<string, unknown>): Promise<StoryResult<T>> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 90_000 });
  try {
    const res = await client.beta.messages.create({
      model: STORY_MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      // 안전 분류기가 드물게 거절하면 같은 요청을 다른 모델로 이어서 처리 (서버 쪽 대체)
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    if (res.stop_reason === 'refusal') return { ok: false, message: '이 주제로는 이야기를 만들기 어려워요. 다른 주제를 골라 주세요', status: 422 };
    if (res.stop_reason === 'max_tokens') return { ok: false, message: '이야기가 너무 길어졌어요. 다시 해 주세요', status: 502 };
    const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    return { ok: true, data: JSON.parse(text) as T };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false, message: '지금 이야기를 만드는 사람이 많아요. 잠시 뒤 다시 해 주세요', status: 429 };
    if (e instanceof Anthropic.APIError) {
      console.error('이야기 생성 실패', e.status, e.message);
      return { ok: false, message: '이야기 공방이 잠깐 쉬고 있어요. 잠시 뒤 다시 해 주세요', status: 502 };
    }
    console.error('이야기 생성 실패', e instanceof Error ? e.message : e);
    return { ok: false, message: '이야기를 만들지 못했어요. 다시 해 주세요', status: 502 };
  }
}

export async function makeOutline(env: Env, s: StoryInput): Promise<StoryResult<Outline>> {
  const mode = storyMode(env);
  if (mode === 'off') return { ok: false, message: '이야기 공방은 곧 열려요', status: 503 };
  if (mode === 'dev') return { ok: true, data: devOutline(s) };
  const r = await ask<Outline>(env, `아래 재료로 그림책 줄거리를 짜 주세요. 부모가 보고 고칠 수 있게 짧고 분명하게.\n\n${brief(s)}`, OUTLINE_SCHEMA);
  if (r.ok && (!r.data.title || r.data.beats.length < 3)) return { ok: false, message: '줄거리를 다시 만들어 주세요', status: 502 };
  return r;
}

export async function writeBook(env: Env, s: StoryInput, outline: Outline): Promise<StoryResult<WrittenBook>> {
  const mode = storyMode(env);
  if (mode === 'off') return { ok: false, message: '이야기 공방은 곧 열려요', status: 503 };
  const r =
    mode === 'dev'
      ? ({ ok: true, data: devBook(s, outline) } as const)
      : await ask<WrittenBook>(
          env,
          `아래 줄거리로 그림책 본문을 정확히 ${s.pageCount}쪽 써 주세요.\n글쓰기 규칙: ${MODE_RULES[s.mode].rule}\n마지막 쪽은 따뜻하게 마무리해요.\n\n${brief(s)}\n\n[줄거리]\n제목: ${outline.title}\n${outline.beats
            .map((b) => `${b.label}: ${b.text}`)
            .join('\n')}\n전하는 마음: ${outline.lesson}`,
          BOOK_SCHEMA,
        );
  if (!r.ok) return r;
  // 쪽수·그림 값 정리 (모델이 넘치거나 모자라게 줄 때 대비)
  const pages = r.data.pages
    .filter((p) => p.text?.trim())
    .slice(0, s.pageCount)
    .map((p, i) => ({
      text: p.text.trim().slice(0, 400),
      art: (ART as readonly string[]).includes(p.art) ? p.art : '📘',
      bg: (BG as readonly string[]).includes(p.bg) ? p.bg : BG[i % BG.length],
    }));
  if (pages.length < Math.min(4, s.pageCount)) return { ok: false, message: '책을 다 쓰지 못했어요. 다시 해 주세요', status: 502 };
  return { ok: true, data: { title: (r.data.title || outline.title).slice(0, 40), cover_art: r.data.cover_art, pages } };
}

/* ───────── 로컬 시험용 이야기 (키 없을 때) ───────── */

/** 받침 있으면 a, 없으면 b (하늘과 / 토끼와) */
function j(word: string, a: string, b: string): string {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (c >= 0 && c <= 11171 && c % 28 !== 0 ? a : b);
}

function devOutline(s: StoryInput): Outline {
  return {
    title: `${j(s.childName, '과', '와')} ${s.hero}의 ${s.place} 이야기`,
    summary: `${j(s.childName, '과', '와')} ${j(s.hero, '이', '가')} ${s.place}에서 '${s.topic}'에 대해 알아 가는 시험용 줄거리예요.`,
    beats: [
      { label: '처음', text: `${j(s.childName, '이', '가')} ${j(s.hero, '을', '를')} 만나 ${s.place}(으)로 떠나요.` },
      { label: '가운데', text: `${s.place}에서 작은 문제가 생겨 둘이 함께 방법을 찾아요.` },
      { label: '끝', text: `문제를 풀고 ${s.topic}의 소중함을 알게 돼요.` },
    ],
    lesson: `${j(s.topic, '은', '는')} 함께하면 더 즐거워요.`,
  };
}

function devBook(s: StoryInput, o: Outline): WrittenBook {
  const pool = ['🌱', '✨', '🌙', '⭐', '🌳', '🧱', '🌅', '💜'];
  return {
    title: o.title,
    cover_art: '✨',
    pages: Array.from({ length: s.pageCount }, (_, i) => ({
      text: `[시험용 ${i + 1}쪽] ${o.beats[Math.min(2, Math.floor((i * 3) / s.pageCount))].text}`,
      art: pool[i % pool.length],
      bg: BG[i % BG.length],
    })),
  };
}
