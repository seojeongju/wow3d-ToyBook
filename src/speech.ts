/**
 * 한국어 동화 구연 & 마스코트 음성 엔진 (3단계 하이브리드)
 *
 * [1단계] 내장 신경망(Neural) 성우 오디오 (/audio/*.mp3):
 *   고정 안내 멘트·히어로 캐릭터별 대사·데모 동화책 2권은 미리 생성한 고품질 신경망 MP3를 즉시 재생.
 * [2단계] OpenAI Audio API (gpt-4o-mini-tts) + Cloudflare R2 캐시 (/api/tts):
 *   새로 생성된 동화 문장은 서버에 OPENAI_API_KEY가 설정되어 있으면 OpenAI 음성으로 합성·R2 캐싱 후 재생.
 * [3단계] 브라우저 내장 Neural 음성 폴백 (window.speechSynthesis):
 *   오프라인이거나 API 키 미설정 시 기기 내 Natural/Neural 한국어 음성을 최우선 선택해 왜곡 없이 재생.
 */
const SOUND_KEY = 'toybook.sound';

export const canSpeak =
  typeof window !== 'undefined' && ('Audio' in window || 'speechSynthesis' in window);

/** 내장 신경망(Neural) 성우 MP3 매핑 (문장 텍스트 또는 페이지 ID 키) */
const PRESET_AUDIO: Record<string, string> = {
  // 1. 히어로 섹션 캐릭터별 대사 (별곰 · 달님 토끼 · 꼬마 공룡 · 장난감 로봇 · 치카 요정)
  '안녕! 나를 누르면 동화 속 친구들이 장난감으로 튀어나와요!': '/audio/hero-1.mp3',
  '네가 그린 그림도 세상에 하나뿐인 3D 피규어로 변신해!': '/audio/hero-2.mp3',
  '책 속에서 뿅! 나랑 같이 재미있는 동화책 만들래?': '/audio/hero-3.mp3',
  '와우쓰리디 장난감 공장에서 진짜 피규어로 만나요!': '/audio/hero-4.mp3',
  '반가워! 나는 반짝반짝 별곰이야! 책 속에서 장난감으로 튀어나왔어!': '/audio/hero-star-pick.mp3',
  '깡총깡총 안녕! 나는 달님 토끼야! 오늘 밤 어떤 동화를 만들어 볼까?': '/audio/hero-rabbit-pick.mp3',
  '내 귀엽고 긴 귀도 3D 프린터로 똑같이 만들어 줘요!': '/audio/hero-rabbit-2.mp3',
  '크앙! 반가워! 나는 꼬마 공룡이야! 신나는 모험 동화를 만들자!': '/audio/hero-dino-pick.mp3',
  '블록으로 만든 공룡 친구도 진짜 장난감 피규어로 변신해!': '/audio/hero-dino-2.mp3',
  '삐빅! 안녕! 나는 장난감 로봇이야! 우주 끝까지 날아가 볼까?': '/audio/hero-robot-pick.mp3',
  '내 멋진 로봇 팔과 날개도 3D 프린터로 뚝딱 만들어 줘요!': '/audio/hero-robot-2.mp3',
  '반짝반짝 안녕! 나는 치카 요정이야! 오늘도 이가 반짝반짝 빛나네!': '/audio/hero-fairy-pick.mp3',
  '요술 칫솔을 흔들면 동화 속 요정 친구가 장난감으로 튀어나와요!': '/audio/hero-fairy-2.mp3',

  // 2. 프로필 선택 (누가 볼까요?)
  '누가 볼까요? 내 얼굴을 눌러 주세요': '/audio/who-guide.mp3',
  '민지야 반가워! 책장으로 가 볼까?': '/audio/who-minji.mp3',
  '준호야 반가워! 책장으로 가 볼까?': '/audio/who-junho.mp3',

  // 3. 우리 집 책장 안내 멘트
  '민지와 반짝반짝 치카 요정을 펼쳐요!': '/audio/shelf-open-brush.mp3',
  '준호와 꼬마 공룡 로봇을 펼쳐요!': '/audio/shelf-open-dino.mp3',
  '이야기 공방에서 새 책을 만들 수 있어요. 곧 열려요!': '/audio/shelf-new-book.mp3',
  '나무 책장으로 바꿨어요!': '/audio/shelf-room-wood.mp3',
  '구름 책장으로 바꿨어요!': '/audio/shelf-room-cloud.mp3',
  '내 책상으로 바꿨어요!': '/audio/shelf-room-desk.mp3',
  '내 방 사진으로 책장을 만드는 기능은 곧 열려요. 어른과 함께 해요!': '/audio/shelf-room-photo.mp3',
  '여기는 민지의 책장이에요': '/audio/shelf-here-minji.mp3',
  '여기는 준호의 책장이에요': '/audio/shelf-here-junho.mp3',
  '여기는 우리 집 책장이에요': '/audio/shelf-here-default.mp3',
  '이야기 공방은 곧 열려요!': '/audio/shelf-soon-studio.mp3',
  '마법 상자는 곧 열려요!': '/audio/shelf-soon-magic.mp3',
  '장난감 공장은 곧 열려요!': '/audio/shelf-soon-factory.mp3',

  // 4. 데모 동화책 1 (민지와 반짝반짝 치카 요정) — ID 및 본문 매핑
  'p-brush-1': '/audio/p-brush-1.mp3',
  '어느 날 밤, 민지의 칫솔이 반짝반짝 빛나기 시작했어요.': '/audio/p-brush-1.mp3',
  'p-brush-2': '/audio/p-brush-2.mp3',
  '"안녕, 민지야! 나는 치카 요정이야." 작은 요정이 웃으며 인사했어요.': '/audio/p-brush-2.mp3',
  'p-brush-3': '/audio/p-brush-3.mp3',
  '"이를 닦지 않으면 충치 벌레들이 놀러 온단다." 요정이 말했어요.': '/audio/p-brush-3.mp3',
  'p-brush-4': '/audio/p-brush-4.mp3',
  '민지는 위아래로 치카치카, 동글동글 치카치카 이를 닦았어요.': '/audio/p-brush-4.mp3',
  'p-brush-5': '/audio/p-brush-5.mp3',
  '충치 벌레들은 깜짝 놀라 멀리멀리 도망갔어요. 민지의 이가 반짝반짝!': '/audio/p-brush-5.mp3',

  // 5. 데모 동화책 2 (준호와 꼬마 공룡 로봇) — ID 및 본문 매핑
  'p-dino-1': '/audio/p-dino-1.mp3',
  '준호는 블록으로 아주 커다란 공룡 로봇을 만들었어요.': '/audio/p-dino-1.mp3',
  'p-dino-2': '/audio/p-dino-2.mp3',
  '그런데 갑자기 로봇이 "쿠웅!" 하고 눈을 떴어요.': '/audio/p-dino-2.mp3',
  'p-dino-3': '/audio/p-dino-3.mp3',
  '"준호야, 우리 같이 공룡 섬으로 모험을 떠나자!"': '/audio/p-dino-3.mp3',
  'p-dino-4': '/audio/p-dino-4.mp3',
  '공룡 섬 친구들과 신나게 놀고, 둘은 노을을 보며 집으로 돌아왔어요.': '/audio/p-dino-4.mp3',
};

let currentAudio: HTMLAudioElement | null = null;
let currentAbort: AbortController | null = null;
/** 서버 OpenAI TTS 활성 여부 (204 no-api-key 응답 시 세션 동안 불필요한 재호출 방지) */
let serverTtsEnabled = true;
const blobCache = new Map<string, string>();

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });
}

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* 저장 못 해도 이번 화면에서는 적용됨 */
  }
  if (!on) stopSpeaking();
}

function pickBestKoreanVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ko'));

  if (voices.length === 0) return undefined;

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase();
    let score = 0;
    if (name.includes('natural') || name.includes('neural')) score += 100;
    if (name.includes('sunhi') || name.includes('seohyeon')) score += 90;
    if (name.includes('injoon') || name.includes('hyunsu')) score += 80;
    if (name.includes('online')) score += 50;
    if (name.includes('premium') || name.includes('enhanced')) score += 60;
    if (name.includes('siri') || name.includes('yuna') || name.includes('sora')) score += 45;
    if (name.includes('google')) score += 40;
    if (!v.localService) score += 25;
    if (name.includes('heami')) score -= 60;
    return score;
  };

  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

export interface SpeakOptions {
  onEnd?: () => void;
  force?: boolean;
  cacheKey?: string;
  style?: 'story' | 'mascot';
  useServerTts?: boolean;
}

function playAudioUrl(url: string, onEnd?: () => void, onFallback?: () => void) {
  const audio = new Audio(url);
  currentAudio = audio;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    if (currentAudio === audio) currentAudio = null;
    onEnd?.();
  };
  audio.onended = done;
  audio.onerror = () => {
    if (finished) return;
    finished = true;
    if (currentAudio === audio) currentAudio = null;
    if (onFallback) onFallback();
    else onEnd?.();
  };
  audio.play().catch(() => {
    if (finished) return;
    finished = true;
    if (currentAudio === audio) currentAudio = null;
    if (onFallback) onFallback();
    else onEnd?.();
  });
}

function speakWithBrowser(text: string, opts: SpeakOptions) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    opts.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const cleaned = text
    .replace(/["'“”‘’]/g, '')
    .replace(/3D/gi, '쓰리디')
    .trim();

  const u = new SpeechSynthesisUtterance(cleaned);
  u.lang = 'ko-KR';
  const voice = pickBestKoreanVoice();
  if (voice) u.voice = voice;

  u.rate = opts.style === 'story' ? 0.94 : 0.98;
  u.pitch = 1.0;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  synth.speak(u);
}

export function speak(text: string, opts: SpeakOptions = {}): boolean {
  const trimmed = text.trim();
  if (!trimmed || !canSpeak || (!opts.force && !isSoundOn())) {
    opts.onEnd?.();
    return false;
  }

  stopSpeaking();

  const presetUrl = (opts.cacheKey && PRESET_AUDIO[opts.cacheKey]) || PRESET_AUDIO[trimmed];
  if (presetUrl) {
    playAudioUrl(presetUrl, opts.onEnd, () => speakWithBrowser(trimmed, opts));
    return true;
  }

  const memKey = `${opts.style ?? 'story'}:${trimmed}`;
  const cachedBlobUrl = blobCache.get(memKey);
  if (cachedBlobUrl) {
    playAudioUrl(cachedBlobUrl, opts.onEnd, () => speakWithBrowser(trimmed, opts));
    return true;
  }

  if (opts.useServerTts && serverTtsEnabled && typeof fetch !== 'undefined') {
    const ctrl = new AbortController();
    currentAbort = ctrl;

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed,
        cacheKey: opts.cacheKey,
        style: opts.style ?? 'story',
      }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (currentAbort !== ctrl) return;
        currentAbort = null;

        if (res.status === 200 && res.headers.get('content-type')?.includes('audio')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          blobCache.set(memKey, url);
          playAudioUrl(url, opts.onEnd, () => speakWithBrowser(trimmed, opts));
          return;
        }

        if (res.headers.get('x-tts-source') === 'no-api-key') {
          serverTtsEnabled = false;
        }
        speakWithBrowser(trimmed, opts);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        currentAbort = null;
        speakWithBrowser(trimmed, opts);
      });

    return true;
  }

  speakWithBrowser(trimmed, opts);
  return true;
}

export function stopSpeaking() {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function timeGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return '아직 깜깜한 밤이에요';
  if (h < 11) return '좋은 아침이에요';
  if (h < 17) return '신나는 오후예요';
  if (h < 20) return '포근한 저녁이에요';
  return '잠들기 전 책 한 권 어때요?';
}
