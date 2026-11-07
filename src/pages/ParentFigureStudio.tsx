import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  orderApi,
  wishApi,
  type FigureMaterial,
  type Model3DItem,
  type WishRecord,
} from '../api';
import { ApiError, useMe } from '../auth';
import ClayArt from '../components/ClayArt';
import DashLayout from '../components/DashLayout';
import { ClayIcon, LineIcon } from '../components/Icons';
import { PARENT_MENU, parentProfile, useLeaveParent } from '../components/ParentArea';
import ParentApproveModal, { isParentActionReady } from '../components/ParentApproveModal';
import WalletModal from '../components/WalletModal';
import { isParentUnlocked } from '../parentLock';
import { SHELF_FIGURES, type ShelfFigureId } from '../shelfState';
import { useAsync } from '../useAsync';

const ORDER_STEPS = [
  { key: 'paid', label: '결제·접수' },
  { key: 'inspecting', label: '출력 검수' },
  { key: 'printing', label: '3D 출력' },
  { key: 'finishing', label: '안전 후가공' },
  { key: 'shipping', label: '배송 중' },
  { key: 'done', label: '배송 완료' },
] as const;

function stepIndexOf(status: string): number {
  if (status === 'paid' || status === 'received') return 0;
  const idx = ORDER_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

const SIZE_OPTIONS: { cm: 5 | 8 | 12; label: string; krw: number; desc: string }[] = [
  { cm: 5, label: '5cm 미니 피규어', krw: 19000, desc: '가방 고리·책상 장식용 아담한 크기' },
  { cm: 8, label: '8cm 스탠다드 (인기)', krw: 29000, desc: '아이 손에 꼭 맞는 대표 아트토이 크기' },
  { cm: 12, label: '12cm 프리미엄 대왕', krw: 45000, desc: '디테일이 살아있는 소장용 전시 크기' },
];

const MATERIAL_OPTIONS: { key: FigureMaterial; label: string; addKrw: number; desc: string }[] = [
  { key: 'fdm', label: '친환경 PLA 단색 (+색칠 키트)', addKrw: 0, desc: '옥수수 전분 유래 친환경 소재 · 아이와 직접 색칠 놀이 가능' },
  { key: 'resin', label: '고정밀 스무스 레진', addKrw: 8000, desc: '결이 보이지 않는 매끈한 파스텔 아이보리 조형' },
  { key: 'fullcolor', label: '프리미엄 풀컬러 완성형', addKrw: 16000, desc: '동화 속 색감 그대로 도색·무광 코팅 마감' },
];

export default function ParentFigureStudio({ mode }: { mode: 'models' | 'orders' }) {
  const { loading: meLoading, user } = useMe();
  const leave = useLeaveParent();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tick, setTick] = useState(0);
  const wishData = useAsync(() => wishApi.list(), [tick]);
  const orderData = useAsync(() => orderApi.list(), [tick]);

  const [selectedModelId, setSelectedModelId] = useState<string>(searchParams.get('modelId') ?? '');
  const [linkedWishId, setLinkedWishId] = useState<string | null>(searchParams.get('wishId'));
  const [angle, setAngle] = useState<number>(-14);
  const [showBedGrid, setShowBedGrid] = useState<boolean>(true);
  const [genFigureId, setGenFigureId] = useState<ShelfFigureId>('dino');
  const [genSizeCm, setGenSizeCm] = useState<5 | 8 | 12>(8);
  const [genBusy, setGenBusy] = useState(false);

  // 주문 폼 상태
  const [sizeCm, setSizeCm] = useState<5 | 8 | 12>(8);
  const [material, setMaterial] = useState<FigureMaterial>('fullcolor');
  const [payMethod, setPayMethod] = useState<'coins' | 'card'>('coins');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('어린이 선물용으로 모서리 안전 검수 부탁드립니다.');
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const [needOrderApprove, setNeedOrderApprove] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const models: Model3DItem[] = wishData.status === 'ok' ? wishData.data.models : [];
  const wishes: WishRecord[] = wishData.status === 'ok' ? wishData.data.wishes : [];
  const orders = orderData.status === 'ok' ? orderData.data.orders : [];
  const wallet = orderData.status === 'ok' ? orderData.data.wallet : { balance: 0, total_earned: 0 };

  useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      const fromWish = linkedWishId ? wishes.find((w) => w.id === linkedWishId)?.model_id : undefined;
      setSelectedModelId(fromWish ?? models[0].id);
    }
  }, [models, wishes, selectedModelId, linkedWishId]);

  useEffect(() => {
    if (user?.name && !recipient) {
      setRecipient(user.name);
    }
  }, [user, recipient]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!isParentUnlocked()) return <Navigate to="/parent" replace />;

  const activeModel = models.find((m) => m.id === selectedModelId) ?? models[0] ?? null;
  const totalKrw =
    (SIZE_OPTIONS.find((s) => s.cm === sizeCm)?.krw ?? 29000) +
    (MATERIAL_OPTIONS.find((m) => m.key === material)?.addKrw ?? 0);
  const coinCost = Math.round(totalKrw / 10);

  const handleGenerateModel = async () => {
    const fig = SHELF_FIGURES.find((f) => f.id === genFigureId) ?? SHELF_FIGURES[0];
    setGenBusy(true);
    try {
      const res = await wishApi.create({
        figureId: fig.id,
        figureName: fig.name,
        figureImage: fig.image,
        role: fig.role,
        sizeCm: genSizeCm,
        createWish: false,
      });
      setSelectedModelId(res.modelId);
      setTick((v) => v + 1);
      setNotice(`✨ '${fig.name} (${genSizeCm}cm)' 3D 프린팅 모델 변환 및 출력 검수가 완료되었어요!`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '3D 모델 생성에 실패했어요');
    } finally {
      setGenBusy(false);
    }
  };

  const handleDecideWish = async (wish: WishRecord, decision: 'approved' | 'rejected') => {
    try {
      await wishApi.decide(wish.id, decision);
      setTick((v) => v + 1);
      if (decision === 'approved') {
        setSelectedModelId(wish.model_id);
        setLinkedWishId(wish.id);
        const targetSize = wish.meta.sizeCm === 5 || wish.meta.sizeCm === 12 ? wish.meta.sizeCm : 8;
        setSizeCm(targetSize);
        navigate(`/dashboard/orders?modelId=${encodeURIComponent(wish.model_id)}&wishId=${encodeURIComponent(wish.id)}`);
      } else {
        setNotice(`'${wish.meta.figureName}' 요청을 보류 처리했어요.`);
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '요청 처리에 실패했어요');
    }
  };

  const executeOrder = async () => {
    if (!activeModel) return;
    setOrderBusy(true);
    setOrderErr(null);
    try {
      const res = await orderApi.create({
        modelId: activeModel.id,
        wishId: linkedWishId,
        sizeCm,
        material,
        payMethod,
        recipient,
        phone,
        address,
        memo,
      });
      setLinkedWishId(null);
      setTick((v) => v + 1);
      setNotice(`🎁 주문 완료! 주문번호 ${res.orderNo} · wow3d 전문 엔지니어 검수가 시작되었어요!`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 423) {
        setNeedOrderApprove(true);
      } else {
        setOrderErr(e instanceof Error ? e.message : '주문 접수에 실패했어요');
      }
    } finally {
      setOrderBusy(false);
    }
  };

  const handleOrderSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeModel) return;
    if (!isParentActionReady(user)) {
      setNeedOrderApprove(true);
      return;
    }
    void executeOrder();
  };

  return (
    <DashLayout
      title={mode === 'models' ? '3D 모델 보관함 · 아이 찜 승인' : '실물 3D 피규어 주문 · 배송'}
      profile={parentProfile(user, meLoading)}
      menu={PARENT_MENU}
      active={mode === 'models' ? 4 : 5}
      onLogout={leave}
    >
      {/* 상단 전환 탭 */}
      <div className="studio3d-top-bar">
        <div className="studio3d-switch">
          <button
            type="button"
            className={`market-cat-chip ${mode === 'models' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/models')}
          >
            🧊 3D 모델 보관함 & 찜 요청 ({wishes.filter((w) => w.status === 'pending').length})
          </button>
          <button
            type="button"
            className={`market-cat-chip ${mode === 'orders' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/orders')}
          >
            📦 피규어 제작 주문 & 배송 조회 ({orders.length})
          </button>
        </div>

        <button
          type="button"
          className="market-wallet-pill clickable"
          onClick={() => setShowWalletModal(true)}
        >
          <ClayArt name="star" size={18} />
          <span>
            보유 별 코인 <strong>{wallet.balance.toLocaleString()}</strong> · 충전소
          </span>
        </button>
      </div>

      {mode === 'models' ? (
        <>
          {/* 아이들의 갖고 싶어요 요청 목록 */}
          <section className="dash-card studio3d-wish-section">
            <header>
              <h3>💜 우리 아이 ‘갖고 싶어요’ 피규어 요청 ({wishes.length}건)</h3>
              <span className="badge-sample">아이 책장 장난감 공장 연동</span>
            </header>

            {wishes.length === 0 ? (
              <p className="muted">
                아직 아이가 찜한 3D 피규어가 없어요. 아이 책장에서 [장난감 공장] 버튼을 눌러 피규어를 찜하면 여기에 바로 도착해요!
              </p>
            ) : (
              <div className="studio3d-wish-grid">
                {wishes.map((w) => (
                  <article key={w.id} className={`studio3d-wish-card status-${w.status}`}>
                    <img src={w.source_image_key} alt={w.meta.figureName} className="studio3d-wish-img" />
                    <div className="studio3d-wish-info">
                      <span className="studio3d-child-tag">
                        {w.child_avatar} {w.child_nickname}의 요청
                      </span>
                      <strong>
                        {w.meta.figureName} ({w.meta.sizeCm}cm)
                      </strong>
                      <small>{w.meta.supportNote}</small>
                    </div>
                    <div className="studio3d-wish-actions">
                      {w.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="market-btn primary"
                            onClick={() => handleDecideWish(w, 'approved')}
                          >
                            ✅ 승인·주문하기
                          </button>
                          <button
                            type="button"
                            className="market-btn outline"
                            onClick={() => handleDecideWish(w, 'rejected')}
                          >
                            보류
                          </button>
                        </>
                      ) : (
                        <span className={`wish-status-pill ${w.status}`}>
                          {w.status === 'approved' ? '승인 완료' : '보류됨'}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* 3D 턴테이블 검수 뷰어 + 보관함 */}
          <section className="studio3d-viewer-layout">
            <article className="dash-card studio3d-stage-card">
              <header>
                <h3>🔄 3D 모델 360° 입체 검수 뷰어</h3>
                <button
                  type="button"
                  className="market-mini-btn"
                  onClick={() => setShowBedGrid((v) => !v)}
                >
                  {showBedGrid ? '프린터 베드 숨기기' : '프린터 베드 보기'}
                </button>
              </header>

              {activeModel ? (
                <>
                  <div className={`studio3d-turntable ${showBedGrid ? 'with-bed' : ''}`}>
                    <div
                      className="studio3d-model-frame"
                      style={{ transform: `perspective(900px) rotateY(${angle}deg)` }}
                    >
                      <img src={activeModel.source_image_key} alt={activeModel.meta.figureName} />
                    </div>
                    <div className="studio3d-bed-plate" aria-hidden />
                  </div>

                  <div className="studio3d-slider-row">
                    <span>회전 각도 ({angle}°)</span>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      value={angle}
                      onChange={(e) => setAngle(Number(e.target.value))}
                    />
                    <button type="button" className="market-mini-btn" onClick={() => setAngle(0)}>
                      정면
                    </button>
                  </div>

                  <div className="studio3d-check-box">
                    <div>
                      <strong>✅ wow3d 자동 출력 가능성 검사 통과</strong>
                      <p>{activeModel.meta.supportNote}</p>
                    </div>
                    <ul>
                      <li>최소 두께: {activeModel.meta.minWallMm}mm (안전 기준 1.5mm 이상)</li>
                      <li>권장 크기: {activeModel.meta.sizeCm}cm · 어린이 무독성 라운딩 적용</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="pill-btn small-pill"
                    onClick={() =>
                      navigate(`/dashboard/orders?modelId=${encodeURIComponent(activeModel.id)}`)
                    }
                  >
                    🎁 이 3D 모델로 실물 피규어 제작 주문하기 <LineIcon name="arrow" size={18} />
                  </button>
                </>
              ) : (
                <p className="muted">모델을 불러오는 중이에요…</p>
              )}
            </article>

            <article className="dash-card studio3d-list-card">
              <header>
                <h3>🧊 우리 가족 3D 모델 보관함 ({models.length}개)</h3>
              </header>

              <div className="studio3d-model-grid">
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`studio3d-model-item ${m.id === activeModel?.id ? 'active' : ''}`}
                    onClick={() => setSelectedModelId(m.id)}
                  >
                    <img src={m.source_image_key} alt={m.meta.figureName} />
                    <strong>{m.meta.figureName}</strong>
                    <small>{m.meta.sizeCm}cm · 출력 준비 완료</small>
                  </button>
                ))}
              </div>

              <div className="studio3d-gen-box">
                <h4>✨ 동화 캐릭터 → 새 3D 모델 변환</h4>
                <p>원하는 캐릭터와 기준 크기를 고르면 출력용 3D 메쉬(.glb / .3mf)를 즉시 생성·검수해요.</p>
                <div className="studio3d-gen-controls">
                  <select
                    value={genFigureId}
                    onChange={(e) => setGenFigureId(e.target.value as ShelfFigureId)}
                  >
                    {SHELF_FIGURES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.role})
                      </option>
                    ))}
                  </select>
                  <select
                    value={genSizeCm}
                    onChange={(e) => setGenSizeCm(Number(e.target.value) as 5 | 8 | 12)}
                  >
                    <option value={5}>5cm 미니</option>
                    <option value={8}>8cm 기본</option>
                    <option value={12}>12cm 대왕</option>
                  </select>
                  <button
                    type="button"
                    className="market-btn primary"
                    disabled={genBusy}
                    onClick={handleGenerateModel}
                  >
                    {genBusy ? '3D 변환 중…' : '+ 3D 모델 생성'}
                  </button>
                </div>
              </div>
            </article>
          </section>
        </>
      ) : (
        /* ───── mode === 'orders': 실물 3D 피규어 주문 & 배송 타임라인 ───── */
        <section className="studio3d-orders-layout">
          <article className="dash-card">
            <header>
              <h3>🎁 실물 3D 피규어 제작 주문하기</h3>
              <span className="badge-sample">wow3d 전문 출력 센터 직송</span>
            </header>

            <form className="publish-form" onSubmit={handleOrderSubmit}>
              <label className="publish-field">
                <span className="publish-label">1. 제작할 3D 캐릭터 모델 선택</span>
                <select
                  className="publish-select"
                  value={activeModel?.id ?? ''}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.meta.figureName} ({m.meta.role} · 기본 {m.meta.sizeCm}cm)
                    </option>
                  ))}
                </select>
              </label>

              <div className="publish-field">
                <span className="publish-label">2. 출력 크기 선택</span>
                <div className="publish-kind-grid">
                  {SIZE_OPTIONS.map((s) => (
                    <button
                      key={s.cm}
                      type="button"
                      className={`publish-kind-card ${sizeCm === s.cm ? 'active' : ''}`}
                      onClick={() => setSizeCm(s.cm)}
                    >
                      <strong>
                        {s.label} · ₩{s.krw.toLocaleString()}
                      </strong>
                      <span>{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="publish-field">
                <span className="publish-label">3. 소재 및 마감 방식</span>
                <div className="publish-kind-grid">
                  {MATERIAL_OPTIONS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className={`publish-kind-card ${material === m.key ? 'active' : ''}`}
                      onClick={() => setMaterial(m.key)}
                    >
                      <strong>
                        {m.label} {m.addKrw > 0 ? `(+₩${m.addKrw.toLocaleString()})` : '(기본)'}
                      </strong>
                      <span>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="publish-field">
                <span className="publish-label">4. 결제 수단 선택</span>
                <div className="publish-chip-row">
                  <button
                    type="button"
                    className={`publish-chip ${payMethod === 'coins' ? 'active' : ''}`}
                    onClick={() => setPayMethod('coins')}
                  >
                    ⭐ 별 코인 결제 ({coinCost.toLocaleString()} 코인 · 보유 {wallet.balance.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    className={`publish-chip ${payMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPayMethod('card')}
                  >
                    💳 일반 결제 접수 (₩{totalKrw.toLocaleString()})
                  </button>
                </div>
              </div>

              <div className="publish-row-2col">
                <label className="publish-field">
                  <span className="publish-label">받는 분 성함</span>
                  <input
                    className="publish-input"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="예: 홍길동"
                    required
                  />
                </label>
                <label className="publish-field">
                  <span className="publish-label">연락처</span>
                  <input
                    className="publish-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    required
                  />
                </label>
              </div>

              <label className="publish-field">
                <span className="publish-label">배송 받을 주소</span>
                <input
                  className="publish-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="도로명 주소 및 상세 호수를 입력해 주세요"
                  required
                />
              </label>

              <label className="publish-field">
                <span className="publish-label">제작·배송 요청 메모</span>
                <input
                  className="publish-input"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="받침대 각인 문구나 배송 요청사항"
                />
              </label>

              {orderErr && <p className="error">{orderErr}</p>}

              <div className="studio3d-order-total">
                <div>
                  <span>최종 제작·배송 금액 (무료배송)</span>
                  <strong>
                    ₩{totalKrw.toLocaleString()}{' '}
                    {payMethod === 'coins' && <small>(⭐ {coinCost.toLocaleString()} 별 코인 차감)</small>}
                  </strong>
                </div>
                <button type="submit" className="pill-btn small-pill" disabled={orderBusy || !activeModel}>
                  <ClayIcon name="factory" size={22} tile={false} />
                  <span>{orderBusy ? '주문 접수 중…' : '피규어 제작 주문하기'}</span>
                </button>
              </div>
            </form>
          </article>

          {/* 내 주문·배송 진행 내역 */}
          <article className="dash-card">
            <header>
              <h3>🚚 내 주문 · 제작 진행 현황 ({orders.length}건)</h3>
            </header>

            {orders.length === 0 ? (
              <div className="dash-empty">
                <ClayIcon name="cube" size={58} />
                <p>
                  아직 주문한 3D 피규어가 없어요.
                  <br />
                  왼쪽 주문서에서 아이의 동화 친구를 실물 장난감으로 제작해 보세요!
                </p>
              </div>
            ) : (
              <div className="studio3d-order-list">
                {orders.map((o) => {
                  const curIdx = stepIndexOf(o.status);
                  return (
                    <div key={o.id} className="studio3d-order-card">
                      <div className="studio3d-order-head">
                        <img src={o.source_image_key} alt={o.modelMeta.figureName} />
                        <div>
                          <span className="order-id">{o.wow3dpro_order_no}</span>
                          <h4>
                            {o.modelMeta.figureName} · {o.options.sizeCm}cm
                          </h4>
                          <p>
                            {o.options.materialLabel} · ₩{o.amount.toLocaleString()}
                            {o.options.coinUsed > 0 ? ` (⭐ ${o.options.coinUsed.toLocaleString()} 코인)` : ''}
                          </p>
                        </div>
                      </div>

                      {o.status === 'cancelled' ? (
                        <p className="error">취소된 주문입니다.</p>
                      ) : (
                        <ol className="studio3d-timeline">
                          {ORDER_STEPS.map((st, idx) => (
                            <li
                              key={st.key}
                              className={idx < curIdx ? 'done' : idx === curIdx ? 'current' : ''}
                            >
                              <span className="dot" />
                              <small>{st.label}</small>
                            </li>
                          ))}
                        </ol>
                      )}

                      {o.events.length > 0 && (
                        <ul className="studio3d-events">
                          {o.events.slice(-3).map((ev, i) => (
                            <li key={i}>
                              <span>• {ev.note}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      )}

      {needOrderApprove && (
        <ParentApproveModal
          actionLabel={`'${activeModel?.meta.figureName ?? '3D 피규어'}' (${sizeCm}cm) 실물 제작 주문을 승인할까요?`}
          onClose={() => setNeedOrderApprove(false)}
          onApproved={() => {
            setNeedOrderApprove(false);
            void executeOrder();
          }}
        />
      )}

      {showWalletModal && (
        <WalletModal
          onClose={() => setShowWalletModal(false)}
          onWalletUpdated={(_w, msg) => {
            setTick((v) => v + 1);
            setNotice(msg);
          }}
        />
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </DashLayout>
  );
}
