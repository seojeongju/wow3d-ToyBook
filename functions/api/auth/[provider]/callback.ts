import type { Env } from '../../../_lib/env';
import { newId } from '../../../_lib/http';
import { cookie, createSession, enabledProviders, fetchProfile, isProvider, OAUTH_COOKIE, readCookie, safeNext } from '../../../_lib/auth';

/**
 * 간편 로그인에서 돌아오는 곳.
 * 처음 온 사람은 'pending'(약관 동의 전) 계정을 만들고 /signup 으로, 이미 가입한 사람은 원래 가려던 곳(기본 /profiles)으로
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = (code: string) => {
    const headers = new Headers({ location: `${origin}/login?error=${code}`, 'cache-control': 'no-store' });
    headers.append('set-cookie', cookie(request, OAUTH_COOKIE, '', 0, '/api/auth/'));
    return new Response(null, { status: 302, headers });
  };

  const provider = String(params.provider);
  if (!isProvider(provider) || !enabledProviders(env).includes(provider)) return fail('not_ready');
  // 사용자가 동의 화면에서 취소함
  if (url.searchParams.get('error')) return fail('cancelled');

  const [savedState, savedProvider, savedNext] = (readCookie(request, OAUTH_COOKIE) ?? '').split('|');
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!code || !state || state !== savedState || savedProvider !== provider) return fail('expired');

  let profile;
  try {
    profile = await fetchProfile(env, request, provider, code, state);
  } catch (e) {
    console.error('간편 로그인 실패', provider, e instanceof Error ? e.message : e);
    return fail('provider');
  }

  const now = new Date().toISOString();
  const found = await env.DB.prepare(
    'SELECT p.id, p.status FROM auth_identities i JOIN parents p ON p.id = i.parent_id WHERE i.provider = ? AND i.provider_user_id = ?',
  )
    .bind(provider, profile.id)
    .first<{ id: string; status: 'pending' | 'active' }>();

  let parentId: string;
  let status: 'pending' | 'active';
  if (found) {
    parentId = found.id;
    status = found.status;
    await env.DB.prepare('UPDATE parents SET last_login_at = ? WHERE id = ?').bind(now, parentId).run();
  } else {
    parentId = newId();
    status = 'pending';
    await env.DB.batch([
      env.DB.prepare("INSERT INTO parents (id, display_name, email, status, last_login_at) VALUES (?, ?, ?, 'pending', ?)").bind(
        parentId,
        (profile.nickname ?? '').trim().slice(0, 30) || '부모님',
        profile.email,
        now,
      ),
      env.DB.prepare('INSERT INTO auth_identities (provider, provider_user_id, parent_id, email) VALUES (?, ?, ?, ?)').bind(
        provider,
        profile.id,
        parentId,
        profile.email,
      ),
    ]);
  }

  const next = safeNext(savedNext);
  const to = status === 'pending' ? `/signup${next ? `?next=${encodeURIComponent(next)}` : ''}` : (next ?? '/profiles');
  const headers = new Headers({ location: origin + to, 'cache-control': 'no-store' });
  headers.append('set-cookie', await createSession(env, request, parentId));
  headers.append('set-cookie', cookie(request, OAUTH_COOKIE, '', 0, '/api/auth/'));
  return new Response(null, { status: 302, headers });
};
