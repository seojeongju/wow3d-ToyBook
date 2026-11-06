import { useId } from 'react';

/**
 * 마스코트 "토비" (PRD 8.2): 책 모양 몸통에 3D 프린터 노즐 모자를 쓴 꼬마 로봇.
 * pose="peek" 은 카드 위로 얼굴과 손만 내민 모습(로그인), "wave" 는 전신으로 손 흔드는 모습(대시보드).
 */
export default function Tobi({ pose = 'wave', size = 200 }: { pose?: 'peek' | 'wave'; size?: number }) {
  const u = useId().replace(/:/g, '');
  const id = (k: string) => `${u}${k}`;
  const url = (k: string) => `url(#${id(k)})`;
  const peek = pose === 'peek';

  const head = (
    <g>
      {/* 노즐 모자 */}
      <path d="M86 30 L114 30 L106 6 L94 6 Z" fill={url('hat')} />
      <rect x="80" y="26" width="40" height="10" rx="5" fill={url('hat')} />
      <circle cx="100" cy="4" r="5" fill={url('tip')} />
      {/* 머리 */}
      <rect x="44" y="32" width="112" height="92" rx="42" fill={url('head')} />
      <rect x="58" y="46" width="84" height="64" rx="30" fill={url('face')} />
      {/* 눈: 왼쪽은 뜨고 오른쪽은 윙크 */}
      <ellipse cx="82" cy="74" rx="7" ry="9" fill="#2b2850" />
      <circle cx="84.5" cy="70.5" r="2.6" fill="#fff" />
      <path d="M111 76 q8 -9 16 0" fill="none" stroke="#2b2850" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="72" cy="90" rx="7" ry="4.5" fill="#f6a3a9" opacity="0.7" />
      <ellipse cx="128" cy="90" rx="7" ry="4.5" fill="#f6a3a9" opacity="0.7" />
      <path d="M90 90 q10 13 20 0 z" fill="#2b2850" />
      <path d="M94 95 q6 5 12 0" fill="#f47c8a" />
      {/* 귀 볼트 */}
      <circle cx="44" cy="78" r="9" fill={url('hat')} />
      <circle cx="156" cy="78" r="9" fill={url('hat')} />
    </g>
  );

  if (peek) {
    return (
      <svg width={size} height={size * 0.8} viewBox="0 0 200 160" aria-hidden className="tobi">
        <Defs id={id} />
        {head}
        {/* 카드 가장자리에 걸친 두 손 */}
        <ellipse cx="62" cy="146" rx="22" ry="14" fill={url('head')} />
        <ellipse cx="138" cy="146" rx="22" ry="14" fill={url('head')} />
        <g stroke="#c9b8f6" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
          <path d="M56 140 v8" />
          <path d="M64 139 v9" />
          <path d="M132 139 v9" />
          <path d="M140 140 v8" />
        </g>
      </svg>
    );
  }

  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" aria-hidden className="tobi">
      <Defs id={id} />
      <ellipse cx="100" cy="222" rx="58" ry="7" fill="#5b3fa8" opacity="0.12" />
      {/* 팔: 오른팔은 손 흔들기 */}
      <rect x="22" y="138" width="22" height="46" rx="11" fill={url('head')} transform="rotate(18 33 160)" />
      <rect x="156" y="104" width="22" height="46" rx="11" fill={url('head')} transform="rotate(-30 167 127)" />
      {/* 책 몸통 */}
      <rect x="42" y="122" width="116" height="88" rx="18" fill={url('cover')} />
      <rect x="52" y="128" width="96" height="74" rx="12" fill={url('face')} />
      <rect x="96" y="122" width="8" height="88" rx="4" fill="#6a4cc4" opacity="0.6" />
      <g stroke="#d9cdbf" strokeWidth="3.5" strokeLinecap="round">
        <path d="M62 146 h26" />
        <path d="M62 158 h22" />
        <path d="M112 146 h26" />
        <path d="M112 158 h22" />
      </g>
      <path d="M100 186 c-6 -8 -18 -4 -14 6 c3 6 14 10 14 10 s11 -4 14 -10 c4 -10 -8 -14 -14 -6 z" fill={url('tip')} />
      {/* 발 */}
      <ellipse cx="74" cy="214" rx="16" ry="9" fill={url('hat')} />
      <ellipse cx="126" cy="214" rx="16" ry="9" fill={url('hat')} />
      <g transform="translate(0 -6)">{head}</g>
    </svg>
  );
}

function Defs({ id }: { id: (k: string) => string }) {
  const clay = (k: string, l: string, b: string, d: string) => (
    <radialGradient id={id(k)} cx="32%" cy="26%" r="85%">
      <stop offset="0" stopColor={l} />
      <stop offset="0.55" stopColor={b} />
      <stop offset="1" stopColor={d} />
    </radialGradient>
  );
  return (
    <defs>
      {clay('head', '#f6f1ff', '#ddd0fb', '#b6a2f2')}
      {clay('face', '#fffdf9', '#fbf3ea', '#eadbcb')}
      {clay('hat', '#b9a4f3', '#8e70de', '#6a4cc4')}
      {clay('tip', '#ffd0b8', '#ff9a7a', '#e8714f')}
      {clay('cover', '#b9a4f3', '#8e70de', '#6a4cc4')}
    </defs>
  );
}
