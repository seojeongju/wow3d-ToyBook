import type { Env } from '../../../_lib/env';
import { authorizeUrl, cookie, enabledProviders, isProvider, OAUTH_COOKIE, randomToken, safeNext } from '../../../_lib/auth';

/** 간편 로그인 시작: 위조 방지용 state 를 쿠키에 두고 카카오·네이버·구글 로그인 화면으로 보냄 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const provider = String(params.provider);
  const origin = new URL(request.url).origin;
  if (!isProvider(provider) || !enabledProviders(env).includes(provider)) {
    return Response.redirect(`${origin}/login?error=not_ready`, 302);
  }
  const state = randomToken(18);
  const next = safeNext(new URL(request.url).searchParams.get('next')) ?? '';
  const headers = new Headers({ location: authorizeUrl(env, request, provider, state), 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(request, OAUTH_COOKIE, `${state}|${provider}|${next}`, 600, '/api/auth/'));
  return new Response(null, { status: 302, headers });
};
