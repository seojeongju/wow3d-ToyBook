// 원본 이미지(브랜드·히어로)를 화면용 WebP 와 공유용 이미지로 변환. 원본을 바꾸면 다시 실행: node scripts/optimize-images.mjs
// - hero-art.jpg → hero-art.webp(1200) · hero-art-800.webp (첫 화면 큰 그림, LCP)
// - logo.jpg → logo-440.webp (프로필 화면 로고, 표시 220px의 2배)
// - og-image.jpg 1200×630 (카카오톡·SNS·검색 공유 미리보기)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// 원본은 배포되지 않는 brand/ 폴더에 두고, 결과만 public/ 에 씀
const SRC = path.resolve('brand');
const PUB = path.resolve('public');
const src = (f) => path.join(SRC, f);
const p = (f) => path.join(PUB, f);
const kb = (f) => `${(fs.statSync(p(f)).size / 1024).toFixed(0)}KB`;

await sharp(src('hero-art.jpg')).resize({ width: 1200 }).webp({ quality: 80 }).toFile(p('hero-art.webp'));
await sharp(src('hero-art.jpg')).resize({ width: 800 }).webp({ quality: 78 }).toFile(p('hero-art-800.webp'));
await sharp(src('logo.jpg')).resize({ width: 440 }).webp({ quality: 82 }).toFile(p('logo-440.webp'));

// 공유 이미지: 왼쪽 로고, 오른쪽 한 줄 소개 (한글은 시스템 글꼴로 그림 — 한 번 만들어 저장소에 보관)
const W = 1200;
const H = 630;
const bg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F3ECFE"/>
      <stop offset="0.6" stop-color="#FCF7F3"/>
      <stop offset="1" stop-color="#FFE7DD"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <circle cx="1120" cy="70" r="150" fill="#E6DCFC" opacity="0.7"/>
  <circle cx="80" cy="600" r="170" fill="#FFE2D4" opacity="0.7"/>
  <rect x="40" y="55" width="520" height="520" rx="64" fill="#FFFDFB"/>
  <g font-family="Malgun Gothic, 'Apple SD Gothic Neo', sans-serif" fill="#2B2850">
    <text x="610" y="190" font-size="30" font-weight="700" fill="#6D50C9">3~12세 우리 아이 맞춤 그림책</text>
    <text x="610" y="275" font-size="62" font-weight="800">세상에 단 한 권,</text>
    <text x="610" y="355" font-size="62" font-weight="800">우리 아이 그림책</text>
    <text x="610" y="430" font-size="30" font-weight="600" fill="#78749B">AI 동화 만들기 · 읽어 주기 · 3D 피규어</text>
    <rect x="610" y="470" width="300" height="64" rx="32" fill="#8B6FDC"/>
    <text x="760" y="512" font-size="28" font-weight="700" fill="#FFFFFF" text-anchor="middle">와우쓰리디 토이북</text>
  </g>
</svg>`);
const logo = await sharp(src('logo.jpg')).resize(480, 480).toBuffer();
await sharp(bg)
  .composite([{ input: logo, left: 60, top: 75 }])
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(p('og-image.jpg'));

console.log(`hero-art.webp ${kb('hero-art.webp')} · hero-art-800.webp ${kb('hero-art-800.webp')} · logo-440.webp ${kb('logo-440.webp')} · og-image.jpg ${kb('og-image.jpg')} (원본은 brand/)`);
