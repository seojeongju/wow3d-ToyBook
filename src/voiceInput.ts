import { useCallback, useEffect, useRef, useState } from 'react';
import { stopSpeaking } from './speech';

/**
 * 말로 쓰기 (이야기 공방): 브라우저 음성 인식(크롬·엣지·사파리)으로 아이 말을 글자로 바꿈.
 * 한글을 아직 못 쓰는 새싹 모드 아이도 이야기에 참여할 수 있게.
 * 소리는 토이북 서버로 보내지 않고 저장하지도 않음 (브라우저의 음성 인식 서비스가 처리)
 */
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceInput(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  // 화면이 그려진 뒤에 확인 (미리 그리기·서버에서는 window 없음)
  useEffect(() => setSupported(Boolean(ctor())), []);
  useEffect(() => () => rec.current?.stop(), []);

  const start = useCallback(() => {
    const C = ctor();
    if (!C) return;
    stopSpeaking();
    setError(null);
    const r = new C();
    r.lang = 'ko-KR';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) cb.current(text);
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' ? '마이크를 쓸 수 있게 허락해 주세요' : '잘 못 들었어요. 다시 말해 줄래요?');
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
