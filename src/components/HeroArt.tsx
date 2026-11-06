import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import ClayArt, { type ClayArtName } from './ClayArt';
import { LineIcon } from './Icons';
import { canSpeak, speak, stopSpeaking } from '../speech';

type HeroCharId = 'star' | 'rabbit' | 'dino' | 'robot' | 'fairy';

interface HeroCharacter {
  id: HeroCharId;
  name: string;
  badge: string;
  art: ClayArtName;
  image: string;
  alt: string;
  tone: 'yellow' | 'pink' | 'mint' | 'lavender' | 'peach';
  lines: string[];
}

const HERO_CHARACTERS: HeroCharacter[] = [
  {
    id: 'star',
    name: '반짝 별곰',
    badge: '기본 주인공',
    art: 'star',
    image: '/hero-art.jpg',
    alt: '책상 위 펼친 그림책에서 귀여운 별곰 3D 피규어와 장난감 블록이 마법처럼 튀어나오는 모습',
    tone: 'yellow',
    lines: [
      '안녕! 나를 누르면 동화 속 친구들이 장난감으로 튀어나와요!',
      '반가워! 나는 반짝반짝 별곰이야! 책 속에서 장난감으로 튀어나왔어!',
      '네가 그린 그림도 세상에 하나뿐인 3D 피규어로 변신해!',
      '책 속에서 뿅! 나랑 같이 재미있는 동화책 만들래?',
    ],
  },
  {
    id: 'rabbit',
    name: '달님 토끼',
    badge: '새싹 동화',
    art: 'rabbit',
    image: '/hero-rabbit.jpg',
    alt: '책상 위 펼친 그림책에서 초승달을 안은 귀여운 달님 토끼 3D 피규어가 튀어나오는 모습',
    tone: 'pink',
    lines: [
      '깡총깡총 안녕! 나는 달님 토끼야! 오늘 밤 어떤 동화를 만들어 볼까?',
      '내 귀엽고 긴 귀도 3D 프린터로 똑같이 만들어 줘요!',
      '와우쓰리디 장난감 공장에서 진짜 피규어로 만나요!',
    ],
  },
  {
    id: 'dino',
    name: '꼬마 공룡',
    badge: '모험 동화',
    art: 'dino',
    image: '/hero-dino.jpg',
    alt: '책상 위 펼친 그림책에서 손을 흔드는 귀여운 민트색 꼬마 공룡 3D 피규어가 튀어나오는 모습',
    tone: 'mint',
    lines: [
      '크앙! 반가워! 나는 꼬마 공룡이야! 신나는 모험 동화를 만들자!',
      '블록으로 만든 공룡 친구도 진짜 장난감 피규어로 변신해!',
      '네가 그린 그림도 세상에 하나뿐인 3D 피규어로 변신해!',
    ],
  },
  {
    id: 'robot',
    name: '장난감 로봇',
    badge: '우주 모험',
    art: 'robot',
    image: '/hero-robot.jpg',
    alt: '책상 위 펼친 그림책에서 귀여운 하늘색 장난감 로봇 3D 피규어가 튀어나오는 모습',
    tone: 'lavender',
    lines: [
      '삐빅! 안녕! 나는 장난감 로봇이야! 우주 끝까지 날아가 볼까?',
      '내 멋진 로봇 팔과 날개도 3D 프린터로 뚝딱 만들어 줘요!',
      '와우쓰리디 장난감 공장에서 진짜 피규어로 만나요!',
    ],
  },
  {
    id: 'fairy',
    name: '치카 요정',
    badge: '습관 동화',
    art: 'fairy',
    image: '/hero-fairy.jpg',
    alt: '책상 위 펼친 그림책에서 요술 지팡이를 든 귀여운 치카 요정 3D 피규어가 튀어나오는 모습',
    tone: 'peach',
    lines: [
      '반짝반짝 안녕! 나는 치카 요정이야! 오늘도 이가 반짝반짝 빛나네!',
      '요술 칫솔을 흔들면 동화 속 요정 친구가 장난감으로 튀어나와요!',
      '책 속에서 뿅! 나랑 같이 재미있는 동화책 만들래?',
    ],
  },
];

interface Burst {
  id: number;
  x: number;
  y: number;
}

/**
 * 홈 히어로 인터랙티브 마법 스테이지:
 * 1) 하단 캐릭터 버튼(별곰 · 달님 토끼 · 꼬마 공룡)을 누르면 메인 3D 피규어 캐릭터가 즉시 변신!
 * 2) 상시 둥실둥실 떠다니는 3D 클레이 파츠 & 책에서 피어오르는 빛 입자
 * 3) 마우스/터치 움직임에 반응하는 3D 입체 기울기 (Parallax Tilt)
 * 4) 클릭/터치 시 젤리 점프 + 별가루 폭죽 + 캐릭터별 말풍선 & 신경망 성우 음성 인사
 */
export default function HeroArt() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [charId, setCharId] = useState<HeroCharId>('star');
  const [lineIdx, setLineIdx] = useState(0);
  const [currentSpeech, setCurrentSpeech] = useState(HERO_CHARACTERS[0].lines[0]);
  const [bouncing, setBouncing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const bounceTimer = useRef<number>();

  const activeChar = HERO_CHARACTERS.find((c) => c.id === charId) ?? HERO_CHARACTERS[0];

  // 달님 토끼·꼬마 공룡 이미지 미리 로드 (클릭 시 지연 없이 즉시 전환)
  useEffect(() => {
    HERO_CHARACTERS.forEach((c) => {
      const img = new Image();
      img.src = c.image;
    });
    return () => {
      window.clearTimeout(bounceTimer.current);
      stopSpeaking();
    };
  }, []);

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tilt-x', `${(-ny * 10).toFixed(2)}deg`);
    el.style.setProperty('--tilt-y', `${(nx * 12).toFixed(2)}deg`);
    el.style.setProperty('--shift-x', `${(nx * 18).toFixed(1)}px`);
    el.style.setProperty('--shift-y', `${(ny * 18).toFixed(1)}px`);
  };

  const handlePointerLeave = () => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
    el.style.setProperty('--shift-x', '0px');
    el.style.setProperty('--shift-y', '0px');
  };

  const spawnBurst = (xPct = 52, yPct = 44) => {
    const id = Date.now() + Math.random();
    setBursts((prev) => [...prev.slice(-3), { id, x: xPct, y: yPct }]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 900);
  };

  const triggerBounceAndSpeak = (text: string) => {
    setBouncing(false);
    window.requestAnimationFrame(() => {
      setBouncing(true);
      window.clearTimeout(bounceTimer.current);
      bounceTimer.current = window.setTimeout(() => setBouncing(false), 650);
    });

    setCurrentSpeech(text);
    if (canSpeak) {
      const started = speak(text, {
        force: true,
        style: 'mascot',
        onEnd: () => setSpeaking(false),
      });
      setSpeaking(started);
    }
  };

  const handleStageClick = (e: MouseEvent<HTMLElement>) => {
    const el = stageRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      spawnBurst(isFinite(x) ? x : 52, isFinite(y) ? y : 44);
    }

    const nextIdx = (lineIdx + 1) % activeChar.lines.length;
    const text = activeChar.lines[lineIdx % activeChar.lines.length];
    setLineIdx(nextIdx);
    triggerBounceAndSpeak(text);
  };

  const selectCharacter = (e: MouseEvent<HTMLButtonElement>, target: HeroCharacter) => {
    e.stopPropagation();
    spawnBurst(52, 42);
    setCharId(target.id);
    setLineIdx(1);
    triggerBounceAndSpeak(target.lines[0]);
  };

  return (
    <figure className="hero-art-wrap">
      <div
        ref={stageRef}
        className={`hero-stage ${bouncing ? 'is-bouncing' : ''} ${speaking ? 'is-speaking' : ''}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleStageClick}
        role="button"
        tabIndex={0}
        aria-label={`${activeChar.name} 3D 피규어 마법 무대 — 누르면 인사를 건네고 아래 버튼으로 캐릭터를 바꿀 수 있어요`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleStageClick(e as unknown as MouseEvent<HTMLElement>);
          }
        }}
      >
        {/* 뒤쪽 오로라 후광 */}
        <div className="hero-aura" aria-hidden />

        {/* 메인 3D 클레이 히어로 이미지 카드 (캐릭터 전환 시 팝 애니메이션) */}
        <div className="hero-card-3d">
          <img
            key={activeChar.id}
            src={activeChar.image}
            alt={activeChar.alt}
            className="hero-art hero-art-img hero-char-swap"
            width={1200}
            height={900}
          />

          {/* 동화책에서 피어오르는 마법 빛 방울 6개 */}
          <div className="hero-particles" aria-hidden>
            <span className="p p1" />
            <span className="p p2" />
            <span className="p p3" />
            <span className="p p4" />
            <span className="p p5" />
            <span className="p p6" />
          </div>

          {/* 클릭/변신 시 터지는 별가루 폭죽 */}
          {bursts.map((b) => (
            <div key={b.id} className="hero-burst" style={{ left: `${b.x}%`, top: `${b.y}%` }} aria-hidden>
              <i className="b1">★</i>
              <i className="b2">✦</i>
              <i className="b3">♥</i>
              <i className="b4">★</i>
              <i className="b5">✦</i>
              <i className="b6">●</i>
              <i className="b7">★</i>
              <i className="b8">♥</i>
            </div>
          ))}
        </div>

        {/* 상단 캐릭터 말풍선 (누르면 대사 변경 + 음성 재생) */}
        <div className={`hero-speech ${speaking ? 'speaking' : ''}`} aria-live="polite">
          <span className="hero-speech-icon" aria-hidden>
            <LineIcon name="speaker" size={16} />
          </span>
          <span className="hero-speech-text">{currentSpeech}</span>
          <span className="hero-speech-tap">눌러 봐요!</span>
        </div>

        {/* 둥실둥실 떠다니는 3D 클레이 파츠들 (Parallax Layer) */}
        <div className="hero-floater fl-blocks" aria-hidden>
          <ClayArt name="blocks" size={56} />
        </div>
        <div className="hero-floater fl-sparkles" aria-hidden>
          <ClayArt name="sparkles" size={52} />
        </div>
        <div className="hero-floater fl-star" aria-hidden>
          <ClayArt name="star" size={44} />
        </div>
        <div className="hero-floater fl-heart" aria-hidden>
          <ClayArt name="heart" size={40} />
        </div>

        {/* 하단: 클릭해서 캐릭터를 바꾸는 3D 주인공 변신 선택 바 */}
        <div
          className="hero-char-picker"
          role="group"
          aria-label="책 속 주인공 3D 캐릭터 바꿔 보기"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="hero-picker-label">주인공 변신</span>
          {HERO_CHARACTERS.map((c) => {
            const on = c.id === activeChar.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`hero-char-btn tone-${c.tone} ${on ? 'active' : ''}`}
                aria-pressed={on}
                onClick={(e) => selectCharacter(e, c)}
              >
                <span className="hero-char-avatar" aria-hidden>
                  <ClayArt name={c.art} size={26} />
                </span>
                <span className="hero-char-name">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
