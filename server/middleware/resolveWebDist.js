/**
 * Express helper: prefer Expo Web dist when EXPO_WEB_DIST is set,
 * otherwise fall back to Vite `dist/`.
 *
 * Usage later in server.js SPA fallback:
 *   const webDist = resolveWebDist(__dirname)
 */
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))

export function resolveWebDist(serverDir = join(here, '..')) {
  const expoEnv = String(process.env.EXPO_WEB_DIST || '').trim()
  if (expoEnv) {
    const p = expoEnv.startsWith('/') ? expoEnv : join(serverDir, '..', expoEnv)
    if (existsSync(join(p, 'index.html'))) return p
  }
  const expoDefault = join(serverDir, '..', 'apps/client/dist-web')
  if (process.env.USE_EXPO_WEB === '1' && existsSync(join(expoDefault, 'index.html'))) {
    return expoDefault
  }
  return join(serverDir, '..', 'dist')
}
