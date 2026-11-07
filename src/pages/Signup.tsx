import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { cancelSignup, completeSignup, PROVIDER_NAME, useMe } from '../auth';
import ClayArt from '../components/ClayArt';
import { SubHeader } from '../components/SiteHeader';
import Tobi from '../components/Tobi';
import { setParentUnlocked } from '../parentLock';

/**
 * 가입 마무리 (간편 로그인 직후). 필수 동의 4가지 + 선택 1가지를 받고 계정을 엶.
 * 아이(만 14세 미만) 정보는 보호자가 법정대리인으로 동의해야 저장 가능 (PRD 9·11장, 개인정보 보호법 제22조의2)
 */
type Key = 'age14' | 'terms' | 'privacy' | 'guardian' | 'marketing';

const ITEMS: { key: Key; required: boolean; label: string; link?: string; detail?: string }[] = [
  { key: 'age14', required: true, label: '만 14세 이상이며, 함께 쓸 아이의 보호자예요' },
  { key: 'terms', required: true, label: '이용약관에 동의해요', link: '/terms' },
  {
    key: 'privacy',
    required: true,
    label: '개인정보 수집·이용에 동의해요',
    link: '/privacy',
    detail: '받는 정보: 간편 로그인 회원 번호, 별명, 이메일(제공한 경우) · 쓰는 곳: 회원 확인과 로그인 · 보관: 탈퇴할 때까지',
  },
  {
    key: 'guardian',
    required: true,
    label: '아이 정보 수집에 법정대리인(보호자)으로 동의해요',
    detail: '아이 프로필에는 실명·연락처 없이 별명, 태어난 해, 좋아하는 것만 넣어요.',
  },
  { key: 'marketing', required: false, label: '새 기능·이벤트 소식 받기' },
];

const EMPTY: Record<Key, boolean> = { age14: false, terms: false, privacy: false, guardian: false, marketing: false };

export default function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const { loading, user } = useMe();
  const [agree, setAgree] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 로그인 전이면 로그인 화면으로, 이미 가입을 마쳤으면 책장으로
  useEffect(() => {
    if (loading || done) return;
    if (!user) navigate('/login', { replace: true });
    else if (user.status === 'active') navigate(next ?? '/profiles', { replace: true });
  }, [loading, user, done, next, navigate]);

  const all = ITEMS.every((i) => agree[i.key]);
  const requiredOk = ITEMS.every((i) => !i.required || agree[i.key]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await completeSignup(agree);
      // 방금 보호자 동의를 마쳤으니 이어서 아이 프로필을 만들 수 있게 부모 모드를 열어 둠
      setParentUnlocked(true);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '가입을 마치지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const quit = async () => {
    if (!window.confirm('가입을 그만둘까요? 받아 둔 회원 정보는 바로 지워요.')) return;
    setBusy(true);
    await cancelSignup();
    navigate('/', { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-header-wrap">
        <SubHeader />
      </div>

      <section className="login-card signup-card">
        <span className="login-heart" aria-hidden>
          <ClayArt name={done ? 'star' : 'heart'} size={40} />
        </span>

        {done ? (
          <>
            <h1 className="login-title">가입을 마쳤어요!</h1>
            <p className="login-sub">이제 아이 프로필을 만들면 아이만의 책장이 생겨요.</p>
            <div className="signup-done">
              <Tobi pose="wave" size={170} />
              <button type="button" className="login-btn" onClick={() => navigate(next ?? '/dashboard/kids')}>
                아이 프로필 만들기
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="login-title">가입을 마무리해요</h1>
            <p className="login-sub">
              {user ? (
                <>
                  <strong>{user.name}</strong>님, 반가워요! ({user.providers.map((p) => PROVIDER_NAME[p]).join('·')} 로그인)
                </>
              ) : (
                '확인하는 중…'
              )}
              <br />
              아래 내용에 동의하면 가입이 끝나요.
            </p>

            <div className="login-form consent-form">
              <label className="consent-all">
                <input type="checkbox" checked={all} onChange={(e) => setAgree(Object.fromEntries(ITEMS.map((i) => [i.key, e.target.checked])) as Record<Key, boolean>)} />
                <span>모두 동의해요</span>
              </label>

              <ul className="consent-list">
                {ITEMS.map((i) => (
                  <li key={i.key}>
                    <label>
                      <input type="checkbox" checked={agree[i.key]} onChange={(e) => setAgree((a) => ({ ...a, [i.key]: e.target.checked }))} />
                      <span>
                        <em className={i.required ? 'req' : 'opt'}>{i.required ? '필수' : '선택'}</em> {i.label}
                      </span>
                    </label>
                    {i.link && (
                      <Link to={i.link} target="_blank" className="consent-view">
                        보기
                      </Link>
                    )}
                    {i.detail && <p className="consent-detail">{i.detail}</p>}
                  </li>
                ))}
              </ul>

              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}

              <button type="button" className="login-btn" disabled={!requiredOk || busy || !user} onClick={submit}>
                동의하고 가입하기
              </button>
              <button type="button" className="login-sub-btn" onClick={quit} disabled={busy || !user}>
                가입 그만두기
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
