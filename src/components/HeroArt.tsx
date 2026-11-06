/**
 * 홈 히어로 일러스트: 책상 위 펼친 그림책에서 곰 캐릭터가 튀어나와 피규어가 되는 장면.
 * 점토 질감은 왼쪽 위 광원의 방사형 그라데이션으로 표현.
 */
export default function HeroArt() {
  return (
    <svg viewBox="0 0 560 460" className="hero-art" role="img" aria-label="펼친 그림책에서 곰 캐릭터가 피규어로 튀어나오는 그림">
      <defs>
        <radialGradient id="h-blob" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#efe7ff" />
          <stop offset="1" stopColor="#ddd0fb" />
        </radialGradient>
        <linearGradient id="h-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe7d8" />
          <stop offset="1" stopColor="#f6cdb4" />
        </linearGradient>
        <radialGradient id="h-cover" cx="30%" cy="25%" r="90%">
          <stop offset="0" stopColor="#b9a4f3" />
          <stop offset="0.6" stopColor="#8e70de" />
          <stop offset="1" stopColor="#6a4cc4" />
        </radialGradient>
        <linearGradient id="h-pageL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fffdf9" />
          <stop offset="1" stopColor="#f1e9df" />
        </linearGradient>
        <linearGradient id="h-pageR" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#fffdf9" />
          <stop offset="1" stopColor="#efe6dc" />
        </linearGradient>
        <radialGradient id="h-bear" cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#f8d9b8" />
          <stop offset="0.55" stopColor="#e3a974" />
          <stop offset="1" stopColor="#bf7c47" />
        </radialGradient>
        <radialGradient id="h-belly" cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff6ec" />
          <stop offset="1" stopColor="#f3d6b8" />
        </radialGradient>
        <radialGradient id="h-pot" cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor="#d6c8fb" />
          <stop offset="0.6" stopColor="#a993ea" />
          <stop offset="1" stopColor="#7c62cf" />
        </radialGradient>
        <radialGradient id="h-leaf" cx="35%" cy="30%" r="85%">
          <stop offset="0" stopColor="#b6ebcf" />
          <stop offset="0.6" stopColor="#6cc79c" />
          <stop offset="1" stopColor="#3f9d72" />
        </radialGradient>
        <radialGradient id="h-star" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff0b8" />
          <stop offset="0.6" stopColor="#ffc94d" />
          <stop offset="1" stopColor="#e6a51f" />
        </radialGradient>
        <radialGradient id="h-heart" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffc7cf" />
          <stop offset="0.6" stopColor="#f47c8a" />
          <stop offset="1" stopColor="#d4566a" />
        </radialGradient>
        <radialGradient id="h-mug" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffe0d0" />
          <stop offset="0.6" stopColor="#ffae8f" />
          <stop offset="1" stopColor="#ea8a6c" />
        </radialGradient>
      </defs>

      {/* 뒤 배경 덩어리 */}
      <path d="M90 120 C120 40 250 10 360 40 C470 70 540 150 520 250 C500 340 400 380 290 370 C170 360 60 320 50 230 C45 185 70 160 90 120 Z" fill="url(#h-blob)" />
      <circle cx="470" cy="70" r="12" fill="#d8cbfa" />
      <circle cx="78" cy="300" r="8" fill="#ffd9c9" />

      {/* 책상 */}
      <ellipse cx="290" cy="410" rx="250" ry="22" fill="#5b3fa8" opacity="0.08" />
      <rect x="40" y="350" width="500" height="54" rx="22" fill="url(#h-desk)" />
      <rect x="40" y="350" width="500" height="12" rx="6" fill="#fff3ea" opacity="0.8" />

      {/* 머그컵 */}
      <rect x="72" y="292" width="58" height="62" rx="16" fill="url(#h-mug)" />
      <path d="M130 308 c22 0 22 30 0 30" fill="none" stroke="#ea8a6c" strokeWidth="9" strokeLinecap="round" />
      <path d="M92 318 c4 -6 12 -6 16 0 c4 -6 12 -6 16 0 c0 8 -16 16 -16 16 s-16 -8 -16 -16 z" fill="#fff" opacity="0.75" transform="translate(-8 -6) scale(0.95)" />

      {/* 화분 */}
      <path d="M440 300 c-30 -40 -30 -90 -8 -120 c14 30 22 70 8 120 z" fill="url(#h-leaf)" />
      <path d="M452 300 c10 -50 40 -80 72 -86 c-6 36 -30 70 -72 86 z" fill="url(#h-leaf)" />
      <path d="M436 302 c-30 -24 -60 -30 -84 -22 c20 22 50 32 84 22 z" fill="url(#h-leaf)" />
      <path d="M418 296 h70 l-8 58 a10 10 0 0 1 -10 9 h-34 a10 10 0 0 1 -10 -9 z" fill="url(#h-pot)" />
      <rect x="412" y="290" width="82" height="16" rx="8" fill="#b6a2f2" />

      {/* 펼친 책 */}
      <path d="M150 352 L170 300 L290 312 L410 300 L430 352 L290 364 Z" fill="url(#h-cover)" />
      <path d="M176 340 L190 296 C230 288 268 294 290 308 L290 352 C262 340 220 336 176 340 Z" fill="url(#h-pageL)" />
      <path d="M404 340 L390 296 C350 288 312 294 290 308 L290 352 C318 340 360 336 404 340 Z" fill="url(#h-pageR)" />
      <g stroke="#d9cdbf" strokeWidth="4" strokeLinecap="round">
        <path d="M206 310 L262 316" />
        <path d="M204 322 L258 327" />
        <path d="M318 316 L372 310" />
        <path d="M322 327 L376 322" />
      </g>

      {/* 책에서 피어오르는 반짝임 */}
      <path d="M260 300 C250 260 270 230 262 200" fill="none" stroke="#c9b8f6" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 14" />
      <path d="M322 300 C334 262 314 232 324 196" fill="none" stroke="#ffd9a6" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 14" />

      {/* 곰 피규어 */}
      <g transform="translate(290 210)">
        <ellipse cx="0" cy="98" rx="52" ry="9" fill="#5b3fa8" opacity="0.16" />
        <rect x="-50" y="80" width="100" height="18" rx="9" fill="url(#h-pot)" />
        <ellipse cx="-22" cy="76" rx="16" ry="12" fill="url(#h-bear)" />
        <ellipse cx="22" cy="76" rx="16" ry="12" fill="url(#h-bear)" />
        <ellipse cx="0" cy="40" rx="40" ry="42" fill="url(#h-bear)" />
        <ellipse cx="0" cy="46" rx="25" ry="27" fill="url(#h-belly)" />
        <ellipse cx="-42" cy="30" rx="12" ry="18" fill="url(#h-bear)" transform="rotate(-35 -42 30)" />
        <ellipse cx="44" cy="22" rx="12" ry="18" fill="url(#h-bear)" transform="rotate(40 44 22)" />
        <circle cx="-34" cy="-60" r="16" fill="url(#h-bear)" />
        <circle cx="34" cy="-60" r="16" fill="url(#h-bear)" />
        <circle cx="-34" cy="-60" r="8" fill="#f3c6a3" />
        <circle cx="34" cy="-60" r="8" fill="#f3c6a3" />
        <circle cx="0" cy="-28" r="46" fill="url(#h-bear)" />
        <ellipse cx="0" cy="-14" rx="20" ry="15" fill="url(#h-belly)" />
        <ellipse cx="0" cy="-20" rx="7" ry="5" fill="#3b2a26" />
        <path d="M-7 -8 q7 7 14 0" fill="none" stroke="#3b2a26" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="-17" cy="-36" rx="5" ry="6.5" fill="#3b2a26" />
        <ellipse cx="17" cy="-36" rx="5" ry="6.5" fill="#3b2a26" />
        <circle cx="-15.5" cy="-38.5" r="1.8" fill="#fff" />
        <circle cx="18.5" cy="-38.5" r="1.8" fill="#fff" />
        <ellipse cx="-30" cy="-16" rx="7" ry="4.5" fill="#f6a3a9" opacity="0.65" />
        <ellipse cx="30" cy="-16" rx="7" ry="4.5" fill="#f6a3a9" opacity="0.65" />
      </g>

      {/* 떠 있는 별·하트 */}
      <path d="M150 140 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 z" fill="url(#h-star)" />
      <path d="M418 128 l5 10 11 1.6 -8 7.6 2 11 -10 -5.4 -10 5.4 2 -11 -8 -7.6 11 -1.6 z" fill="url(#h-star)" />
      <path d="M392 214 c6 -10 20 -10 24 0 c4 -10 18 -10 24 0 c2 14 -24 28 -24 28 s-26 -14 -24 -28 z" fill="url(#h-heart)" transform="scale(0.85) translate(70 30)" />
      <circle cx="200" cy="96" r="5" fill="#ffc94d" />
      <circle cx="372" cy="86" r="4" fill="#a993ea" />
    </svg>
  );
}
