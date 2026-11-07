import { useState } from 'react';
import { ApiError, useMe } from '../auth';
import { walletApi, type CoinPackage, type MarketWallet } from '../api';
import { useAsync } from '../useAsync';
import ClayArt from './ClayArt';
import ParentApproveModal, { isParentActionReady } from './ParentApproveModal';

const KIND_BADGE: Record<string, { icon: string; label: string }> = {
  welcome: { icon: '🎉', label: '환영 선물' },
  publish_bonus: { icon: '📚', label: '출품 보너스' },
  loan_reward: { icon: '🏛️', label: '도서관 대출 보상' },
  sale_income: { icon: '💰', label: '서점 판매 수익' },
  book_purchase: { icon: '🛒', label: '동화 소장 구매' },
  topup: { icon: '⚡', label: '별 코인 충전' },
  figure_order: { icon: '🎁', label: '3D 피규어 주문' },
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

interface Props {
  onClose: () => void;
  onWalletUpdated?: (wallet: MarketWallet, msg: string) => void;
}

export default function WalletModal({ onClose, onWalletUpdated }: Props) {
  const { user } = useMe();
  const [tick, setTick] = useState(0);
  const data = useAsync(() => walletApi.get(), [tick]);
  const [busyPkg, setBusyPkg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendingPkg, setPendingPkg] = useState<CoinPackage | null>(null);

  const executeTopup = async (pkg: CoinPackage) => {
    setBusyPkg(pkg.id);
    setErr(null);
    try {
      const res = await walletApi.topup(pkg.id);
      setTick((v) => v + 1);
      onWalletUpdated?.(res.wallet, `⚡ '${pkg.label}' 충전 완료! (+${res.added.toLocaleString()} 별 코인)`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 423) {
        setPendingPkg(pkg);
      } else {
        setErr(e instanceof Error ? e.message : '충전에 실패했어요');
      }
    } finally {
      setBusyPkg(null);
    }
  };

  const handleSelectPackage = (pkg: CoinPackage) => {
    if (!isParentActionReady(user)) {
      setPendingPkg(pkg);
      return;
    }
    void executeTopup(pkg);
  };

  const wallet = data.status === 'ok' ? data.data.wallet : { balance: 0, total_earned: 0 };
  const packages = data.status === 'ok' ? data.data.packages : [];
  const transactions = data.status === 'ok' ? data.data.transactions : [];

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="별 코인 지갑 및 충전소"
      onClick={onClose}
    >
      <div className="modal-card wallet-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="publish-modal-header">
          <div className="publish-modal-title-wrap">
            <ClayArt name="star" size={32} />
            <div>
              <h2>내 별 코인 지갑 · 충전소</h2>
              <p>창작 활동으로 모은 수익과 코인 사용 내역을 한눈에 확인해요</p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <div className="wallet-modal-body">
          {/* 잔액 요약 카드 */}
          <section className="wallet-balance-banner">
            <div>
              <span>현재 보유 별 코인</span>
              <strong>⭐ {wallet.balance.toLocaleString()} 코인</strong>
            </div>
            <div>
              <span>내가 만든 책 누적 수익</span>
              <strong className="earned">+{wallet.total_earned.toLocaleString()} 코인</strong>
            </div>
          </section>

          {/* 충전 패키지 섹션 */}
          <section className="wallet-section">
            <div className="wallet-section-head">
              <h3>⚡ 별 코인 바로 충전 (보호자 승인 필수)</h3>
              <span>동화 소장 구매 및 3D 실물 피규어 주문에 사용할 수 있어요</span>
            </div>
            <div className="wallet-pkg-grid">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  className="wallet-pkg-card"
                  disabled={busyPkg === pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                >
                  {pkg.badge && <span className="wallet-pkg-badge">{pkg.badge}</span>}
                  <strong>⭐ {pkg.coins.toLocaleString()} 코인</strong>
                  <span className="wallet-pkg-name">{pkg.label}</span>
                  <span className="wallet-pkg-price">
                    {busyPkg === pkg.id ? '충전 처리 중…' : `₩${pkg.priceKrw.toLocaleString()} 충전하기`}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {err && <p className="error">{err}</p>}

          {/* 별 코인 적립 팁 */}
          <div className="wallet-tip-box">
            💡 <strong>무료로 별 코인 모으는 법:</strong> 내가 만든 동화책을 첫 출품하면 <strong>+200 코인</strong>, 도서관에서 친구가 빌려 읽을 때마다 <strong>+50 코인</strong>, 서점에서 판매될 때마다 <strong>판매가 100%</strong>가 적립돼요!
          </div>

          {/* 거래 원장 내역 */}
          <section className="wallet-section">
            <div className="wallet-section-head">
              <h3>📜 최근 별 코인 거래 내역 ({transactions.length}건)</h3>
            </div>
            {data.status === 'loading' ? (
              <p className="muted">거래 내역을 불러오는 중이에요…</p>
            ) : transactions.length === 0 ? (
              <p className="muted">아직 거래 내역이 없어요.</p>
            ) : (
              <ul className="wallet-tx-list">
                {transactions.map((tx) => {
                  const meta = KIND_BADGE[tx.kind] ?? { icon: '⭐', label: '코인 내역' };
                  const isPlus = tx.delta >= 0;
                  return (
                    <li key={tx.id} className="wallet-tx-item">
                      <span className="wallet-tx-icon" aria-hidden>
                        {meta.icon}
                      </span>
                      <div className="wallet-tx-info">
                        <strong>{tx.title}</strong>
                        <small>
                          {meta.label} · {formatDateTime(tx.created_at)}
                        </small>
                      </div>
                      <div className="wallet-tx-amount">
                        <strong className={isPlus ? 'plus' : 'minus'}>
                          {isPlus ? `+${tx.delta.toLocaleString()}` : tx.delta.toLocaleString()}
                        </strong>
                        <small>잔액 {tx.balance_after.toLocaleString()}</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {pendingPkg && (
          <ParentApproveModal
            actionLabel={`'${pendingPkg.label}' (₩${pendingPkg.priceKrw.toLocaleString()}) 충전을 진행할까요?`}
            onClose={() => setPendingPkg(null)}
            onApproved={() => {
              const target = pendingPkg;
              setPendingPkg(null);
              void executeTopup(target);
            }}
          />
        )}
      </div>
    </div>
  );
}

