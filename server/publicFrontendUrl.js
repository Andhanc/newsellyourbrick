/**
 * Stripe Checkout требует success_url/cancel_url со схемой (https://).
 * На Railway FRONTEND_URL часто задают как ${{RAILWAY_PUBLIC_DOMAIN}} без схемы.
 */
export function resolvePublicFrontendBase(env = process.env, req = null) {
  const raw = String(
    env.FRONTEND_URL ||
      env.PUBLIC_SITE_URL ||
      env.SITE_URL ||
      env.RAILWAY_PUBLIC_DOMAIN ||
      '',
  ).trim();

  let candidate = stripTrailingSlash(raw);
  candidate = ensureUrlScheme(candidate);

  if (!candidate && req) {
    const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '')
      .split(',')[0]
      .trim();
    const proto = String(
      req.headers?.['x-forwarded-proto'] || (env.NODE_ENV === 'production' ? 'https' : 'http'),
    )
      .split(',')[0]
      .trim();
    if (host) candidate = ensureUrlScheme(`${proto}://${host}`);
  }

  return candidate || 'http://localhost:5173';
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function ensureUrlScheme(value) {
  const trimmed = stripTrailingSlash(value);
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed);
  return `${isLocal ? 'http' : 'https'}://${trimmed}`;
}
