/**
 * SEO cutover notes for Expo Web.
 *
 * Production:
 * - Set `USE_EXPO_WEB=1` (or `EXPO_WEB_DIST=apps/client/dist-web`) after `npm run export:web` in apps/client.
 * - Express uses `resolveWebDist()` for static + SPA + SEO 404 templates.
 * - Keep Express `seoHtmlRender.js` / redirects / sitemap / robots as source of truth.
 * - Do NOT rely on Expo SSR alpha for crawl parity on first cutover.
 *
 * Dev: Vite remains the SEO/visual reference at :5173 until canary switch.
 */
export const SEO_CUTOVER = {
  adapter: 'express-seoHtmlRender',
  expoWebOutput: 'single',
  envFlag: 'USE_EXPO_WEB=1',
  distPath: 'apps/client/dist-web',
  preservePaths: [
    '/property/:slug',
    '/:country/:city/:type?',
    '/news/:slug',
    '/co-investment/:slug',
  ],
}
