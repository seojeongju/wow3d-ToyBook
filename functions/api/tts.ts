import type { Env } from '../_lib/env';
import { error, json } from '../_lib/http';

interface TtsRequest {
  text?: string;
  cacheKey?: string;
  style?: 'story' | 'mascot';
}

const INSTRUCTIONS: Record<'story' | 'mascot', string> = {
  story:
    '3~10세 한국 어린이에게 그림책을 읽어주는 다정하고 따뜻한 동화 구연 성우처럼, 정확한 한국어 발음과 자연스러운 쉼표 호흡, 생동감 있는 억양으로 읽어 주세요.',
  mascot:
    '어린이의 다정한 장난감 친구처럼 밝고 상냥하고 또렷한 한국어 억양으로 말해 주세요.',
};

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/**
 * POST /api/tts
 * 1) R2 버킷(tts/ko/...)에 캐시된 MP3가 있으면 즉시 반환
 * 2) OPENAI_API_KEY가 설정되어 있으면 OpenAI Audio (gpt-4o-mini-tts)로 생성 후 R2에 캐싱하고 반환
 * 3) 아직 키가 없으면 204를 반환해 클라이언트가 내장 오디오/신경망 브라우저 TTS로 폴백하도록 처리
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: TtsRequest;
  try {
    body = await request.json();
  } catch {
    return error('잘못된 요청 형식입니다', 400);
  }

  const text = (body.text ?? '').trim();
  if (!text) return error('읽을 문장(text)이 필요합니다', 400);
  if (text.length > 600) return error('문장이 너무 깁니다 (최대 600자)', 400);

  const style: 'story' | 'mascot' = body.style === 'mascot' ? 'mascot' : 'story';
  const voice = env.OPENAI_TTS_VOICE || 'coral';
  const model = env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';

  const safeCustomKey = body.cacheKey?.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  const hash = await sha256Hex(`${model}:${voice}:${style}:${text}`);
  const r2Key = safeCustomKey ? `tts/ko/${safeCustomKey}-${hash.slice(0, 12)}.mp3` : `tts/ko/${hash}.mp3`;

  // 1. R2 캐시 확인
  try {
    const cached = await env.BUCKET.get(r2Key);
    if (cached) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
          'cache-control': 'public, max-age=31536000, immutable',
          'x-tts-source': 'r2-cache',
        },
      });
    }
  } catch {
    // R2 조회 실패 시 생성 단계로 진행
  }

  // 2. OPENAI_API_KEY 미설정 시 204 No Content 반환 (클라이언트 폴백)
  if (!env.OPENAI_API_KEY) {
    return new Response(null, {
      status: 204,
      headers: { 'x-tts-source': 'no-api-key' },
    });
  }

  // 3. OpenAI Audio Speech API 호출
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        instructions: INSTRUCTIONS[style],
        response_format: 'mp3',
      }),
    });

    if (!res.ok) {
      return json({ fallback: true, status: res.status }, 204);
    }

    const audioBuffer = await res.arrayBuffer();

    // 4. R2 버킷에 비동기/동기 캐싱
    try {
      await env.BUCKET.put(r2Key, audioBuffer, {
        httpMetadata: {
          contentType: 'audio/mpeg',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // 캐시 저장 실패 시에도 오디오 응답은 정상 반환
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'content-type': 'audio/mpeg',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-tts-source': 'openai',
      },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
};

