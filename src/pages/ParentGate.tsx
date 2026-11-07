import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { unlockWithPin, useMe } from '../auth';
import { SubHeader } from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import { isParentUnlocked, setParentUnlocked } from '../parentLock';

const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

/** 11~99 를 한글 숫자로: 37 → "삼십칠" (아이가 숫자만 보고 풀지 못하게) */
function toKoreanNumber(n: number): string {
  const tens = Math.floor(n / 10);
  return `${tens === 1 ? '' : DIGITS[tens]}십${DIGITS[n % 10]}`;
}

function newQuestion() {
  const a = 11 + Math.floor(Math.random() * 79);
  const b = 11 + Math.floor(Math.random() * 79);
  return { a, b };
}

/** 들어간 뒤 갈 곳은 부모 화면 안 경로만 */
function safeNext(v: string | null): string {
  return v && v.startsWith('/dashboard') ? v : '/dashboard';
}

/**
 * 부모 잠금 (PRD 9.4).
 * - 부모 PIN 을 만든 계정: 숫자 4자리를 서버에서 확인 (5번 틀리면 10분 잠금), 맞으면 30분 동안 부모 모드
 * - PIN 이 없거나 로그인 전(데모): 글자로 쓴 두 자리 덧셈 문제
 */
export default function ParentGate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { loading, user } = useMe();

  if (loading) {
    return (
      <main className="screen gate-screen">
        <SubHeader />
        <div className="gate-body" aria-busy="true" />
      </main>
    );
  }

  const needPin = user?.status === 'active' && user.hasPin;
  if (isParentUnlocked() && (!needPin || user?.unlocked)) return <Navigate to={next} replace />;

  const enter = () => {
    setParentUnlocked(true);
    navigate(next, { replace: true });
  };

  return (
    <main className="screen gate-screen">
      <SubHeader />
      <div className="gate-body">
        {needPin ? <PinGate onPass={enter} /> : <MathGate onPass={enter} />}
        <Link to="/profiles" className="parent-link">
          ← 돌아가기
        </Link>
      </div>
    </main>
  );
}

function MathGate({ onPass }: { onPass: () => void }) {
  const [q, setQ] = useState(newQuestion);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Number(answer) === q.a + q.b) return onPass();
    setWrong(true);
    setAnswer('');
    setQ(newQuestion());
  };

  return (
    <form className="gate" onSubmit={submit}>
      <Tobi pose="peek" size={120} />
      <h1 className="title-sm">어른만 들어올 수 있어요</h1>
      <label htmlFor="gate-answer" className="gate-q">
        {toKoreanNumber(q.a)} 더하기 {toKoreanNumber(q.b)}, 얼마일까요?
      </label>
      <input
        id="gate-answer"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value.replace(/\D/g, ''));
          setWrong(false);
        }}
        autoFocus
      />
      {wrong && <p className="error">다시 계산해 주세요</p>}
      <button className="primary-btn" type="submit" disabled={!answer}>
        확인
      </button>
    </form>
  );
}

/** 부모 PIN 숫자판: 4자리를 다 누르면 바로 확인 */
export function PinGate({ onPass }: { onPass: () => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const press = async (d: string) => {
    if (busy) return;
    const v = (pin + d).slice(0, 4);
    setPin(v);
    setError(null);
    if (v.length < 4) return;
    setBusy(true);
    try {
      await unlockWithPin(v);
      onPass();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PIN 을 확인하지 못했어요');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate pin-gate">
      <Tobi pose="peek" size={110} />
      <h1 className="title-sm">부모 PIN 을 눌러 주세요</h1>
      <div className="pin-dots" aria-label={`${pin.length}자리 입력함`} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} disabled={busy}>
            {d}
          </button>
        ))}
        <button type="button" className="pin-del" onClick={() => setPin((v) => v.slice(0, -1))} disabled={busy || !pin} aria-label="한 자리 지우기">
          지우기
        </button>
        <button type="button" onClick={() => press('0')} disabled={busy}>
          0
        </button>
      </div>
      <p className="pin-help">PIN 을 잊으셨다면 고객센터에 문의해 주세요.</p>
    </div>
  );
}
