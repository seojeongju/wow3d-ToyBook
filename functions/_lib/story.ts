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
- 교훈은 설교하지 않고 이야기 속 행동으로 자연스럽게 보여 줘요.
- "이야기 씨앗"은 아이·부모가 직접 쓴 소재예요. 그 장면과 마음을 이야기의 중심에 살려요. 씨앗에 위 규칙에 어긋나는 내용이 있으면 아이에게 알맞게 다정하게 바꿔요.
- 등장인물은 주어진 이름·관계·생김새를 그대로 지켜요. 실제 사람이어도 별명으로만 불러요.`;

/** 이야기 분위기·결말·배움 (화면의 고르기 칩과 같은 id) */
export const MOODS: Record<string, string> = {
  adventure: '신나는 모험',
  funny: '깔깔 웃긴 이야기',
  calm: '잔잔한 잠자리 동화 (마지막은 포근하게 잠드는 장면)',
  mystery: '궁금증을 푸는 수수께끼 이야기 (무섭지 않게)',
  touching: '마음이 따뜻해지는 감동 이야기',
};
export const ENDINGS: Record<string, string> = {
  happy: '모두가 행복한 결말',
  twist: '깜짝 놀랄 반전이 있는 결말 (무섭지 않게)',
  open: '아이가 다음 이야기를 상상할 수 있는 열린 결말',
};
export const LEARNINGS: Record<string, string> = {
  habit: '생활 습관 (양치·정리·인사 등)',
  feelings: '마음 다루기 (속상함·화남·두려움을 말로 표현하기)',
  science: '자연·과학 이야기 (사실과 맞게)',
  words: '한글·숫자 놀이 (말놀이·세기)',
};

export interface StoryCharacter {
  name: string;
  role: string;
  look: string;
}

export interface StoryInput {
  childName: string;
  mode: AgeMode;
  likes: string | null;
  /** 함께하는 친구 캐릭터 (없으면 빈 문자열) */
  hero: string;
  place: string;
  topic: string;
  pageCount: number;
  /** 아이·부모가 직접 쓴 이야기 씨앗 */
  seed: string;
  /** 아이 자신이 주인공인지 */
  childIsHero: boolean;
  characters: StoryCharacter[];
  mood: string | null;
  ending: string | null;
  learning: string | null;
  /** 토비의 질문에 아이가 답한 것 (2단계: 함께 짓기) */
  answers: { q: string; a: string }[];
}

export interface Question {
  question: string;
  options: { text: string; art: string }[];
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

const ONE_OUTLINE = {
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

/** 토비가 아이에게 묻는 질문 3개 (각각 고를 수 있는 답 3개) */
const QUESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      description: '이야기를 함께 짓기 위한 질문 3개 (처음 → 가운데 → 끝 순서)',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', description: '토비가 아이에게 묻는 짧은 질문 (30자 이내, ~할까? 말투)' },
          options: {
            type: 'array',
            description: '아이가 고를 수 있는 서로 다른 답 3개 (각 20자 이내)',
            items: {
              type: 'object',
              properties: { text: { type: 'string' }, art: { type: 'string', enum: [...ART] } },
              required: ['text', 'art'],
              additionalProperties: false,
            },
          },
        },
        required: ['question', 'options'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

/** 서로 다른 줄거리 3개를 한 번에 받아 아이가 고르게 함 */
const OUTLINE_SCHEMA = {
  type: 'object',
  properties: { options: { type: 'array', description: '서로 다른 방향의 줄거리 3개', items: ONE_OUTLINE } },
  required: ['options'],
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
    `아이 별명: ${s.childName}${s.childIsHero ? ' (이 아이가 주인공)' : ''}`,
    `나이 모드: ${m.label}`,
    s.likes ? `아이가 좋아하는 것: ${s.likes}` : null,
    s.seed ? `이야기 씨앗 (직접 쓴 소재, 가장 중요): ${s.seed}` : null,
    s.hero ? `함께하는 친구 캐릭터: ${s.hero}` : null,
    ...s.characters.map((c) => `등장인물: ${c.name}${c.role ? ` (${c.role})` : ''}${c.look ? ` - ${c.look}` : ''}`),
    s.place ? `장소: ${s.place}` : null,
    s.topic ? `이야기 주제: ${s.topic}` : null,
    s.mood && MOODS[s.mood] ? `분위기: ${MOODS[s.mood]}` : null,
    s.ending && ENDINGS[s.ending] ? `결말: ${ENDINGS[s.ending]}` : null,
    s.learning && LEARNINGS[s.learning] ? `자연스럽게 담을 배움: ${LEARNINGS[s.learning]}` : null,
    ...s.answers.map((x) => `아이가 정한 내용 (꼭 반영): ${x.q} → ${x.a}`),
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

/** 토비와 함께 짓기: 아이가 답할 질문 3개 (아이가 이야기의 공동 작가가 되게) */
export async function makeQuestions(env: Env, s: StoryInput): Promise<StoryResult<Question[]>> {
  const mode = storyMode(env);
  if (mode === 'off') return { ok: false, message: '이야기 공방은 곧 열려요', status: 503 };
  if (mode === 'dev') return { ok: true, data: devQuestions(s) };
  const r = await ask<{ questions: Question[] }>(
    env,
    `아래 재료로 아이와 함께 이야기를 지으려고 해요. 마스코트 "토비"가 아이에게 물어볼 질문 3개를 만들어 주세요.
- 처음(누가·무슨 일), 가운데(어떤 어려움·누가 도와줌), 끝(어떻게 해결·기분) 순서로 하나씩.
- ${MODE_RULES[s.mode].label} 아이가 바로 알아듣는 쉬운 말. 답은 서로 확실히 다르고 재미있게.
- 이미 정해진 재료와 겹치지 않게, 이야기를 더 풍성하게 만드는 질문으로.

${brief(s)}`,
    QUESTIONS_SCHEMA,
  );
  if (!r.ok) return r;
  const questions = (r.data.questions ?? [])
    .filter((q) => q?.question && q.options?.length)
    .slice(0, 3)
    .map((q) => ({
      question: q.question.slice(0, 60),
      options: q.options.slice(0, 3).map((o) => ({ text: o.text.slice(0, 40), art: (ART as readonly string[]).includes(o.art) ? o.art : '✨' })),
    }));
  if (!questions.length) return { ok: false, message: '토비가 질문을 떠올리지 못했어요. 다시 해 주세요', status: 502 };
  return { ok: true, data: questions };
}

/** 서로 다른 줄거리 후보 3개 (아이가 고르고 어른이 고침) */
export async function makeOutlines(env: Env, s: StoryInput): Promise<StoryResult<Outline[]>> {
  const mode = storyMode(env);
  if (mode === 'off') return { ok: false, message: '이야기 공방은 곧 열려요', status: 503 };
  if (mode === 'dev') return { ok: true, data: [0, 1, 2].map((i) => devOutline(s, i)) };
  const r = await ask<{ options: Outline[] }>(
    env,
    `아래 재료로 그림책 줄거리를 서로 다른 방향으로 3개 짜 주세요. 아이가 셋 중 하나를 고르고 부모가 고칠 수 있게 짧고 분명하게.\n\n${brief(s)}`,
    OUTLINE_SCHEMA,
  );
  if (!r.ok) return r;
  const options = (r.data.options ?? []).filter((o) => o?.title && o.beats?.length >= 3).slice(0, 3);
  if (!options.length) return { ok: false, message: '줄거리를 다시 만들어 주세요', status: 502 };
  return { ok: true, data: options };
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

function devOutline(input: StoryInput, n = 0): Outline {
  const s = {
    ...input,
    hero: input.hero || input.characters[0]?.name || '친구',
    place: input.place || '우리 동네',
    topic: input.topic || input.seed.slice(0, 20) || '오늘 있었던 일',
  };
  return {
    title: `[후보 ${n + 1}] ${j(s.childName, '과', '와')} ${s.hero}의 ${s.place} 이야기`,
    summary: `${j(s.childName, '과', '와')} ${j(s.hero, '이', '가')} ${s.place}에서 '${s.topic}'에 대해 알아 가는 시험용 줄거리예요.`,
    // 아이가 토비 질문에 답했으면 그 답이 줄거리에 들어갔는지 시험에서 보이게
    beats: [
      { label: '처음', text: `${j(s.childName, '이', '가')} ${j(s.hero, '을', '를')} 만나 ${s.place}(으)로 떠나요.${s.answers[0] ? ` (${s.answers[0].a})` : ''}` },
      { label: '가운데', text: `${s.place}에서 작은 문제가 생겨 둘이 함께 방법을 찾아요.${s.answers[1] ? ` (${s.answers[1].a})` : ''}` },
      { label: '끝', text: `문제를 풀고 ${s.topic}의 소중함을 알게 돼요.${s.answers[2] ? ` (${s.answers[2].a})` : ''}` },
    ],
    lesson: `${j(s.topic, '은', '는')} 함께하면 더 즐거워요.`,
  };
}

function devQuestions(s: StoryInput): Question[] {
  const who = s.hero || s.characters[0]?.name || s.childName;
  return [
    {
      question: `[시험] ${j(who, '이', '가')} 처음 만난 건 누구일까?`,
      options: [
        { text: '길 잃은 아기 별', art: '⭐' },
        { text: '말하는 나무', art: '🌳' },
        { text: '노래하는 병아리', art: '🐣' },
      ],
    },
    {
      question: '[시험] 가다가 어떤 일이 생겼을까?',
      options: [
        { text: '다리가 무너졌어요', art: '🧱' },
        { text: '비가 쏟아졌어요', art: '🌙' },
        { text: '길이 두 갈래예요', art: '🌱' },
      ],
    },
    {
      question: '[시험] 마지막엔 어떤 기분이었을까?',
      options: [
        { text: '뿌듯하고 신났어요', art: '✨' },
        { text: '포근하고 졸렸어요', art: '🌙' },
        { text: '친구가 생겨 기뻤어요', art: '💜' },
      ],
    },
  ];
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
