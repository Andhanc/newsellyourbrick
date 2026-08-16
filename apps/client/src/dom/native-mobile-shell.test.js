import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const screenSource = await readFile(new URL('./public-page-screen.tsx', import.meta.url), 'utf8')
const domSource = await readFile(new URL('./public-page-v4.dom.tsx', import.meta.url), 'utf8')
const authScreenSource = await readFile(new URL('./auth-page-screen.tsx', import.meta.url), 'utf8')
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
const favoritesContextSource = await readFile(
  new URL('../legacy/context/PropertyFavoritesContext.jsx', import.meta.url),
  'utf8',
)
const nativeBridgeSource = await readFile(
  new URL('../legacy/utils/nativeDomBridge.js', import.meta.url),
  'utf8',
)
const pushSource = await readFile(new URL('../notifications/push.ts', import.meta.url), 'utf8')
const pushProviderSource = await readFile(
  new URL('../notifications/push-provider.tsx', import.meta.url),
  'utf8',
)
const localeFiles = await Promise.all(
  ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv'].map(async (locale) => ({
    locale,
    messages: JSON.parse(
      await readFile(
        new URL(`../legacy/i18n/locales/mainPage/${locale}.json`, import.meta.url),
        'utf8',
      ),
    ),
  })),
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
  assert.match(screenSource, /const nativeAppVersion = Constants\.expoConfig\?\.version \|\| '0\.0\.0'/)
  assert.match(screenSource, /nativeAppVersion=\{nativeAppVersion\}/)
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

test('first favorite drawer also schedules a localized native notification that opens auction', () => {
  assert.equal(
    favoritesContextSource.match(
      /triggerNativeFirstFavoriteNotification\(t\('firstFavoriteNotification_body'\)\)/g,
    )?.length,
    2,
  )
  assert.match(nativeBridgeSource, /triggerNativeFirstFavoriteNotification/)
  assert.match(domSource, /setNativeFirstFavoriteNotification\(onFirstFavoriteNotification\)/)
  assert.match(screenSource, /scheduleFirstFavoriteNotification\(body\)/)
  assert.match(pushSource, /Notifications\.scheduleNotificationAsync\(/)
  assert.match(pushSource, /path: '\/auction'/)
  assert.match(pushSource, /channelId: 'auctions'/)
  assert.match(pushProviderSource, /Notifications\.getLastNotificationResponse\(\)/)
  assert.match(pushProviderSource, /Notifications\.addNotificationResponseReceivedListener/)
  assert.match(pushProviderSource, /router\.push\(path as never\)/)

  for (const { locale, messages } of localeFiles) {
    assert.equal(
      typeof messages.firstFavoriteNotification_body,
      'string',
      `${locale} notification translation is missing`,
    )
    assert.ok(
      messages.firstFavoriteNotification_body.trim().length > 10,
      `${locale} notification translation is empty`,
    )
  }
})

test('DOM entry filenames are versioned without navigating away from the bundled file URL', () => {
  assert.match(screenSource, /from '\.\/public-page-v4\.dom'/)
  assert.match(authScreenSource, /from '\.\/auth-page-v3\.dom'/)
  assert.doesNotMatch(screenSource, /injectedJavaScriptBeforeContentLoaded/)
  assert.doesNotMatch(authScreenSource, /injectedJavaScriptBeforeContentLoaded/)
  assert.doesNotMatch(screenSource, /location\.replace/)
  assert.doesNotMatch(authScreenSource, /location\.replace/)
  assert.match(pushProviderSource, /try \{[\s\S]*Notifications\.addNotificationResponseReceivedListener/)
  assert.match(pushProviderSource, /return undefined/)
})

test('public DOM routes are split into lazy chunks and keep a native loading fallback', () => {
  for (const page of ['Home', 'Wallet', 'Favorites', 'PropertyDetailPage', 'Chat', 'Compare']) {
    assert.match(domSource, new RegExp(`const ${page} = lazy\\(\\(\\) => import\\(`))
  }
  assert.match(domSource, /<Suspense fallback=/)
  assert.match(domSource, /onReady: \(\) => Promise<void>/)
  assert.match(screenSource, /onReady=\{handleDomReady\}/)
  assert.match(screenSource, /styles\.domFallback/)
})
