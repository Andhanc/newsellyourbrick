import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

test('role arrival UI, handoff, onboarding integration and locales keep web/legacy parity', async () => {
  const paths = [
    'components/RoleSwitchArrival.jsx', 'components/RoleSwitchArrival.css',
    'utils/roleSwitchArrival.js', 'hooks/useRoleSwitchFlow.js',
    'utils/roleSwitchTransition.js', 'services/authService.js', 'App.jsx',
    'components/RoleSwitchTransitionHost.jsx', 'components/RoleSwitchPreloader.jsx', 'components/RoleSwitchPreloader.css',
    'components/ClerkAuthHandler.jsx', 'components/ClerkAuthSync.jsx', 'pages/OwnerProfileTestPage.jsx',
    'components/CabinetProfileRoute.jsx', 'components/OwnerCabinetWelcomeHost.jsx',
    'pages/OwnerTestPage.jsx', 'pages/TestPage.jsx',
    ...['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv'].map(lang => `i18n/locales/mainPage/${lang}.json`),
  ]
  for (const path of paths) {
    const web = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    const legacy = await readFile(new URL(`../../apps/client/src/legacy/${path}`, import.meta.url), 'utf8')
    assert.equal(web, legacy, `${path} must match the legacy client`)
  }
})

test('generated arrival artwork has transparency and is available to both clients', async () => {
  const web = await readFile(new URL('../../public/images/role-switch/cabinet-arrival-v1.webp', import.meta.url))
  const legacy = await readFile(new URL('../../apps/client/public/images/role-switch/cabinet-arrival-v1.webp', import.meta.url))
  assert.deepEqual(web, legacy)
  const metadata = await sharp(web).metadata()
  assert.equal(metadata.hasAlpha, true)
  assert.equal(metadata.width, 768)
})

test('the early document loader uses the same styles and boot logic in both clients', async () => {
  const styles = await readFile(new URL('./RoleSwitchPreloader.css', import.meta.url), 'utf8')
  for (const base of ['../../public/', '../../apps/client/public/']) {
    assert.equal(await readFile(new URL(`${base}role-switch-preloader.css`, import.meta.url), 'utf8'), styles)
  }
  const boot = await readFile(new URL('../../public/role-switch-boot.js', import.meta.url), 'utf8')
  assert.equal(await readFile(new URL('../../apps/client/public/role-switch-boot.js', import.meta.url), 'utf8'), boot)
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8')
  assert.ok(html.indexOf('role-switch-boot.js') < html.indexOf('/src/main.jsx'))
  assert.match(html, /role-switch-preloader\.css/)
})
