import { useState, type FormEvent } from 'react';
import { marketApi, type MarketKind, type MarketWallet, type MyMarketBook } from '../api';
import ClayArt, { ClayEmoji } from './ClayArt';
import { LineIcon } from './Icons';

const CATEGORIES = ['모험', '생활습관', '우주·과학', '잠자리', '감정'] as const;
const PRICE_PRESETS = [300, 500, 700, 1000] as const;
const RENT_DAYS_PRESETS = [7, 14, 30] as const;

interface Props {
  books: MyMarketBook[];
  initialBookId?: string;
  defaultAuthorName?: string;
  onClose: () => void;
  onSuccess: (msg: string, wallet: MarketWallet) => void;
}

export default function PublishModal({
  books,
  initialBookId,
  defaultAuthorName = '꼬마 작가',
  onClose,
  onSuccess,
}: Props) {
  const initialBook = books.find((b) => b.id === initialBookId) ?? books[0];
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBook?.id ?? '');
  const currentBook = books.find((b) => b.id === selectedBookId) ?? initialBook;

  const [kind, setKind] = useState<MarketKind>(currentBook?.market_kind ?? 'both');
  const [price, setPrice] = useState<number>(currentBook?.market_price || 500);
  const [rentDays, setRentDays] = useState<number>(currentBook?.market_rent_days || 7);
  const [category, setCategory] = useState<string>(currentBook?.market_category || '모험');
  const [authorName, setAuthorName] = useState<string>(currentBook?.market_author_name || defaultAuthorName);
  const [summary, setSummary] = useState<string>(
    currentBook?.market_summary || (currentBook ? `${currentBook.title} — 상상력이 반짝이는 우리 아이 창작 그림책이에요.` : ''),
  );
  const [status, setStatus] = useState<'published' | 'hidden'>(currentBook?.market_status ?? 'published');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleBookChange = (nextId: string) => {
    setSelectedBookId(nextId);
    const found = books.find((b) => b.id === nextId);
    if (!found) return;
    setKind(found.market_kind ?? 'both');
    setPrice(found.market_price || 500);
    setRentDays(found.market_rent_days || 7);
    setCategory(found.market_category || '모험');
    setAuthorName(found.market_author_name || defaultAuthorName);
    setSummary(found.market_summary || `${found.title} — 상상력이 반짝이는 우리 아이 창작 그림책이에요.`);
    setStatus(found.market_status ?? 'published');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentBook) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await marketApi.publish({
        bookId: currentBook.id,
        kind,
        price: kind === 'library' ? 0 : price,
        rentDays,
        summary,
        category,
        authorName,
        status,
      });
      const modeLabel =
        status === 'hidden'
          ? '비공개로 전환했어요.'
          : kind === 'library'
            ? '모두의 도서관에 무료 공유했어요!'
            : kind === 'bookstore'
              ? `동화 서점에 ${price} 별 코인으로 판매 등록했어요!`
              : `도서관 대출과 서점 판매(${price} 코인)로 모두 등록했어요!`;
      const bonusMsg = res.bonusEarned > 0 ? ` (창작 보너스 +${res.bonusEarned} 별 코인 적립!)` : '';
      onSuccess(`🎉 '${currentBook.title}' 책을 ${modeLabel}${bonusMsg}`, res.wallet);
    } catch (errorObj) {
      setErr(errorObj instanceof Error ? errorObj.message : '등록 중 오류가 발생했어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="내 책 도서관 공유 및 서점 판매 등록" onClick={onClose}>
      <div className="modal-card publish-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="publish-modal-header">
          <div className="publish-modal-title-wrap">
            <ClayArt name="sparkles" size={32} />
            <div>
              <h2>내 책 공유 · 판매 등록</h2>
              <p>우리 아이가 만든 동화책을 친구들에게 빌려주거나 서점에 판매해 보세요</p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        {books.length === 0 ? (
          <div className="publish-empty">
            <ClayEmoji emoji="📘" size={84} />
            <p>아직 우리 가족 책장에 만든 책이 없어요. 이야기 공방에서 먼저 첫 동화책을 만들어 보세요!</p>
            <button type="button" className="pill-btn small-pill" onClick={onClose}>
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="publish-form">
            {!currentBook?.listing_id && (
              <div className="publish-bonus-banner">
                <span>🎁</span>
                <strong>첫 출품 응원 보너스!</strong> 책을 도서관이나 서점에 등록하면 즉시 <strong>+200 별 코인</strong>을 드려요.
              </div>
            )}

            <label className="publish-field">
              <span className="publish-label">1. 출품할 내 동화책 선택</span>
              <select
                className="publish-select"
                value={selectedBookId}
                onChange={(e) => handleBookChange(e.target.value)}
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.cover_emoji} {b.title} ({b.page_count}쪽){b.listing_id ? ' · [등록됨]' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="publish-field">
              <span className="publish-label">2. 어디에 공개할까요?</span>
              <div className="publish-kind-grid">
                <button
                  type="button"
                  className={`publish-kind-card ${kind === 'library' ? 'active' : ''}`}
                  onClick={() => setKind('library')}
                >
                  <strong>🏛️ 도서관 무료 공유</strong>
                  <span>누구나 무료로 빌려 읽어요 (대출될 때마다 +50 코인 보너스)</span>
                </button>
                <button
                  type="button"
                  className={`publish-kind-card ${kind === 'bookstore' ? 'active' : ''}`}
                  onClick={() => setKind('bookstore')}
                >
                  <strong>🏪 서점 단독 판매</strong>
                  <span>앞 2쪽 미리보기 후 별 코인으로 영구 소장 판매해요</span>
                </button>
                <button
                  type="button"
                  className={`publish-kind-card ${kind === 'both' ? 'active' : ''}`}
                  onClick={() => setKind('both')}
                >
                  <strong>✨ 도서관 + 서점 동시 등록 (추천)</strong>
                  <span>무료 7일 대출도 가능하고, 소장하고 싶은 친구는 구매도 할 수 있어요</span>
                </button>
              </div>
            </div>

            {(kind === 'bookstore' || kind === 'both') && (
              <div className="publish-field">
                <span className="publish-label">3. 서점 소장 가격 (별 코인)</span>
                <div className="publish-chip-row">
                  {PRICE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`publish-chip ${price === p ? 'active' : ''}`}
                      onClick={() => setPrice(p)}
                    >
                      ⭐ {p.toLocaleString()} 코인
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(kind === 'library' || kind === 'both') && (
              <div className="publish-field">
                <span className="publish-label">도서관 1회 대출 기간</span>
                <div className="publish-chip-row">
                  {RENT_DAYS_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`publish-chip ${rentDays === d ? 'active' : ''}`}
                      onClick={() => setRentDays(d)}
                    >
                      📅 {d}일 대여
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="publish-row-2col">
              <label className="publish-field">
                <span className="publish-label">작가 필명 (실명 대신 별명 권장)</span>
                <input
                  type="text"
                  className="publish-input"
                  value={authorName}
                  maxLength={24}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="예: 꼬마 작가 민지"
                  required
                />
              </label>

              <div className="publish-field">
                <span className="publish-label">주제 분류</span>
                <div className="publish-chip-row">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`publish-chip ${category === c ? 'active' : ''}`}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="publish-field">
              <span className="publish-label">책 소개 한마디</span>
              <textarea
                className="publish-textarea"
                rows={2}
                maxLength={160}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="친구들에게 이 동화책의 재미있는 점을 소개해 주세요!"
              />
            </label>

            {currentBook?.listing_id && (
              <div className="publish-field">
                <span className="publish-label">공개 상태</span>
                <div className="publish-chip-row">
                  <button
                    type="button"
                    className={`publish-chip ${status === 'published' ? 'active' : ''}`}
                    onClick={() => setStatus('published')}
                  >
                    🌐 공개 중
                  </button>
                  <button
                    type="button"
                    className={`publish-chip ${status === 'hidden' ? 'active' : ''}`}
                    onClick={() => setStatus('hidden')}
                  >
                    🔒 일시 비공개
                  </button>
                </div>
              </div>
            )}

            {err && <p className="error">{err}</p>}

            <div className="publish-actions">
              <button type="button" className="pill-btn alt small-pill" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="pill-btn small-pill" disabled={busy}>
                <LineIcon name="check" size={18} />
                <span>{busy ? '등록 중…' : currentBook?.listing_id ? '출품 정보 수정하기' : '도서관·서점에 등록하기'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

