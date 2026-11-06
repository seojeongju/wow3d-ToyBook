/**
 * 우리 집 책장 1.5단계: 방 사진에서 색을 뽑아 기본 템플릿 색을 바꿈.
 * 사진은 기기(브라우저) 안에서만 쓰고 서버로 보내거나 저장하지 않음. 뽑은 색 3개만 기기에 기억.
 * 뽑은 색은 그대로 쓰지 않고 밝기·채도를 맞춰 점토 파스텔 톤으로 부드럽게 바꿔서 칠함.
 */

/** 사진에서 뽑은 대표 색 (원본 그대로 저장, 칠할 때 파스텔로 조정) */
export interface RoomPalette {
  wall: string;
  main: string;
  accent: string;
}

/** 템플릿 색 이름이 맡는 역할 */
export type ToneRole = 'wall' | 'floor' | 'main' | 'mainLight' | 'accent';
export type Tones = Record<string, [string, string, string]>;

/* ───────── 색 변환 ───────── */
type HSL = [number, number, number]; // h 0~360, s 0~1, l 0~1

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

function hslToHex([h, s, l]: HSL): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 역할에 맞게 밝기·채도를 정해 점토 파스텔 색으로 (아이 화면이 너무 어둡거나 쨍하지 않게) */
function roleColor(hex: string, role: ToneRole): HSL {
  const [h, s] = rgbToHsl(...hexToRgb(hex));
  switch (role) {
    case 'wall':
      return [h, clamp(s, 0.18, 0.45), 0.93];
    case 'floor':
      return [h, clamp(s, 0.2, 0.45), 0.84];
    case 'main':
      return [h, clamp(s, 0.3, 0.55), 0.64];
    case 'mainLight':
      return [h, clamp(s, 0.25, 0.5), 0.9];
    case 'accent':
      return [h, clamp(s, 0.5, 0.72), 0.72];
  }
}

/** 점토 질감용 3단 색 (밝은 면, 바탕, 그늘) */
function clayStops([h, s, l]: HSL): [string, string, string] {
  return [hslToHex([h, s * 0.85, clamp(l + 0.07, 0, 0.97)]), hslToHex([h, s, l]), hslToHex([h, clamp(s + 0.05, 0, 1), clamp(l - 0.14, 0, 1)])];
}

/** 템플릿 기본 색에 사진 색을 역할대로 덮어씀 (역할이 없는 색은 그대로) */
export function applyPalette(tones: Tones, roles: Partial<Record<string, ToneRole>>, palette?: RoomPalette | null): Tones {
  if (!palette) return tones;
  const out: Tones = { ...tones };
  for (const [key, role] of Object.entries(roles)) {
    if (!role || !out[key]) continue;
    const src = role === 'accent' ? palette.accent : role === 'main' || role === 'mainLight' ? palette.main : palette.wall;
    out[key] = clayStops(roleColor(src, role));
  }
  return out;
}

/** 미리 보기 동그라미용 (역할 색 그대로) */
export function swatch(hex: string, role: ToneRole): string {
  return hslToHex(roleColor(hex, role));
}

/* ───────── 사진에서 색 뽑기 (기기 안에서만) ───────── */

function hueGap(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * 사진을 64×64 로 줄여 비슷한 색끼리 5묶음(k-평균)으로 나눈 뒤
 * 가장 넓은 색 = 벽, 그다음 다른 색 = 가구, 가장 선명한 색 = 포인트
 */
export async function extractPalette(file: File): Promise<RoomPalette> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('사진을 열 수 없어요'));
      el.src = url;
    });
    const N = 64;
    const canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('이 기기에서는 색을 읽을 수 없어요');
    ctx.drawImage(img, 0, 0, N, N);
    const data = ctx.getImageData(0, 0, N, N).data;

    const px: [number, number, number][] = [];
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) px.push([data[i], data[i + 1], data[i + 2]]);
    if (px.length < 50) throw new Error('색이 너무 적은 사진이에요');

    // k-평균 (같은 사진이면 같은 결과가 나오도록 고르게 나눠 시작점을 잡음)
    const K = 5;
    let centers = Array.from({ length: K }, (_, i) => [...px[Math.floor(((i + 0.5) * px.length) / K)]] as [number, number, number]);
    const assign = new Array<number>(px.length).fill(0);
    for (let iter = 0; iter < 10; iter++) {
      px.forEach((p, i) => {
        let best = 0;
        let bestD = Infinity;
        centers.forEach((c, k) => {
          const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
          if (d < bestD) {
            bestD = d;
            best = k;
          }
        });
        assign[i] = best;
      });
      const sums = centers.map(() => [0, 0, 0, 0]);
      px.forEach((p, i) => {
        const s = sums[assign[i]];
        s[0] += p[0];
        s[1] += p[1];
        s[2] += p[2];
        s[3]++;
      });
      centers = sums.map((s, k) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[k])) as typeof centers;
    }
    const counts = centers.map((_, k) => assign.filter((a) => a === k).length);
    const clusters = centers
      .map((c, k) => ({ hex: rgbToHex(...c), hsl: rgbToHsl(...c), n: counts[k] }))
      .filter((c) => c.n > 0)
      .sort((a, b) => b.n - a.n);

    const wall = clusters[0];
    const rest = clusters.slice(1);
    // 가구: 벽과 색이나 밝기가 충분히 다른 것 중 가장 넓은 색
    const main = rest.find((c) => hueGap(c.hsl[0], wall.hsl[0]) > 25 || Math.abs(c.hsl[2] - wall.hsl[2]) > 0.15) ?? rest[0] ?? wall;
    // 포인트: 남은 색 중 가장 선명한 색 (없으면 가구 색과 반대쪽 색)
    const others = rest.filter((c) => c !== main);
    const vivid = [...others].sort((a, b) => b.hsl[1] - a.hsl[1])[0];
    const accent = vivid && vivid.hsl[1] > 0.2 ? vivid.hex : hslToHex([(main.hsl[0] + 150) % 360, 0.6, 0.7]);

    return { wall: wall.hex, main: main.hex, accent };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ───────── 아이별 기억 (기기에만) ───────── */
const key = (childId: string) => `toybook.roomPalette.${childId}`;

export function loadPalette(childId: string): RoomPalette | null {
  try {
    const v = JSON.parse(localStorage.getItem(key(childId)) ?? 'null');
    return v && typeof v.wall === 'string' && typeof v.main === 'string' && typeof v.accent === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function savePalette(childId: string, palette: RoomPalette | null) {
  try {
    if (palette) localStorage.setItem(key(childId), JSON.stringify(palette));
    else localStorage.removeItem(key(childId));
  } catch {
    /* 저장 못 해도 이번 화면에는 적용됨 */
  }
}
