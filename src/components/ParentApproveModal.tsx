import { useState, type FormEvent } from 'react';
import { type Me, useMe } from '../auth';
import { isParentUnlocked, setParentUnlocked } from '../parentLock';
import { PinGate } from '../pages/ParentGate';
import Tobi from './Tobi';

const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

function toKoreanNumber(n: number): string {
  const tens = Math.floor(n / 10);
  return `${tens === 1 ? '' : DIGITS[tens]}십${DIGITS[n % 10]}`;
}

function makeMathQuiz() {
  const a = 12 + Math.floor(Math.random() * 45);
  const b = 11 + Math.floor(Math.random() * 38);
  return { a, b };
}

/** 현재 세션에서 부모 승인이 이미 완료되어 있는지 검사 */
export function isParentActionReady(user: Me | null): boolean {
  if (user?.status === 'active' && user.hasPin) {
    return Boolean(user.unlocked) && isParentUnlocked();
  }
  return isParentUnlocked();
}

/** 동화책 고유 링크 공유 유틸리티 (모바일 기본 공유 시트 + 클립보드 복사) */
export async function shareBookLink(bookId: string, title: string): Promise<string> {
  const url = `${window.location.origin}/book/${encodeURIComponent(bookId)}`;
  const shareText = `📚 우리 아이 동화책 '${title}' — 토이북 동화 극장에서 함께 읽어 보세요!`;
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: `토이북 · ${title}`, text: shareText, url });
      return `✨ '${title}' 공유 창을 열었어요!`;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return '';
      }
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return `🔗 '${title}' 동화 링크를 복사했어요! 가족·친구에게 붙여넣기 해 보세요.`;
  } catch {
    window.prompt('아래 동화책 주소를 복사해 공유해 보세요!', url);
    return `🔗 '${title}' 동화 링크를 준비했어요!`;
  }
}

interface Props {
  actionLabel?: string;
  onApproved: () => void;
  onClose: () => void;
}

/**
 * 출품·별 코인 사용·충전·피규어 주문 전 보호자 확인 모달 (아이 실수 방지)
 * - PIN 설정 계정: 서버 4자리 PIN 검증(PinGate)
 * - PIN 미설정 / 데모 계정: 한글 숫자 두 자리 덧셈 확인
 */
export default function ParentApproveModal({
  actionLabel = '보호자 확인이 필요한 기능이에요',
  onApproved,
  onClose,
}: Props) {
  const { user, reload } = useMe();
  const needPin = user?.status === 'active' && user.hasPin;
  const [quiz, setQuiz] = useState(makeMathQuiz);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  const handlePass = () => {
    setParentUnlocked(true);
    reload();
    onApproved();
  };

  const handleMathSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (Number(answer) === quiz.a + quiz.b) {
      handlePass();
      return;
    }
    setWrong(true);
    setAnswer('');
    setQuiz(makeMathQuiz());
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="보호자 승인 확인"
      onClick={onClose}
    >
      <div className="modal-card approve-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="publish-modal-header">
          <div>
            <h2>🔒 보호자 승인이 필요해요</h2>
            <p>{actionLabel}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <div className="approve-modal-body">
          {needPin ? (
            <PinGate onPass={handlePass} />
          ) : (
            <form className="gate approve-math-form" onSubmit={handleMathSubmit}>
              <Tobi pose="peek" size={96} />
              <p className="approve-guide">
                아이가 실수로 코인을 쓰거나 외부에 책을 공개하지 않도록 어른이 확인해 주세요.
                <br />
                <small>(한 번 확인하면 30분 동안 유지돼요)</small>
              </p>
              <label htmlFor="approve-math-input" className="gate-q">
                {toKoreanNumber(quiz.a)} 더하기 {toKoreanNumber(quiz.b)}, 얼마일까요?
              </label>
              <input
                id="approve-math-input"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="숫자로 입력"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value.replace(/\D/g, ''));
                  setWrong(false);
                }}
                autoFocus
              />
              {wrong && <p className="error">정답이 아니에요. 새 문제를 다시 계산해 주세요!</p>}
              <div className="publish-actions">
                <button type="button" className="pill-btn alt small-pill" onClick={onClose}>
                  취소
                </button>
                <button type="submit" className="pill-btn small-pill" disabled={!answer}>
                  보호자 확인 완료
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

