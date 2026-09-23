import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('./App.jsx', import.meta.url), 'utf8')
const i18n = await readFile(new URL('./i18n/config.js', import.meta.url), 'utf8')
const aiHook = await readFile(new URL('./hooks/useSiteAiChatDock.js', import.meta.url), 'utf8')
const adsHost = await readFile(new URL('./components/siteAds/SiteAdsHost.jsx', import.meta.url), 'utf8')
const adsApi = await readFile(new URL('./services/siteAdsPublicApi.js', import.meta.url), 'utf8')
const discover = await readFile(new URL('./pages/MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const footer = await readFile(new URL('./components/Footer.jsx', import.meta.url), 'utf8')
const ctaCards = await readFile(new URL('./components/AuctionCategoryCtaCards.jsx', import.meta.url), 'utf8')
const depositButton = await readFile(new URL('./components/DepositButton.jsx', import.meta.url), 'utf8')
const siteChatDock = await readFile(new URL('./components/SiteChatDock.jsx', import.meta.url), 'utf8')
const siteChatDockCss = await readFile(new URL('./components/SiteChatDock.css', import.meta.url), 'utf8')
const chatRedirect = await readFile(new URL('./pages/ChatRouteRedirect.jsx', import.meta.url), 'utf8')
const aiHost = await readFile(new URL('./components/GlobalAiChatHost.jsx', import.meta.url), 'utf8')

test('chat route loads a tiny redirect instead of the old Chat page chunk', () => {
  assert.match(app, /const Chat = lazyWithRetry\(\(\) => import\('\.\/pages\/ChatRouteRedirect'\)\)/)
  assert.doesNotMatch(app, /const Chat = lazyWithRetry\(\(\) => import\('\.\/pages\/Chat'\)\)/)
})

test('chat route does not navigate back off-site into a blank tab', () => {
  assert.match(chatRedirect, /sameOriginReferrer/)
  assert.match(chatRedirect, /navigate\('\/', \{ replace: true \}\)/)
})

test('homepage shell does not eagerly import listing or detail pages', () => {
  assert.doesNotMatch(app, /import Home from ['"]\.\/pages\/Home['"]/)
  assert.doesNotMatch(app, /import DebtsPage from ['"]\.\/pages\/Debts['"]/)
  assert.doesNotMatch(app, /import SearchResults from ['"]\.\/pages\/SearchResults['"]/)
  assert.doesNotMatch(app, /import PropertyDetailPage from ['"]\.\/pages\/PropertyDetailPage['"]/)
  assert.doesNotMatch(app, /import NotFoundPage from ['"]\.\/components\/NotFoundPage['"]/)
  assert.doesNotMatch(app, /import MobileDiscoverPage from ['"]\.\/pages\/MobileDiscoverPage['"]/)
  assert.match(app, /const MobileDiscoverPage = lazyWithRetry\(\(\) => import\('\.\/pages\/MobileDiscoverPage'\)\)/)
  assert.match(app, /const Home = lazyWithRetry\(\(\) => import\('\.\/pages\/Home'\)\)/)
  assert.match(app, /const DebtsPage = lazyWithRetry\(\(\) => import\('\.\/pages\/Debts'\)\)/)
  assert.match(app, /const SearchResults = lazyWithRetry\(\(\) => import\('\.\/pages\/SearchResults'\)\)/)
  assert.match(app, /const PropertyDetailPage = lazyWithRetry\(\(\) => import\('\.\/pages\/PropertyDetailPage'\)\)/)
})

test('global prefetch does not warm auction lists or map on every route', () => {
  assert.doesNotMatch(app, /prefetchAuctionList/)
  assert.doesNotMatch(app, /AuctionListPrefetch/)
  assert.doesNotMatch(app, /HeavyRouteChunksPrefetch/)
  assert.match(app, /pathname === '\/' \|\|/)
})

test('global shell defers ads, verification gates, clerk handler, and club kick modal', () => {
  assert.match(app, /from '\.\/components\/DeferredAppShellGates'/)
  assert.match(app, /<DeferredSiteAdsHost \/>/)
  assert.match(app, /<LoggedInVerificationGatesHost isBlocked=\{isBlocked\} \/>/)
  assert.match(app, /<ClerkAuthHandlerGate \/>/)
  assert.match(app, /<PrivateClubKickModalHost \/>/)
  assert.doesNotMatch(app, /import SiteAdsHost from '\.\/components\/siteAds\/SiteAdsHost'/)
  assert.doesNotMatch(app, /import GlobalVerificationSuccessGate from/)
  assert.doesNotMatch(app, /import ClerkAuthHandler from '\.\/components\/ClerkAuthHandler'/)
})

test('i18n loads locale JSON through dynamic import, not a static seven-file bundle', () => {
  assert.doesNotMatch(i18n, /^import ru from '\.\/locales\/mainPage\/ru\.json'/m)
  assert.match(i18n, /ru: \(\) => import\('\.\/locales\/mainPage\/ru\.json'\)/)
  assert.match(i18n, /en: \(\) => import\('\.\/locales\/mainPage\/en\.json'\)/)
})

test('AI catalog fetch waits until the chat is open', () => {
  assert.match(aiHook, /if \(!isChatOpen\) return undefined/)
  assert.match(aiHook, /if \(!isChatOpen \|\| !chatHistoryLoadedRef\.current/)
})

test('AI assistant session is not parsed until the user opens chat', () => {
  assert.doesNotMatch(aiHost, /useSiteAiChatDock/)
  assert.match(aiHost, /lazy\(\(\) => import\('\.\/GlobalAiChatSession'\)\)/)
  assert.match(aiHost, /openAIChat/)
  assert.match(aiHost, /configureAIChatHost/)
})

test('site ads skip the discover homepage and do not refetch on every navigation', () => {
  assert.match(adsHost, /const adsEnabled = Boolean\(pageKey\) && !isHiddenRoute/)
  assert.match(adsHost, /if \(!adsEnabled\) return undefined/)
  assert.match(adsHost, /pathname === '\/'/)
  assert.doesNotMatch(adsHost, /\[isHiddenRoute, loadAds, pathname\]/)
  assert.match(adsApi, /fetchDedupe/)
  assert.match(adsApi, /cachedAds/)
})

test('site ads stay on listing pages and skip property detail URLs', async () => {
  const adsPages = await readFile(new URL('./utils/siteAdPages.js', import.meta.url), 'utf8')
  assert.match(adsPages, /if \(path\.includes\('\/property\/'\)\) return null/)
  assert.match(adsPages, /path === '\/co-investment' \|\| path === '\/shares'/)
  assert.doesNotMatch(adsPages, /pathname\.startsWith\('\/auction'\)/)
})

test('similar listings wait until the related block is near the viewport', async () => {
  const hook = await readFile(new URL('./hooks/usePropertyRelatedListings.js', import.meta.url), 'utf8')
  const internal = await readFile(new URL('./components/PropertyDetailInternalLinks.jsx', import.meta.url), 'utf8')
  assert.match(hook, /enabled = true/)
  assert.match(hook, /useVisibleRelatedListings/)
  assert.match(hook, /IntersectionObserver/)
  assert.match(internal, /useVisibleRelatedListings/)
})

test('site footer waits until the bottom of the page is near', () => {
  assert.match(app, /id="site-footer-sentinel"/)
  assert.match(app, /footerReady \? <LazyFooter \/> : null/)
  assert.match(app, /pathname === '\/owner-test'/)
})

test('checkout success helpers do not pull listing-prefill into the app shell', async () => {
  const flow = await readFile(new URL('./utils/purchaseSuccessFlow.js', import.meta.url), 'utf8')
  assert.doesNotMatch(flow, /from ['"]\.\/purchasedPropertyListingPrefill['"]/)
  assert.doesNotMatch(flow, /from ['"]\.\/subscriptionCheckout['"]/)
  assert.match(flow, /import\(\s*['"]\.\/purchasedPropertyListingPrefill['"]\s*\)/)
  assert.match(flow, /import\(['"]\.\/subscriptionCheckout['"]\)/)
})

test('discover below-fold catalog and stories stay lazy until the stage is shown', () => {
  assert.match(discover, /const MobileDiscoverCatalog = lazy\(\(\) => import\('\.\/MobileDiscoverCatalog'\)\)/)
  assert.match(discover, /const ProfileStrategyStories = lazy\(\(\) => import\('\.\.\/components\/ProfileStrategyStories'\)\)/)
  assert.match(discover, /showTrigger=\{false\}/)
  assert.match(discover, /catalogSentinelRef/)
  assert.match(discover, /\{catalogReady \? \(/)
})

test('public listing chrome does not import the excluded react-icons/fa pack', () => {
  assert.doesNotMatch(footer, /from 'react-icons\/fa'/)
  assert.doesNotMatch(footer, /from 'react-icons\/fa6'/)
  assert.match(footer, /AppleIcon/)
  assert.doesNotMatch(ctaCards, /from 'react-icons\/fa'/)
  assert.doesNotMatch(depositButton, /from 'react-icons\/fa'/)
  assert.doesNotMatch(siteChatDock, /pages\/Home\.css/)
  assert.match(siteChatDock, /SiteChatDock\.css/)
  assert.match(siteChatDockCss, /\.ai-button\s*\{[^}]*--ai-fab-size:\s*56px/)
})
