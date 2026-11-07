import { useEffect, useRef, useState } from 'react';
import { confirmGuardian, type VerifyConfig } from '../auth';
import ClayArt from './ClayArt';

/**
 * 보호자 본인인증 (법정대리인 동의 확인, PRD 9.2).
 * 포트원 V2 본인인증 창을 띄우고, 받은 인증 건 번호를 서버(/api/auth/verify)가 직접 확인함.
 * 휴대폰에서는 인증 회사 화면으로 넘어갔다가 ?identityVerificationId=… 를 붙여 이 화면으로 돌아옴
 */
declare global {
  interface Window {
    PortOne?: {
      requestIdentityVerification: (o: {
        storeId: string;
        identityVerificationId: string;
        channelKey: string;
        redirectUrl?: string;
      }) => Promise<{ identityVerificationId?: string; code?: string; message?: string } | undefined>;
    };
  }
}

const SDK = 'https://cdn.portone.io/v2/browser-sdk.js';

function loadSdk(): Promise<void> {
  if (window.PortOne) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('본인인증 창을 불러오지 못했어요'));
    document.head.appendChild(s);
  });
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** 인증 창 띄우기 → 인증 건 번호 */
async function runVerification(cfg: VerifyConfig): Promise<string> {
  if (cfg.mode === 'dev') {
    // 로컬 시험: 확인 = 성인 보호자, 취소 = 미성년으로 시험
    return newId(window.confirm('[시험용 본인인증] 성인 보호자로 인증할까요?\n(취소를 누르면 미성년자로 시험해요)') ? 'dev-ok' : 'dev-minor');
  }
  if (cfg.mode !== 'portone' || !cfg.storeId || !cfg.channelKey) throw new Error('본인인증은 아직 준비 중이에요');
  await loadSdk();
  const id = newId('tbv');
  const back = new URL(window.location.href);
  back.searchParams.delete('identityVerificationId');
  const res = await window.PortOne!.requestIdentityVerification({
    storeId: cfg.storeId,
    identityVerificationId: id,
    channelKey: cfg.channelKey,
    redirectUrl: back.toString(),
  });
  if (res?.code) throw new Error(res.message ?? '본인인증을 마치지 못했어요');
  return id;
}

export default function GuardianVerify({ config, onDone }: { config: VerifyConfig; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  const finish = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await confirmGuardian(id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : '본인인증을 확인하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  // 휴대폰: 인증 회사 화면에서 돌아온 경우
  useEffect(() => {
    if (handled.current) return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get('identityVerificationId');
    if (!id) return;
    handled.current = true;
    const code = url.searchParams.get('code');
    const message = url.searchParams.get('message');
    for (const k of ['identityVerificationId', 'code', 'message']) url.searchParams.delete(k);
    window.history.replaceState(null, '', url.pathname + url.search);
    if (code) setError(message ?? '본인인증을 마치지 못했어요');
    else finish(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setError(null);
    try {
      await finish(await runVerification(config));
    } catch (e) {
      setError(e instanceof Error ? e.message : '본인인증을 마치지 못했어요');
    }
  };

  return (
    <div className="verify-box">
      <ClayArt name="heart" size={56} />
      <h2>보호자 본인인증</h2>
      <p>
        아이 정보를 안전하게 지키기 위해 <strong>보호자(성인)인지</strong> 본인인증으로 한 번 확인해요.
      </p>
      <p className="verify-note">이름·전화번호·생년월일은 저장하지 않고, 인증을 마친 날짜만 남겨요.</p>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="login-btn" onClick={start} disabled={busy || config.mode === 'off'}>
        {busy ? '확인하는 중…' : config.mode === 'dev' ? '본인인증하기 (시험용)' : '본인인증하기'}
      </button>
    </div>
  );
}
