import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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

/**
 * 부모 잠금 (PRD 9.4 보조 방식): 글자로 쓴 두 자리 덧셈 문제를 풀면 부모 대시보드로 이동.
 * 결제·주문 같은 민감한 동작은 서버에서 부모 PIN 으로 따로 확인해야 함 (MVP 1)
 */
export default function ParentGate() {
  const navigate = useNavigate();
  const [q, setQ] = useState(newQuestion);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  if (isParentUnlocked()) return <Navigate to="/dashboard" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Number(answer) === q.a + q.b) {
      setParentUnlocked(true);
      navigate('/dashboard');
    } else {
      setWrong(true);
      setAnswer('');
      setQ(newQuestion());
    }
  };

  return (
    <main className="screen center">
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
      <Link to="/profiles" className="parent-link">
        ← 돌아가기
      </Link>
    </main>
  );
}
