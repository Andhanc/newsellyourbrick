import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSeoHtmlForPath } from '../server/seoHtmlRender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SKIP_PREFIXES = [
  '/api',
  '/@',
  '/node_modules',
  '/src/',
  '/assets/',
  '/uploads',
  '/health',
  '/robots.txt',
  '/sitemap',
  '/favicon',
];

function shouldSkip(pathname) {
  if (!pathname) return true;
  if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return true;
  if (/\.[a-z0-9]+$/i.test(pathname)) return true;
  return false;
}

/**
 * Vite: инъекция SEO в исходный HTML для dev/preview.
 */
export function viteSeoHtmlPlugin() {
  const backendPort = process.env.PORT || process.env.BACKEND_PORT || '3000';
  const apiOrigin = process.env.API_URL || `http://127.0.0.1:${backendPort}`;
  const siteOrigin = process.env.FRONTEND_URL || `http://localhost:${process.env.VITE_PORT || '5173'}`;

  return {
    name: 'vite-seo-html',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        const url = req.url || '/';
        const pathname = url.split('?')[0] || '/';
        const search = url.includes('?') ? url.slice(url.indexOf('?')) : '';

        if (shouldSkip(pathname)) return next();

        const accept = String(req.headers.accept || '');
        if (accept && !accept.includes('text/html') && !accept.includes('*/*')) return next();

        try {
          const indexPath = path.join(ROOT, 'index.html');
          let html = await fs.promises.readFile(indexPath, 'utf8');
          html = await server.transformIndexHtml(url, html);

          let finalHtml = html;
          try {
            finalHtml = await buildSeoHtmlForPath(indexPath, pathname, {
              origin: siteOrigin.replace(/\/$/, ''),
              apiOrigin: apiOrigin.replace(/\/$/, ''),
              search,
              html,
            });
          } catch (seoErr) {
            console.warn('[vite-seo-html]', seoErr?.message || seoErr);
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          if (req.method === 'HEAD') return res.end();
          return res.end(finalHtml);
        } catch (err) {
          return next(err);
        }
      });
    },
  };
}
