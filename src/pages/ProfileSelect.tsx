import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Child } from '../api';
import ClayArt, { ClayEmoji, type ClayArtName } from '../components/ClayArt';
import { LineIcon } from '../components/Icons';
import { Logo } from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import { canSpeak, isSoundOn, setSoundOn, speak, stopSpeaking, timeGreeting } from '../speech';
import { useAsync } from '../useAsync';

// PRD 8.5 연령별 모드 배지
const MODE: Record<Child['age_mode'], { art: ClayArtName; label: string }> = {
  sprout: { art: 'chick', label: '새싹' },
  kid: { art: 'sprout', label: '꼬마 작가' },
  author: { art: 'tree', label: '작가' },
};

// 카드마다 다른 파스텔 바탕 (순서대로 돌려 씀)
const TONES = ['lavender', 'peach', 'mint', 'yellow', 'pink'];

const GUIDE = { title: '누가 볼까요?', sub: '내 얼굴을 눌러 주세요' };
const say = (b: typeof GUIDE) => `${b.title} ${b.sub}`;

/** 이름 뒤 부르는 말: 받침 있으면 "아", 없으면 "야" (하은아, 민지야) */
function callName(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangul) return `${name},`;
  return (last - 0xac00) % 28 === 0 ? `${name}야` : `${name}아`;
}

export default function ProfileSelect() {
  const navigate = useNavigate();
  const children = useAsync(api.children, []);
  const [sound, setSound] = useState(isSoundOn);
  const [talking, setTalking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [bubble, setBubble] = useState(GUIDE);
  const leaveTimer = useRef<number>();

  // 화면을 떠나면 말하기·이동 예약 정리
  useEffect(
    () => () => {
      stopSpeaking();
      window.clearTimeout(leaveTimer.current);
    },
    [],
  );

  const sayGuide = () => {
    setBubble(GUIDE);
    setTalking(speak(say(GUIDE), { force: true, onEnd: () => setTalking(false) }));
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundOn(next);
    setTalking(false);
  };

  const enter = (c: Child) => {
    if (picked) return;
    setPicked(c.id);
    const hello = { title: `${callName(c.nickname)} 반가워!`, sub: '책장으로 가 볼까?' };
    setBubble(hello);
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      navigate(`/shelf/${c.id}`);
    };
    // 인사가 끝나면 이동, 소리가 없거나 길어져도 1.8초 안에는 이동
    const spoke = speak(say(hello), { onEnd: go });
    setTalking(spoke);
    leaveTimer.current = window.setTimeout(go, spoke ? 1800 : 600);
  };

  return (
    <main className="screen who">
      <header className="who-top">
        <Logo variant="hero" />
        {canSpeak && (
          <button
            className={`sound-toggle ${sound ? 'on' : ''}`}
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? '소리 끄기' : '소리 켜기'}
          >
            <LineIcon name={sound ? 'speaker' : 'mute'} size={22} />
            <span>{sound ? '소리 켜짐' : '소리 꺼짐'}</span>
          </button>
        )}
      </header>

      <section className="who-guide">
        <div className={`who-tobi ${talking ? 'talking' : ''}`}>
          <Tobi pose="wave" size={120} />
        </div>
        <div className="who-bubble">
          <span className="who-greeting">{timeGreeting()}!</span>
          <div aria-live="polite">
            <h1 className="who-title">{bubble.title}</h1>
            <p className="who-sub">{bubble.sub}</p>
          </div>
          {canSpeak && (
            <button className="listen-btn" onClick={sayGuide} aria-label="안내 듣기">
              <LineIcon name="speaker" size={22} />
              들려줘
            </button>
          )}
        </div>
      </section>

      {children.status === 'loading' && (
        <div className="who-grid" aria-busy="true" aria-label="불러오는 중">
          {[0, 1].map((i) => (
            <span key={i} className="who-card skeleton" />
          ))}
        </div>
      )}

      {children.status === 'error' && (
        <div className="who-empty">
          <ClayArt name="robot" size={110} />
          <p>앗, 친구들을 불러오지 못했어요.</p>
          <button className="pill-btn small-pill" onClick={() => window.location.reload()}>
            다시 해 보기
          </button>
        </div>
      )}

      {children.status === 'ok' && (
        <div className="who-grid">
          {children.data.map((c, i) => {
            const mode = MODE[c.age_mode];
            return (
              <button
                key={c.id}
                className={`who-card tone-${TONES[i % TONES.length]} ${picked === c.id ? 'picked' : ''} ${picked && picked !== c.id ? 'dim' : ''}`}
                onClick={() => enter(c)}
                aria-label={`${c.nickname} 책장 열기`}
                disabled={!!picked}
              >
                <span className="who-face">
                  <ClayEmoji emoji={c.avatar} size={120} />
                </span>
                <span className="who-name">{c.nickname}</span>
                <span className="who-mode">
                  <ClayArt name={mode.art} size={22} />
                  {mode.label}
                </span>
              </button>
            );
          })}

          <Link to="/parent" className="who-card who-add" aria-label="어른과 함께 친구 추가하기">
            <span className="who-plus" aria-hidden>
              +
            </span>
            <span className="who-name">친구 추가</span>
            <span className="who-mode">어른과 함께</span>
          </Link>
        </div>
      )}

      {children.status === 'ok' && children.data.length === 0 && (
        <p className="who-hint">아직 친구가 없어요. 어른에게 "친구 추가"를 부탁해 보세요.</p>
      )}

      <Link to="/parent" className="parent-corner" aria-label="부모 모드 (어른만)">
        <LineIcon name="lock" size={22} />
        <span>어른만</span>
      </Link>
    </main>
  );
}
