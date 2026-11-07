import type { Env } from '../../_lib/env';
import { json } from '../../_lib/http';
import { enabledProviders, sessionParent } from '../../_lib/auth';
import { isUnlocked } from '../../_lib/parent';
import { verifyClientConfig, verifyMode } from '../../_lib/verify';
import { isAdmin } from '../../_lib/admin';

/** 지금 로그인한 부모(없으면 null)와 쓸 수 있는 간편 로그인 수단 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await sessionParent(request, env);
  let providers: string[] = [];
  let logins: { provider: string; email: string | null }[] = [];
  if (me) {
    const { results } = await env.DB.prepare('SELECT provider, email FROM auth_identities WHERE parent_id = ?')
      .bind(me.id)
      .all<{ provider: string; email: string | null }>();
    providers = results.map((r) => r.provider);
    logins = results;
  }
  return json({
    user: me && {
      name: me.display_name,
      email: me.email,
      status: me.status,
      marketing: Boolean(me.marketing_agreed_at),
      providers,
      hasPin: Boolean(me.has_pin),
      /** 부모 기능을 지금 쓸 수 있는지 (PIN 이 없거나, 이 세션에서 PIN 을 맞힘) */
      unlocked: isUnlocked(me),
      /** 약관 동의를 마쳤는지 (본인인증 단계만 남은 경우 true) */
      consented: Boolean(me.terms_agreed_at),
      /** 만 14세 이상 확인 방법: provider(카카오·네이버 정보) · self(본인 확인) */
      ageCheck: me.age_check,
      guardianVerified: Boolean(me.guardian_verified_at),
      /** 본인인증이 켜져 있는데 아직 안 했으면 true (아이 프로필 만들기 전에 필요) */
      verifyRequired: verifyMode(env) !== 'off' && !me.guardian_verified_at,
      /** 운영자인지 (functions/_lib/admin.ts) */
      isAdmin: me.status === 'active' && (await isAdmin(env, me.id)),
      /** 본인 로그인 수단별로 받은 이메일 (운영자 등록 확인용, 본인에게만 보임) */
      logins,
    },
    available: enabledProviders(env),
    verify: verifyClientConfig(env),
  });
};
