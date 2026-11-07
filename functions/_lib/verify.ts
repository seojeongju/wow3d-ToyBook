import type { Env } from './env';

/**
 * 보호자 본인인증 (법정대리인 동의 확인, PRD 9.2).
 * - portone: 포트원 V2 본인인증 (다날 휴대폰 본인인증·KG이니시스 통합인증 등 포트원 콘솔에서 고른 채널).
 *   PORTONE_API_SECRET + PORTONE_STORE_ID + PORTONE_IDV_CHANNEL_KEY 가 모두 있어야 켜짐
 * - dev: 로컬 시험용 (ALLOW_DEV_LOGIN=true 이고 포트원 키가 없을 때)
 * - off: 아직 인증 업체가 없음 → 가입 화면의 동의 체크로만 받음
 * 결과에서 나이만 확인하고 이름·전화번호·CI 는 저장하지 않음
 */
export type VerifyMode = 'off' | 'portone' | 'dev';

/** 보호자는 성인이어야 함 (민법상 법정대리인) */
const GUARDIAN_MIN_AGE = 19;

export function verifyMode(env: Env): VerifyMode {
  if (env.PORTONE_API_SECRET && env.PORTONE_STORE_ID && env.PORTONE_IDV_CHANNEL_KEY) return 'portone';
  if (env.ALLOW_DEV_LOGIN === 'true') return 'dev';
  return 'off';
}

/** 화면에 알려 줄 설정 (상점 id·채널 키는 공개해도 되는 값) */
export function verifyClientConfig(env: Env) {
  const mode = verifyMode(env);
  return mode === 'portone' ? { mode, storeId: env.PORTONE_STORE_ID, channelKey: env.PORTONE_IDV_CHANNEL_KEY } : { mode };
}

/** "1990-05-01" → 오늘 기준 만 나이 */
export function fullAge(birthDate: string, now = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

export type VerifyResult = { ok: true; method: string } | { ok: false; message: string; status: number };

/** 인증 건 번호로 결과를 회사 서버에서 직접 확인 (화면이 보낸 값은 믿지 않음) */
export async function confirmVerification(env: Env, id: string): Promise<VerifyResult> {
  const mode = verifyMode(env);
  if (mode === 'off') return { ok: false, message: '본인인증은 아직 준비 중이에요', status: 400 };

  let birthDate: string | undefined;
  if (mode === 'dev') {
    // 시험: dev-ok-… 은 성인, dev-minor-… 은 미성년으로 처리
    if (!/^dev-(ok|minor)-[\w-]{6,}$/.test(id)) return { ok: false, message: '시험용 인증 번호가 아니에요', status: 400 };
    birthDate = id.startsWith('dev-ok-') ? '1990-01-01' : `${new Date().getFullYear() - 10}-01-01`;
  } else {
    const res = await fetch(`https://api.portone.io/identity-verifications/${encodeURIComponent(id)}`, {
      headers: { authorization: `PortOne ${env.PORTONE_API_SECRET}` },
    });
    const body = (await res.json().catch(() => null)) as { status?: string; verifiedCustomer?: { birthDate?: string } } | null;
    if (!res.ok || !body) return { ok: false, message: '본인인증 결과를 확인하지 못했어요', status: 502 };
    if (body.status !== 'VERIFIED') return { ok: false, message: '본인인증이 끝나지 않았어요', status: 400 };
    birthDate = body.verifiedCustomer?.birthDate;
  }

  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { ok: false, message: '생년월일을 확인하지 못했어요', status: 502 };
  if (fullAge(birthDate) < GUARDIAN_MIN_AGE) {
    return { ok: false, message: '보호자(성인)만 인증할 수 있어요. 아이는 보호자 계정 안의 프로필로 이용해 주세요', status: 403 };
  }
  return { ok: true, method: mode };
}
