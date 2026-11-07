import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { logout, PROVIDER_NAME, removePin, savePin, updateAccount, useMe, withdraw } from '../auth';
import DashLayout from '../components/DashLayout';
import { PARENT_MENU, parentProfile, useLeaveParent, useRelock } from '../components/ParentArea';
import { isParentUnlocked, setParentUnlocked } from '../parentLock';

/**
 * 설정 (회원가입 2단계): 내 정보, 소식 받기, 부모 PIN, 로그아웃, 탈퇴.
 * 탈퇴하면 아이 프로필·책·그림 파일까지 바로 지움 (개인정보 보호법: 가입만큼 쉽게 탈퇴)
 */
export default function AccountPage() {
  const navigate = useNavigate();
  const { loading, user, reload } = useMe();
  const leave = useLeaveParent();
  const relock = useRelock();
  const [name, setName] = useState('');
  const [pin, setPin] = useState({ a: '', b: '', open: false });
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  if (!isParentUnlocked()) return <Navigate to="/parent?next=/dashboard/account" replace />;

  /** 서버 요청 공통: 실패하면 안내, PIN 이 다시 필요하면 잠금 화면으로 */
  const run = async (job: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await job();
      setNotice(ok);
      reload();
      return true;
    } catch (e) {
      if (!relock(e)) setNotice(e instanceof Error ? e.message : '처리하지 못했어요');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const member = user?.status === 'active';

  return (
    <DashLayout title="설정" profile={parentProfile(user, loading)} menu={PARENT_MENU} active={5} onLogout={leave}>
      {!loading && !member && (
        <p className="demo-banner">
          지금은 데모 가족이에요. <Link to="/login?next=/dashboard/account">로그인하면 내 정보와 부모 PIN 을 설정할 수 있어요</Link>
        </p>
      )}

      {member && user && (
        <div className="account-grid">
          <section className="dash-card account-card">
            <h2>내 정보</h2>
            <dl className="account-dl">
              <dt>로그인</dt>
              <dd>{user.providers.map((p) => PROVIDER_NAME[p]).join(', ')} 간편 로그인</dd>
              <dt>이메일</dt>
              <dd>{user.email ?? '받지 않음'}</dd>
            </dl>
            <label className="kids-field">
              <span>부를 이름</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
            </label>
            <button
              type="button"
              className="pill-btn small-pill"
              disabled={busy || !name.trim() || name.trim() === user.name}
              onClick={() => run(() => updateAccount({ name: name.trim() }), '이름을 바꿨어요')}
            >
              이름 저장
            </button>
            <label className="account-toggle">
              <input type="checkbox" checked={user.marketing} disabled={busy} onChange={(e) => run(() => updateAccount({ marketing: e.target.checked }), e.target.checked ? '소식 받기에 동의했어요' : '소식 받기를 껐어요')} />
              <span>새 기능·이벤트 소식 받기 (선택)</span>
            </label>
          </section>

          <section className="dash-card account-card">
            <h2>부모 PIN</h2>
            <p className="muted">
              {user.hasPin
                ? '부모 모드에 들어올 때 숫자 4자리를 물어요. 5번 틀리면 10분 동안 잠겨요.'
                : '지금은 덧셈 문제로 부모 모드를 지켜요. 숫자 4자리 PIN 을 만들면 더 안전해요.'}
            </p>
            {pin.open ? (
              <form
                className="pin-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (pin.a !== pin.b) return setNotice('두 번 넣은 PIN 이 달라요');
                  if (await run(() => savePin(pin.a), 'PIN 을 저장했어요')) setPin({ a: '', b: '', open: false });
                }}
              >
                <label className="kids-field">
                  <span>새 PIN (숫자 4자리)</span>
                  <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin.a} onChange={(e) => setPin((p) => ({ ...p, a: e.target.value.replace(/\D/g, '') }))} autoFocus />
                </label>
                <label className="kids-field">
                  <span>한 번 더</span>
                  <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin.b} onChange={(e) => setPin((p) => ({ ...p, b: e.target.value.replace(/\D/g, '') }))} />
                </label>
                <div className="kids-form-actions">
                  <button type="submit" className="pill-btn small-pill" disabled={busy || pin.a.length !== 4 || pin.b.length !== 4}>
                    PIN 저장
                  </button>
                  <button type="button" className="pill-btn small-pill alt" onClick={() => setPin({ a: '', b: '', open: false })}>
                    취소
                  </button>
                </div>
              </form>
            ) : (
              <div className="kids-form-actions">
                <button type="button" className="pill-btn small-pill" onClick={() => setPin({ a: '', b: '', open: true })}>
                  {user.hasPin ? 'PIN 바꾸기' : 'PIN 만들기'}
                </button>
                {user.hasPin && (
                  <button
                    type="button"
                    className="pill-btn small-pill alt"
                    disabled={busy}
                    onClick={() => window.confirm('PIN 을 없애고 덧셈 문제로 돌아갈까요?') && run(removePin, 'PIN 을 없앴어요')}
                  >
                    PIN 없애기
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="dash-card account-card">
            <h2>로그아웃</h2>
            <p className="muted">이 기기에서만 로그아웃해요. 기기에 보관한 책장 내용도 함께 지워요.</p>
            <button
              type="button"
              className="pill-btn small-pill alt"
              onClick={async () => {
                setParentUnlocked(false);
                await logout();
                navigate('/');
              }}
            >
              로그아웃
            </button>
          </section>

          <section className="dash-card account-card danger-card">
            <h2>탈퇴</h2>
            <p>
              탈퇴하면 부모 계정, 아이 프로필, 만든 책과 그림 파일이 <strong>바로 모두 지워지고 되돌릴 수 없어요.</strong> 카카오·네이버·구글 쪽 연결은 각
              서비스의 "연결된 앱" 설정에서 끊을 수 있어요.
            </p>
            <label className="kids-field">
              <span>
                계속하려면 <strong>탈퇴</strong> 라고 적어 주세요
              </span>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <button
              type="button"
              className="danger-btn"
              disabled={busy || confirm.trim() !== '탈퇴'}
              onClick={async () => {
                if (await run(() => withdraw('탈퇴'), '탈퇴했어요')) {
                  setParentUnlocked(false);
                  navigate('/', { replace: true });
                }
              }}
            >
              탈퇴하기
            </button>
          </section>
        </div>
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </DashLayout>
  );
}
