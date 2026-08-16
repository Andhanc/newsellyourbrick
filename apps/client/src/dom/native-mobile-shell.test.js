import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const screenSource = await readFile(new URL('./public-page-screen.tsx', import.meta.url), 'utf8')
const domSource = await readFile(new URL('./public-page.dom.tsx', import.meta.url), 'utf8')
const shellCss = await readFile(new URL('./legacy-public-shell.css', import.meta.url), 'utf8')
const profileSource = await readFile(new URL('../legacy/pages/TestPage.jsx', import.meta.url), 'utf8')
const roleSwitchSource = await readFile(
  new URL('../legacy/hooks/useRoleSwitchFlow.js', import.meta.url),
  'utf8',
)
const discoverSource = await readFile(
  new URL('../legacy/pages/MobileDiscoverCatalog.jsx', import.meta.url),
  'utf8',
)
const loginSource = await readFile(
  new URL('../legacy/components/LoginModal.jsx', import.meta.url),
  'utf8',
)
const authGateSource = await readFile(
  new URL('../legacy/utils/siteAuthGate.js', import.meta.url),
  'utf8',
)
const appVersionSource = await readFile(
  new URL('../legacy/utils/appVersion.js', import.meta.url),
  'utf8',
)
const authServiceSource = await readFile(
  new URL('../legacy/services/authService.js', import.meta.url),
  'utf8',
)
const nativePropertySource = await readFile(
  new URL('../../app/property/[slugOrId].tsx', import.meta.url),
  'utf8',
)
const mirroredMenuRouteSources = await Promise.all(
  [
    '../../app/favorites.tsx',
    '../../app/wallet.tsx',
    '../../app/history.tsx',
    '../../app/subscriptions.tsx',
    '../../app/chat.tsx',
    '../../app/calculator.tsx',
    '../../app/compare.tsx',
    '../../app/property/[slugOrId].tsx',
  ].map((path) => readFile(new URL(path, import.meta.url), 'utf8')),
)

test('profile save celebration invokes the native Android vibration bridge once per opening', () => {
  assert.match(screenSource, /Vibration\.vibrate\(\[0, 350, 120, 350, 120, 450, 120, 450\], false\)/)
  assert.match(domSource, /onProfileSavedVibration/)
  assert.match(profileSource, /profileCelebrationVibrationStartedRef/)
  assert.match(profileSource, /triggerNativeProfileSavedVibration\(\)/)
  assert.match(profileSource, /\[showProfileCompleteCelebration\]/)
})

test('native Expo pages suppress only the website footer', () => {
  assert.match(
    shellCss,
    /\.expo-public-page #site-footer,[\s\S]*\.expo-public-page \.footer,[\s\S]*display:\s*none !important/,
  )
  assert.match(domSource, /<MobileDiscoverPage hideFooter \/>/)
  assert.match(discoverSource, /!hideFooter/)
})

test('all email login fallbacks use the native router instead of file URLs', () => {
  assert.match(loginSource, /await navigateAfterAuth\(redirectPath, \{[\s\S]*authToken: result\.authToken \|\| null/)
  assert.match(loginSource, /navigateNativeDom\(path\)/)
  assert.match(loginSource, /await switchNativeSession\(/)
  assert.match(authServiceSource, /authToken: data\.authToken \|\| null/)
  assert.doesNotMatch(loginSource, /window\.location\.href = redirectPath/)
})

test('WhatsApp and verified email sessions are adopted by the native provider', () => {
  assert.match(loginSource, /navigateAfterAuth\(cabinetPath, \{ user, authToken \}\)/)
  assert.match(loginSource, /navigateAfterAuth\('\/profile', \{ user, authToken \}\)/)
  assert.match(loginSource, /if \(nativeAuthSuccess\)/)
})

test('native custom auth never fabricates a local-only backend session', () => {
  assert.match(authServiceSource, /if \(isBundledNativeDom\(\)\) \{[\s\S]*Вход через WhatsApp не выполнен/)
  assert.match(authServiceSource, /if \(isBundledNativeDom\(\)\) \{[\s\S]*Регистрация не выполнена/)
})

test('native backend session is authoritative for the legacy profile guard', () => {
  assert.match(domSource, /setNativeSessionAuthenticated\(Boolean\(user\)\)/)
  assert.match(authGateSource, /getNativeSessionAuthenticated\(\)/)
  assert.match(profileSource, /if \(isBundledNativeDom\(\)\) return/)
  assert.match(screenSource, /<Redirect href="\/login" \/>/)
})

test('native side menu receives the Android app version', () => {
  assert.match(screenSource, /nativeAppVersion=\{Constants\.expoConfig\?\.version \|\| '0\.0\.0'\}/)
  assert.match(domSource, /setAppVersion\(nativeAppVersion\)/)
  assert.match(appVersionSource, /export function setAppVersion/)
})

test('native role switching adopts the new backend session before routing', () => {
  assert.match(domSource, /onSwitchSession/)
  assert.match(roleSwitchSource, /hasNativeSessionSwitch\(\)/)
  assert.match(roleSwitchSource, /await switchNativeSession\(/)
  assert.match(roleSwitchSource, /authToken:\s*result\.authToken \|\| null/)
})

test('side-menu screens render the same legacy pages as the website', () => {
  for (const routeSource of mirroredMenuRouteSources) {
    assert.match(routeSource, /PublicPageScreen/)
  }
  for (const path of [
    '/calculator',
    '/chat',
    '/compare',
    '/favorites',
    '/wallet',
    '/subscriptions',
    '/history',
  ]) {
    assert.match(domSource, new RegExp(`path="${path.replace('/', '\\/')}"`))
  }
})

test('property and liked pages share the website favorites provider and backend flow', () => {
  assert.match(nativePropertySource, /PublicPageScreen/)
  assert.match(domSource, /<PropertyFavoritesProvider>/)
  assert.match(domSource, /path="\/property\/:slugOrId" element=\{<PropertyDetailPage \/>\}/)
  assert.match(domSource, /path="\/favorites" element=\{<Favorites \/>\}/)
  assert.match(screenSource, /segments\[propertyIndex \+ 2\] === 'test-drive'/)
})
