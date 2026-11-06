import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import ClayArt, { type ClayArtName } from './ClayArt';
import { LineIcon } from './Icons';
import { canSpeak, speak, stopSpeaking } from '../speech';

const LINES = [
  '안녕! 나를 누르면 동화 속 친구들이 장난감으로 튀어나와요!',
  '네가 그린 그림도 세상에 하나뿐인 3D 피규어로 변신해!',
  '책 속에서 뿅! 나랑 같이 재미있는 동화책 만들래?',
  '와우쓰리디 장난감 공장에서 진짜 피규어로 만나요!',
];

const SHOWCASE_FRIENDS: { art: ClayArtName; name: string; tag: string }[] = [
  { art: 'dino', name: '꼬마 공룡', tag: '3D 변신 중' },
  { art: 'fairy', name: '치카 요정', tag: '3D 변신 중' },
  { art: 'rabbit', name: '달님 토끼', tag: '3D 변신 중' },
  { art: 'robot', name: '장난감 로봇', tag: '3D 변신 중' },
];

interface Burst {
  id: number;
  x: number;
  y: number;
}

/**
 * 홈 히어로 인터랙티브 마법 스테이지:
 * 1) 상시 둥실둥실 떠다니는 3D 클레이 파츠 & 책에서 피어오르는 빛 입자
 * 2) 마우스/터치 움직임에 반응하는 3D 입체 기울기 (Parallax Tilt)
 * 3) 클릭/터치 시 젤리 점프 + 별가루 폭죽 + 별곰 말풍선 & TTS 음성 인사
 * 4) 좌측 하단 캐릭터 교차 쇼케이스 배지 & 우측 하단 360° 회전 링 배지
 */
export default function HeroArt() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [friendIdx, setFriendIdx] = useState(0);
  const [bouncing, setBouncing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const bounceTimer = useRef<number>();

  // 2.8초마다 변신 친구 쇼케이스 순환
  useEffect(() => {
    const id = window.setInterval(() => {
      setFriendIdx((i) => (i + 1) % SHOWCASE_FRIENDS.length);
    }, 2800);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(bounceTimer.current);
      stopSpeaking();
    };
  }, []);

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 ~ 0.5
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

  const triggerMagic = (e: MouseEvent<HTMLElement>) => {
    const el = stageRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const id = Date.now() + Math.random();
      setBursts((prev) => [...prev.slice(-3), { id, x: isFinite(x) ? x : 55, y: isFinite(y) ? y : 45 }]);
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 900);
    }

    setBouncing(false);
    window.requestAnimationFrame(() => {
      setBouncing(true);
      window.clearTimeout(bounceTimer.current);
      bounceTimer.current = window.setTimeout(() => setBouncing(false), 650);
    });

    const nextIdx = (lineIdx + 1) % LINES.length;
    const text = LINES[lineIdx];
    setLineIdx(nextIdx);

    if (canSpeak) {
      const started = speak(text, {
        force: true,
        onEnd: () => setSpeaking(false),
      });
      setSpeaking(started);
    }
  };

  const friend = SHOWCASE_FRIENDS[friendIdx];

  return (
    <figure className="hero-art-wrap">
      <div
        ref={stageRef}
        className={`hero-stage ${bouncing ? 'is-bouncing' : ''} ${speaking ? 'is-speaking' : ''}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={triggerMagic}
        role="button"
        tabIndex={0}
        aria-label="별곰 피규어 마법 무대 — 누르면 별곰이 인사를 건네고 반짝이가 터져요"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerMagic(e as unknown as MouseEvent<HTMLElement>);
          }
        }}
      >
        {/* 뒤쪽 오로라 후광 */}
        <div className="hero-aura" aria-hidden />

        {/* 메인 3D 클레이 히어로 이미지 카드 */}
        <div className="hero-card-3d">
          <img
            src="/hero-art.webp"
            srcSet="/hero-art-800.webp 800w, /hero-art.webp 1200w"
            sizes="(min-width: 900px) 560px, 92vw"
            alt="책상 위 펼친 그림책에서 귀여운 별곰 3D 피규어와 장난감 블록이 마법처럼 튀어나오는 모습"
            className="hero-art hero-art-img"
            width={1200}
            height={896}
            fetchPriority="high"
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

          {/* 클릭 시 터지는 별가루 폭죽 */}
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

        {/* 상단 별곰 말풍선 (누르면 대사 변경 + 음성 재생) */}
        <div className={`hero-speech ${speaking ? 'speaking' : ''}`} aria-live="polite">
          <span className="hero-speech-icon" aria-hidden>
            <LineIcon name="speaker" size={16} />
          </span>
          <span className="hero-speech-text">{LINES[(lineIdx + LINES.length - 1) % LINES.length]}</span>
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

        {/* 좌측 하단: 동화 속 주인공 3D 변신 쇼케이스 배지 */}
        <div className="hero-friend-showcase" aria-hidden key={friend.art}>
          <div className="hero-friend-avatar">
            <ClayArt name={friend.art} size={46} />
          </div>
          <div className="hero-friend-meta">
            <small>{friend.tag}</small>
            <strong>{friend.name}</strong>
          </div>
        </div>

        {/* 우측 하단: 360° 3D 피규어 회전 배지 */}
        <figcaption className="hero-badge" aria-hidden>
          <span className="hero-spin-ring">
            <LineIcon name="cube" size={16} />
          </span>
          <span>360° 3D 피규어 · 터치해 보세요!</span>
        </figcaption>
      </div>
    </figure>
  );
}
