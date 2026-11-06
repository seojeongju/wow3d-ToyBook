/**
 * 아이 화면 음성 안내 (PRD 8.4 "글을 몰라도 쓸 수 있다", 8.3 마스코트 음성 켜기/끄기).
 * 브라우저 내장 TTS(ko-KR)를 쓰고, 켜기/끄기 설정은 기기에 기억.
 * 브라우저는 사용자가 한 번 누르기 전에는 소리 재생을 막으므로, 첫 안내는 버튼으로 시작해야 함.
 */
const SOUND_KEY = 'toybook.sound';

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

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

function koreanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ko'));
  // 기기 기본 한국어 목소리 우선, 없으면 아무 한국어 목소리
  return voices.find((v) => v.default) ?? voices[0];
}

/**
 * 한국어로 읽어 줌. 소리가 꺼져 있거나 TTS 가 없으면 바로 onEnd 호출.
 * 반환값은 말하기를 시작했는지 여부.
 */
export function speak(text: string, opts: { onEnd?: () => void; force?: boolean } = {}): boolean {
  if (!canSpeak || (!opts.force && !isSoundOn())) {
    opts.onEnd?.();
    return false;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  const voice = koreanVoice();
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 1.15; // 조금 밝은 목소리
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}

/** 지금 시각에 맞는 인사말 */
export function timeGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return '아직 깜깜한 밤이에요';
  if (h < 11) return '좋은 아침이에요';
  if (h < 17) return '신나는 오후예요';
  if (h < 20) return '포근한 저녁이에요';
  return '잠들기 전 책 한 권 어때요?';
}
