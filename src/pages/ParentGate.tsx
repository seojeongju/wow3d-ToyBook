import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { LineIcon } from '../components/Icons';
import { useAsync } from '../useAsync';

const UNLOCK_KEY = 'toybook.parentUnlocked';

const AGE_MODE_LABEL = { sprout: '🐣 새싹', kid: '🌱 꼬마 작가', author: '🌳 작가' } as const;

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

function isUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * 부모 잠금 (PRD 9.4 보조 방식): 글자로 쓴 두 자리 덧셈 문제.
 * 결제·주문 같은 민감한 동작은 서버에서 부모 PIN 으로 따로 확인해야 함 (MVP 1)
 */
export default function ParentGate() {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [q, setQ] = useState(newQuestion);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Number(answer) === q.a + q.b) {
      try {
        sessionStorage.setItem(UNLOCK_KEY, '1');
      } catch {
        /* 저장 못 해도 이번 화면에서는 열림 */
      }
      setUnlocked(true);
    } else {
      setWrong(true);
      setAnswer('');
      setQ(newQuestion());
    }
  };

  const lock = () => {
    try {
      sessionStorage.removeItem(UNLOCK_KEY);
    } catch {
      /* noop */
    }
    setUnlocked(false);
    setQ(newQuestion());
  };

  if (!unlocked) {
    return (
      <main className="screen center">
        <h1 className="title-sm">어른만 들어올 수 있어요</h1>
        <form className="gate" onSubmit={submit}>
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

  return <ParentHome onLock={lock} />;
}

function ParentHome({ onLock }: { onLock: () => void }) {
  const children = useAsync(api.children, []);
  const books = useAsync(() => api.books(), []);

  return (
    <main className="screen">
      <header className="topbar">
        <Link to="/" className="icon-btn" aria-label="처음으로">
          <LineIcon name="home" />
        </Link>
        <h1 className="title-sm">부모 모드</h1>
        <button className="icon-btn" onClick={onLock} aria-label="잠그기">
          <LineIcon name="lock" />
        </button>
      </header>

      <section className="panel">
        <h2>아이 프로필</h2>
        {children.status === 'ok' ? (
          <ul className="list">
            {children.data.map((c) => (
              <li key={c.id}>
                <span aria-hidden>{c.avatar}</span> {c.nickname}
                <span className="muted small"> · {AGE_MODE_LABEL[c.age_mode]} 모드</span>
                {c.birth_year && <span className="muted small"> · {c.birth_year}년생</span>}
                {c.likes && <span className="muted small"> · 좋아하는 것: {c.likes}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">불러오는 중…</p>
        )}
      </section>

      <section className="panel">
        <h2>만든 책</h2>
        <p>{books.status === 'ok' ? `${books.data.length}권` : '…'}</p>
      </section>

      <section className="panel muted">
        <h2>곧 추가돼요</h2>
        <ul className="list">
          <li>카카오 로그인 · 부모 PIN · 아이 프로필 추가/수정</li>
          <li>AI로 책 만들기 (이야기 공방)</li>
          <li>"갖고 싶어요" 승인 · 피규어 주문 · 주문 상태</li>
        </ul>
      </section>
    </main>
  );
}
