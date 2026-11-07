import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  api,
  fileUrl,
  marketApi,
  type MarketListing,
  type MarketWallet,
  type ReportReason,
  type StickerType,
} from '../api';
import { ApiError, useMe } from '../auth';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import { ClayIcon, LineIcon } from '../components/Icons';
import ParentApproveModal, { isParentActionReady, shareBookLink } from '../components/ParentApproveModal';
import PublishModal from '../components/PublishModal';
import { SubHeader } from '../components/SiteHeader';
import WalletModal from '../components/WalletModal';
import { speak } from '../speech';
import { useAsync } from '../useAsync';

type MarketTab = 'library' | 'bookstore' | 'mine';

const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'unsafe', label: '어린이에게 부적절하거나 무서운 표현이 있어요' },
  { key: 'pii', label: '전화번호·주소·실명 등 개인정보가 들어 있어요' },
  { key: 'copyright', label: '다른 사람의 책·캐릭터를 그대로 베꼈어요' },
  { key: 'other', label: '기타 확인이 필요한 내용이에요' },
];

const CATEGORIES = ['전체', '모험', '생활습관', '우주·과학', '잠자리', '감정'] as const;

const STICKERS: { key: StickerType; emoji: string; label: string }[] = [
  { key: 'star', emoji: '⭐', label: '재미있어요' },
  { key: 'art', emoji: '🎨', label: '그림 멋져요' },
  { key: 'heart', emoji: '💖', label: '감동이에요' },
  { key: 'again', emoji: '📚', label: '또 읽고 싶어요' },
];

const TONES = ['lavender', 'peach', 'mint', 'yellow', 'pink'] as const;

function daysLeft(dueAt: string | null | undefined): number {
  if (!dueAt) return 0;
  const diff = new Date(dueAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / 86400000));
}

export default function BookMarket() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useMe();

  const initialTab = (searchParams.get('tab') as MarketTab) || 'library';
  const [tab, setTab] = useState<MarketTab>(
    initialTab === 'bookstore' || initialTab === 'mine' ? initialTab : 'library',
  );
  const [category, setCategory] = useState<string>('전체');
  const [query, setQuery] = useState<string>('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [publishBookId, setPublishBookId] = useState<string | null>(searchParams.get('publish'));
  const [showPublishModal, setShowPublishModal] = useState<boolean>(Boolean(searchParams.get('publish')));
  const [showWalletModal, setShowWalletModal] = useState<boolean>(Boolean(searchParams.get('wallet')));
  const [pendingBuyItem, setPendingBuyItem] = useState<MarketListing | null>(null);
  const [reportTarget, setReportTarget] = useState<MarketListing | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('unsafe');
  const [reportDetail, setReportDetail] = useState<string>('');
  const [reportBusy, setReportBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const market = useAsync(() => api.market(), [reloadTick]);
  const children = useAsync(api.children, []);
  const [walletOverride, setWalletOverride] = useState<MarketWallet | null>(null);

  useEffect(() => {
    if (children.status === 'ok' && children.data.length > 0 && !selectedChildId) {
      setSelectedChildId(children.data[0].id);
    }
  }, [children, selectedChildId]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(t);
  }, [notice]);

  const tell = (msg: string) => {
    if (!msg) return;
    setNotice(msg);
    speak(msg);
  };

  const wallet = walletOverride ?? (market.status === 'ok' ? market.data.wallet : { balance: 3000, total_earned: 0 });
  const allListings = market.status === 'ok' ? market.data.listings : [];
  const myBooks = market.status === 'ok' ? market.data.myBooks : [];
  const kids = children.status === 'ok' ? children.data : [];
  const selectedChild = kids.find((c) => c.id === selectedChildId);

  const visibleListings = useMemo(() => {
    return allListings.filter((item) => {
      if (item.status !== 'published') return false;
      if (tab === 'library' && item.kind !== 'library' && item.kind !== 'both') return false;
      if (tab === 'bookstore' && item.kind !== 'bookstore' && item.kind !== 'both') return false;
      if (category !== '전체' && item.category !== category) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${item.title} ${item.author_name} ${item.summary}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allListings, tab, category, query]);

  const changeTab = (next: MarketTab) => {
    setTab(next);
    setSearchParams({ tab: next }, { replace: true });
  };

  const handleBorrow = async (item: MarketListing, action: 'borrow' | 'return' = 'borrow') => {
    setBusyId(item.id);
    try {
      const res = await marketApi.borrow(item.id, selectedChildId || null, action);
      setReloadTick((v) => v + 1);
      if (action === 'return') {
        tell(`'${item.title}' 책을 도서관에 반납했어요.`);
      } else {
        const targetLabel = selectedChild ? `${selectedChild.nickname}의 책장` : '우리 아이 책장';
        tell(
          res.extended
            ? `'${item.title}' 대여 기간을 ${item.rent_days}일 연장했어요!`
            : `🏛️ '${item.title}' 책을 빌려서 ${targetLabel}에 꽂았어요!`,
        );
      }
    } catch (e) {
      tell(e instanceof Error ? e.message : '대출 처리에 실패했어요');
    } finally {
      setBusyId(null);
    }
  };

  const executeBuy = async (item: MarketListing) => {
    setBusyId(item.id);
    try {
      const res = await marketApi.buy(item.id, selectedChildId || null);
      setWalletOverride(res.wallet);
      setReloadTick((v) => v + 1);
      const targetLabel = selectedChild ? `${selectedChild.nickname}의 책장` : '우리 아이 책장';
      tell(
        res.alreadyOwned
          ? `이미 소장한 책이에요! ${targetLabel}으로 연결했어요.`
          : `🏪 '${item.title}' 책을 소장 구매해 ${targetLabel}에 영구 보관했어요!`,
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 423) {
        setPendingBuyItem(item);
      } else {
        tell(e instanceof Error ? e.message : '구매에 실패했어요');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleBuy = (item: MarketListing) => {
    if (!isParentActionReady(user)) {
      setPendingBuyItem(item);
      return;
    }
    void executeBuy(item);
  };

  const handleShare = async (bookId: string, title: string) => {
    const msg = await shareBookLink(bookId, title);
    if (msg) tell(msg);
  };

  const handleReportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    setReportBusy(true);
    try {
      const res = await marketApi.report(reportTarget.id, reportReason, reportDetail);
      setReportTarget(null);
      setReportDetail('');
      if (res.autoHidden) {
        setReloadTick((v) => v + 1);
        tell('🚨 누적 신고가 접수되어 운영자 확인 전까지 해당 도서가 자동 블라인드 처리되었어요.');
      } else {
        tell('🚨 신고가 접수되었어요. 어린이 안전 운영팀이 빠르게 확인할게요!');
      }
    } catch (errObj) {
      tell(errObj instanceof Error ? errObj.message : '신고 접수에 실패했어요');
    } finally {
      setReportBusy(false);
    }
  };

  const handleReact = async (item: MarketListing, sticker: StickerType) => {
    try {
      await marketApi.react(item.id, sticker);
      setReloadTick((v) => v + 1);
      const found = STICKERS.find((s) => s.key === sticker);
      tell(`${item.author_name}님에게 '${found?.emoji} ${found?.label}' 응원 스티커를 보냈어요!`);
    } catch (e) {
      tell(e instanceof Error ? e.message : '스티커 전송에 실패했어요');
    }
  };

  return (
    <main className="screen market-screen">
      <SubHeader
        title="토이북 도서관 · 서점"
        right={
          <div className="market-header-actions">
            <button
              type="button"
              className="market-wallet-pill clickable"
              onClick={() => setShowWalletModal(true)}
              title="클릭해서 별 코인 거래 내역 및 충전소 열기"
            >
              <ClayArt name="star" size={20} />
              <span>
                내 별 코인 <strong>{wallet.balance.toLocaleString()}</strong> · 충전소
              </span>
            </button>
            <button
              type="button"
              className="pill-btn small-pill market-publish-top-btn"
              onClick={() => {
                setPublishBookId(null);
                setShowPublishModal(true);
              }}
            >
              <LineIcon name="book" size={16} />
              <span>내 책 공유·판매</span>
            </button>
          </div>
        }
      />

      <div className="market-container">
        {/* 상단 배너: 도서관 & 서점 소개 + 아이 책장 선택 */}
        <section className="market-hero">
          <div className="market-hero-copy">
            <span className="market-hero-badge">✨ 함께 읽고 나누는 창작 동화 광장</span>
            <h2>친구가 만든 동화를 빌려 읽고, 내가 만든 책을 서점에 출품해요!</h2>
            <p>
              <strong>모두의 도서관</strong>에서는 무료로 7일간 책을 빌려 우리 아이 책장에 꽂을 수 있고,{' '}
              <strong>동화 서점</strong>에서는 별 코인으로 멋진 창작 동화를 영구 소장하거나 내 책을 판매할 수 있어요.
            </p>
          </div>

          <div className="market-hero-side">
            <div className="market-child-selector">
              <label htmlFor="market-child-select">📚 빌리거나 산 책을 꽂을 책장</label>
              <div className="market-child-select-row">
                <select
                  id="market-child-select"
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                >
                  {kids.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.avatar} {c.nickname}의 책장
                    </option>
                  ))}
                  {kids.length === 0 && <option value="">우리 집 기본 책장</option>}
                </select>
                <Link
                  to={selectedChildId ? `/shelf/${selectedChildId}` : '/profiles'}
                  className="market-goto-shelf-link"
                >
                  책장 가기 →
                </Link>
              </div>
            </div>

            <div
              className="market-wallet-summary clickable"
              role="button"
              tabIndex={0}
              onClick={() => setShowWalletModal(true)}
              onKeyDown={(e) => e.key === 'Enter' && setShowWalletModal(true)}
              title="별 코인 원장 및 충전소 열기"
            >
              <div>
                <span>보유 별 코인 (클릭 시 충전·내역)</span>
                <strong>⭐ {wallet.balance.toLocaleString()} 코인</strong>
              </div>
              <div>
                <span>창작 수익 누적</span>
                <strong>+{wallet.total_earned.toLocaleString()} 코인</strong>
              </div>
            </div>
          </div>
        </section>

        {/* 메인 탭 전환: 모두의 도서관 / 동화 서점 / 내 출품 관리 */}
        <div className="market-tabs-bar">
          <div className="market-tabs" role="tablist" aria-label="도서관 및 서점 탭">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'library'}
              className={`market-tab-btn ${tab === 'library' ? 'active' : ''}`}
              onClick={() => changeTab('library')}
            >
              <ClayIcon name="home" size={28} tile={false} />
              <div>
                <strong>🏛️ 모두의 도서관</strong>
                <small>무료 공유 · 7일 대출</small>
              </div>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'bookstore'}
              className={`market-tab-btn ${tab === 'bookstore' ? 'active' : ''}`}
              onClick={() => changeTab('bookstore')}
            >
              <ClayIcon name="magic" size={28} tile={false} />
              <div>
                <strong>🏪 동화 서점</strong>
                <small>창작 동화 판매 · 영구 소장</small>
              </div>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'mine'}
              className={`market-tab-btn ${tab === 'mine' ? 'active' : ''}`}
              onClick={() => changeTab('mine')}
            >
              <ClayIcon name="studio" size={28} tile={false} />
              <div>
                <strong>🎨 내 책 공유·판매 관리</strong>
                <small>우리 가족 출품작 ({myBooks.filter((b) => b.listing_id).length}/{myBooks.length}권)</small>
              </div>
            </button>
          </div>

          {tab !== 'mine' && (
            <div className="market-filter-row">
              <div className="market-category-chips">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`market-cat-chip ${category === c ? 'active' : ''}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="market-search-box">
                <LineIcon name="search" size={18} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="제목, 작가 이름, 내용 검색…"
                  aria-label="도서 검색"
                />
              </div>
            </div>
          )}
        </div>

        {/* 로딩 상태 */}
        {market.status === 'loading' && (
          <div className="market-loading" aria-busy="true">
            <ClayEmoji emoji="📚" size={88} />
            <p>도서관과 서점 책장을 불러오는 중이에요…</p>
          </div>
        )}

        {/* 탭 1 & 2: 도서관 / 서점 목록 */}
        {market.status === 'ok' && tab !== 'mine' && (
          <>
            {visibleListings.length === 0 ? (
              <div className="market-empty">
                <ClayEmoji emoji="🔍" size={88} />
                <p>조건에 맞는 동화책이 아직 없어요. 내가 만든 첫 번째 책을 등록해 볼까요?</p>
                <button
                  type="button"
                  className="pill-btn small-pill"
                  onClick={() => {
                    setPublishBookId(null);
                    setShowPublishModal(true);
                  }}
                >
                  내 책 등록하기
                </button>
              </div>
            ) : (
              <section className="market-grid" aria-label={tab === 'library' ? '도서관 도서 목록' : '서점 도서 목록'}>
                {visibleListings.map((item, idx) => {
                  const tone = TONES[idx % TONES.length];
                  const isBorrowed = Boolean(item.borrowed_until);
                  const dLeft = daysLeft(item.borrowed_until);
                  const isOwned = Boolean(item.is_purchased) || Boolean(item.is_mine);

                  return (
                    <article key={item.id} className={`market-card tone-${tone}`}>
                      <div className="market-card-top">
                        <span className="market-cat-badge">{item.category}</span>
                        {item.is_mine ? (
                          <span className="market-state-badge mine">내 출품작</span>
                        ) : item.is_purchased ? (
                          <span className="market-state-badge owned">✨ 소장 중</span>
                        ) : isBorrowed ? (
                          <span className="market-state-badge borrowed">🏛️ 대여 중 (D-{dLeft})</span>
                        ) : tab === 'library' ? (
                          <span className="market-state-badge free">무료 대출 ({item.rent_days}일)</span>
                        ) : (
                          <span className="market-state-badge price">⭐ {item.price.toLocaleString()} 코인</span>
                        )}
                      </div>

                      <div
                        className="market-cover-box"
                        onClick={() => navigate(`/book/${item.book_id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/book/${item.book_id}`)}
                      >
                        <div className="market-book-3d">
                          {item.cover_key ? (
                            <img src={fileUrl(item.cover_key)} alt={item.title} />
                          ) : (
                            <ClayEmoji emoji={item.cover_emoji} size={78} />
                          )}
                        </div>
                        <div className="market-book-meta">
                          <h3>{item.title}</h3>
                          <p className="market-author">
                            ✍️ {item.author_name} · {item.page_count}쪽
                          </p>
                          <p className="market-summary">{item.summary}</p>
                        </div>
                      </div>

                      <div className="market-stats-row">
                        <span>🏛️ 대출 {item.loan_count}회</span>
                        {(item.kind === 'bookstore' || item.kind === 'both') && <span>🏪 소장 {item.sales_count}명</span>}
                        <span>💖 응원 {item.likes_count}개</span>
                        <div className="market-mini-tools">
                          <button
                            type="button"
                            className="market-mini-btn"
                            onClick={() => handleShare(item.book_id, item.title)}
                            title="이 동화책 링크 복사·공유하기"
                          >
                            🔗 공유
                          </button>
                          {!item.is_mine && (
                            <button
                              type="button"
                              className="market-mini-btn report"
                              onClick={() => {
                                setReportTarget(item);
                                setReportReason('unsafe');
                                setReportDetail('');
                              }}
                              title="부적절한 내용 신고하기"
                            >
                              🚨 신고
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 어린이 안전 칭찬 스티커 반응 버튼 */}
                      <div className="market-sticker-row" aria-label="창작자 응원 스티커">
                        {STICKERS.map((st) => (
                          <button
                            key={st.key}
                            type="button"
                            className={`market-sticker-btn ${item.my_sticker === st.key ? 'active' : ''}`}
                            onClick={() => handleReact(item, st.key)}
                            title={`${st.label} 스티커 보내기`}
                          >
                            <span>{st.emoji}</span>
                            <small>{st.label}</small>
                          </button>
                        ))}
                      </div>

                      {/* 액션 버튼 영역 */}
                      <div className="market-card-actions">
                        {tab === 'library' ? (
                          <>
                            <button
                              type="button"
                              className="market-btn secondary"
                              onClick={() => navigate(`/book/${item.book_id}`)}
                            >
                              📖 바로 읽기
                            </button>
                            {isBorrowed ? (
                              <button
                                type="button"
                                className="market-btn outline"
                                disabled={busyId === item.id}
                                onClick={() => handleBorrow(item, 'return')}
                              >
                                반납하기 (D-{dLeft})
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="market-btn primary"
                                disabled={busyId === item.id}
                                onClick={() => handleBorrow(item, 'borrow')}
                              >
                                📥 내 책장으로 대출 ({item.rent_days}일)
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="market-btn secondary"
                              onClick={() => navigate(`/book/${item.book_id}`)}
                            >
                              {isOwned || isBorrowed ? '📖 전체 읽기' : '👀 앞 2쪽 미리보기'}
                            </button>
                            {isOwned ? (
                              <button
                                type="button"
                                className="market-btn owned"
                                onClick={() =>
                                  navigate(selectedChildId ? `/shelf/${selectedChildId}` : `/book/${item.book_id}`)
                                }
                              >
                                ✨ 소장 완료 (책장 보기)
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="market-btn primary buy"
                                disabled={busyId === item.id}
                                onClick={() => handleBuy(item)}
                              >
                                🛒 소장 구매 (⭐ {item.price.toLocaleString()})
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}

        {/* 탭 3: 내 책 공유·판매 관리 (꼬마 작가 스튜디오) */}
        {market.status === 'ok' && tab === 'mine' && (
          <section className="market-mine-section" aria-label="내 책 공유 및 판매 관리">
            <div className="market-mine-header">
              <div>
                <h3>내가 만든 동화책 출품 관리 ({myBooks.length}권)</h3>
                <p>우리 아이와 만든 책을 도서관에 무료 공유하거나 서점에 가격을 정해 판매할 수 있어요.</p>
              </div>
              <Link
                to={selectedChildId ? `/shelf/${selectedChildId}` : '/profiles'}
                className="pill-btn alt small-pill"
              >
                + 책장에서 새 동화 만들기
              </Link>
            </div>

            <div className="market-mine-list">
              {myBooks.map((b) => {
                const isListed = Boolean(b.listing_id) && b.market_status === 'published';
                return (
                  <article key={b.id} className={`market-mine-item ${isListed ? 'is-listed' : ''}`}>
                    <div className="market-mine-book">
                      <span className="market-mine-emoji">
                        {b.cover_key ? (
                          <img src={fileUrl(b.cover_key)} alt={b.title} />
                        ) : (
                          <ClayEmoji emoji={b.cover_emoji} size={54} />
                        )}
                      </span>
                      <div>
                        <h4>{b.title}</h4>
                        <p className="market-mine-sub">
                          {b.page_count}쪽 ·{' '}
                          {!b.listing_id ? (
                            <span className="tag-unlisted">아직 출품 전 (우리 가족만 보기)</span>
                          ) : b.market_status === 'hidden' ? (
                            <span className="tag-hidden">🔒 일시 비공개</span>
                          ) : b.market_kind === 'library' ? (
                            <span className="tag-lib">🏛️ 도서관 무료 공유 중</span>
                          ) : b.market_kind === 'bookstore' ? (
                            <span className="tag-store">🏪 서점 판매 중 (⭐ {b.market_price} 코인)</span>
                          ) : (
                            <span className="tag-both">✨ 도서관 공유 + 서점 판매 중 (⭐ {b.market_price} 코인)</span>
                          )}
                        </p>
                        {b.listing_id && (
                          <div className="market-mine-stats">
                            <span>작가명: {b.market_author_name}</span>
                            <span>대출: {b.loan_count ?? 0}회</span>
                            <span>판매: {b.sales_count ?? 0}권</span>
                            <span>응원 스티커: {b.likes_count ?? 0}개</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="market-mine-actions">
                      <button
                        type="button"
                        className="market-btn outline"
                        onClick={() => handleShare(b.id, b.title)}
                      >
                        🔗 자랑하기(공유)
                      </button>
                      <button
                        type="button"
                        className="market-btn secondary"
                        onClick={() => navigate(`/book/${b.id}`)}
                      >
                        📖 책 열기
                      </button>
                      <button
                        type="button"
                        className="market-btn primary"
                        onClick={() => {
                          setPublishBookId(b.id);
                          setShowPublishModal(true);
                        }}
                      >
                        {b.listing_id ? '⚙️ 공유·판매 설정 수정' : '🚀 도서관·서점에 출품하기 (+200코인)'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {showPublishModal && (
        <PublishModal
          books={myBooks}
          initialBookId={publishBookId ?? undefined}
          defaultAuthorName={selectedChild ? `꼬마 작가 ${selectedChild.nickname}` : '꼬마 작가'}
          onClose={() => setShowPublishModal(false)}
          onSuccess={(msg, nextWallet) => {
            setShowPublishModal(false);
            setWalletOverride(nextWallet);
            setReloadTick((v) => v + 1);
            tell(msg);
          }}
        />
      )}

      {showWalletModal && (
        <WalletModal
          onClose={() => setShowWalletModal(false)}
          onWalletUpdated={(nextWallet, msg) => {
            setWalletOverride(nextWallet);
            tell(msg);
          }}
        />
      )}

      {pendingBuyItem && (
        <ParentApproveModal
          actionLabel={`'${pendingBuyItem.title}' 동화책을 ⭐ ${pendingBuyItem.price.toLocaleString()} 별 코인으로 소장 구매할까요?`}
          onClose={() => setPendingBuyItem(null)}
          onApproved={() => {
            const target = pendingBuyItem;
            setPendingBuyItem(null);
            void executeBuy(target);
          }}
        />
      )}

      {reportTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="어린이 안전 콘텐츠 신고"
          onClick={() => setReportTarget(null)}
        >
          <div className="modal-card report-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="publish-modal-header">
              <div>
                <h2>🚨 어린이 안전 콘텐츠 신고</h2>
                <p>'{reportTarget.title}' 동화책에서 확인이 필요한 점을 알려 주세요</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setReportTarget(null)} aria-label="닫기">
                ✕
              </button>
            </header>
            <form className="publish-form" onSubmit={handleReportSubmit}>
              <div className="report-reason-list">
                {REPORT_REASONS.map((r) => (
                  <label key={r.key} className={`report-reason-item ${reportReason === r.key ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reportReason === r.key}
                      onChange={() => setReportReason(r.key)}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
              <label className="publish-field">
                <span className="publish-label">자세한 설명 (선택)</span>
                <textarea
                  className="publish-textarea"
                  rows={2}
                  maxLength={200}
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder="몇 쪽에 어떤 표현이 있었는지 적어 주시면 운영팀이 더 빠르게 확인해요."
                />
              </label>
              <p className="publish-safety-note">
                ※ 3건 이상 신고가 누적된 도서는 어린이 보호를 위해 운영자 확인 전까지 즉시 자동 블라인드 처리됩니다.
              </p>
              <div className="publish-actions">
                <button type="button" className="pill-btn alt small-pill" onClick={() => setReportTarget(null)}>
                  취소
                </button>
                <button type="submit" className="pill-btn small-pill" disabled={reportBusy}>
                  {reportBusy ? '신고 접수 중…' : '🚨 신고 접수하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </main>
  );
}

