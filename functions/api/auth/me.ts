import type { Env } from '../../_lib/env';
import { json } from '../../_lib/http';
import { enabledProviders, sessionParent } from '../../_lib/auth';
import { isUnlocked } from '../../_lib/parent';

/** 지금 로그인한 부모(없으면 null)와 쓸 수 있는 간편 로그인 수단 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await sessionParent(request, env);
  let providers: string[] = [];
  if (me) {
    const { results } = await env.DB.prepare('SELECT provider FROM auth_identities WHERE parent_id = ?').bind(me.id).all<{ provider: string }>();
    providers = results.map((r) => r.provider);
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
    },
    available: enabledProviders(env),
  });
};
