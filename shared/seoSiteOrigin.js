/** Публичный origin сайта (canonical, OG, sitemap). */
export function seoSiteOrigin() {
  return (
    process.env.FRONTEND_URL ||
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

/**
 * @param {import('express').Request} [req]
 */
export function resolveRequestSiteOrigin(req) {
  const configured = seoSiteOrigin();
  if (!req) return configured;
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) {
    return configured;
  }
  const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  if (host) return `${proto}://${host}`.replace(/\/$/, '');
  return configured;
}

/**
 * Origin для абсолютных URL загрузок (/uploads/...).
 * @param {import('express').Request} [req]
 */
export function resolveApiMediaOrigin(req) {
  const env =
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_URL ||
    process.env.SERVER_URL ||
    '';
  if (env) return String(env).replace(/\/$/, '');
  if (!req) return seoSiteOrigin();
  const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.get('host') || '').split(',')[0].trim();
  if (host) return `${proto}://${host}`.replace(/\/$/, '');
  return seoSiteOrigin();
}
