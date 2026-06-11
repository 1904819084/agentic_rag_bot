const AUTH_SESSION_COOKIE_NAME = 'rag_auth_session';
const FEISHU_OAUTH_STATE_COOKIE_NAME = 'rag_feishu_oauth_state';
const FEISHU_OAUTH_STATE_TTL_SECONDS = 10 * 60;

export function getAuthSessionCookieName() {
  return AUTH_SESSION_COOKIE_NAME;
}

export function getFeishuOAuthStateCookieName() {
  return FEISHU_OAUTH_STATE_COOKIE_NAME;
}

export function createAuthSessionCookie(input: { sessionId: string; expiresAt: string }) {
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((new Date(input.expiresAt).getTime() - Date.now()) / 1000),
  );

  return [
    `${AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(input.sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

export function clearAuthSessionCookie() {
  return [
    `${AUTH_SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
}

export function createFeishuOAuthStateCookie(state: string) {
  return [
    `${FEISHU_OAUTH_STATE_COOKIE_NAME}=${encodeURIComponent(state)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${FEISHU_OAUTH_STATE_TTL_SECONDS}`,
  ].join('; ');
}

export function clearFeishuOAuthStateCookie() {
  return [
    `${FEISHU_OAUTH_STATE_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
}

export function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}
