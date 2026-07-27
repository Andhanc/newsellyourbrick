import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const bookingsSource = await readFile(new URL('./MyBookingsPage.jsx', import.meta.url), 'utf8')
const bookingsCss = await readFile(new URL('./MyBookingsPage.css', import.meta.url), 'utf8')
const historySource = await readFile(new URL('./History.jsx', import.meta.url), 'utf8')
const historyCss = await readFile(new URL('./History.css', import.meta.url), 'utf8')
const profileSource = await readFile(new URL('./TestPage.jsx', import.meta.url), 'utf8')
const profileCss = await readFile(new URL('./TestPage.css', import.meta.url), 'utf8')
const notificationsSource = await readFile(
  new URL('../context/SiteNotificationsPanel.jsx', import.meta.url),
  'utf8',
)
const notificationsCss = await readFile(
  new URL('../context/SiteNotificationsPanel.css', import.meta.url),
  'utf8',
)
const notificationsContextSource = await readFile(
  new URL('../context/SiteNotificationsContext.jsx', import.meta.url),
  'utf8',
)

test('bookings mobile experience guides the buyer by status and next action', () => {
  assert.match(bookingsSource, /my-bookings-spotlight/)
  assert.match(bookingsSource, /my-bookings-filters/)
  assert.match(bookingsSource, /bookingStatusFilter/)
  assert.match(bookingsSource, /BuyerSheetShell/)
  assert.match(bookingsSource, /selectedBooking/)
  assert.match(bookingsSource, /Что делать дальше/)
  assert.match(bookingsSource, /my-bookings-state__retry/)
  assert.match(bookingsSource, /\['pending', 'paid', 'approved', 'completed'/)
  assert.match(bookingsCss, /@media \(max-width: 767px\)[\s\S]*\.my-bookings-spotlight/)
  assert.match(bookingsCss, /\.my-bookings-filter[\s\S]*min-height:\s*44px/)
  assert.match(bookingsCss, /\.my-bookings-card__next[\s\S]*min-height:\s*44px/)
})

test('history mobile experience leads with a truthful portfolio summary', () => {
  assert.match(historySource, /history-mobile-hero/)
  assert.match(historySource, /history-mobile-hero__value/)
  assert.match(historySource, /history-mobile-hero__actions/)
  assert.match(historyCss, /@media \(max-width: 767px\)[\s\S]*\.history-mobile-hero/)
  assert.match(historyCss, /\.history-mobile-hero__action[\s\S]*min-height:\s*44px/)
  assert.match(historyCss, /@media \(max-width: 767px\)[\s\S]*\.history-card[\s\S]*border-radius:\s*24px/)
})

test('profile cabinet uses tiffany banner folders layout without onboarding hints', () => {
  assert.doesNotMatch(profileSource, /test-hero-pro__mobile-eyebrow/)
  assert.doesNotMatch(profileSource, /<ProfileSpotlightOnboarding/)
  assert.doesNotMatch(profileSource, /<OwnerCabinetOnboardingDrawer/)
  assert.doesNotMatch(profileSource, /<ServiceQuickLinksTour/)
  assert.match(profileSource, /test-page--cabinet-v2/)
  assert.match(profileSource, /profile-cabinet__banner/)
  assert.match(profileSource, /profile-cabinet__identity/)
  assert.match(profileSource, /profile-cabinet__mobile-actions/)
  assert.match(profileSource, /profile-folder-card/)
  assert.match(profileSource, /profile-cabinet-row/)
  assert.match(profileSource, /\/images\/profile\/shortcuts\/data\.png/)
  assert.match(profileCss, /--test-teal:\s*#4ecdd6/)
  assert.match(profileCss, /--test-teal-dark:\s*#3bc0cb/)
  assert.match(profileCss, /\.profile-cabinet__banner/)
  assert.match(profileCss, /\.profile-folder-card/)
  assert.match(profileCss, /scroll-snap-type:\s*x mandatory/)
  assert.match(profileCss, /\.profile-folder-card__glow\s*\{\s*display:\s*none/)
  assert.match(profileSource, /profile-cabinet__folders-dots/)
  assert.match(profileCss, /\.profile-cabinet__folders-dots/)
  assert.match(profileSource, /AuctionCategoryCtaCards/)
  assert.match(profileSource, /variant="profilePage"/)
  assert.match(profileSource, /profile-cabinet__info/)
  assert.doesNotMatch(profileSource, /profile-cabinet__status/)
  assert.match(profileSource, /legalSheetOpen/)
  assert.match(profileSource, /openLegalSheet/)
  assert.doesNotMatch(profileCss, /\.profile-cabinet__status\b/)
  assert.match(profileCss, /\.profile-cabinet__info/)
  assert.match(profileCss, /\.test-page--cabinet-v2 \.test-page__below-hero/)
})

test('profile sheets open in BuyerSheetShell drawers with lazy panels', () => {
  assert.match(profileSource, /BuyerSheetShell/)
  assert.match(profileSource, /profile-cabinet-sheet/)
  assert.match(profileSource, /profile-cabinet-sheet--legal/)
  assert.match(profileSource, /buyerCabinet_legalAgreement_subjectTitle/)
  assert.match(profileSource, /buyerCabinet_legalPrivacy_scopeTitle/)
  assert.match(profileSource, /lazy\(\(\) => import\('\.\.\/components\/ProfileHistoryExperience'\)\)/)
  assert.match(profileSource, /lazy\(\(\) => import\('\.\.\/components\/ProfileBookingsExperience'\)\)/)
  assert.match(profileSource, /lazy\(\(\) => import\('\.\.\/components\/OwnerPricingCards'\)\)/)
  assert.match(profileSource, /useCabinetOverviewData\(\{\s*loadHistory:\s*historyLoadRequested\s*\}\)/)
  assert.match(profileSource, /isOpen=\{historySheetOpen\}/)
  assert.match(profileSource, /isOpen=\{bookingsSheetOpen\}/)
  assert.match(profileSource, /isOpen=\{subscriptionSheetOpen\}/)
  assert.match(profileSource, /isOpen=\{dataSheetOpen\}/)
  assert.match(profileSource, /isOpen=\{legalSheetOpen\}/)
  assert.match(profileSource, /embedded/)
  assert.doesNotMatch(profileSource, /test-data-dropbox/)
  assert.match(profileCss, /\.profile-cabinet-sheet/)
  assert.match(profileCss, /\.profile-legal-sheet__tabs/)
  assert.match(profileSource, /profile-subscriptions-experience--fullscreen/)
  assert.match(profileSource, /\/images\/profile\/subscriptions-hero-premium\.png/)
  assert.match(profileCss, /\.profile-cabinet-sheet--subscriptions[\s\S]*height:\s*100dvh/)
  assert.match(profileCss, /\.profile-subscriptions-hero/)
})

test('profile history opens fullscreen with tiffany hero and list/empty states', async () => {
  const historyExperienceSource = await readFile(
    new URL('../components/ProfileHistoryExperience.jsx', import.meta.url),
    'utf8',
  )
  const historyExperienceCss = await readFile(
    new URL('../components/ProfileHistoryExperience.css', import.meta.url),
    'utf8',
  )

  assert.match(profileSource, /profile-cabinet-sheet--history/)
  assert.match(profileCss, /\.profile-cabinet-sheet--history[\s\S]*height:\s*100dvh/)
  assert.match(profileCss, /\.profile-cabinet-sheet--history[\s\S]*\.buyer-sheet__handle[\s\S]*display:\s*none/)
  assert.match(historyExperienceSource, /profile-history-experience--fullscreen/)
  assert.match(historyExperienceSource, /\/images\/profile\/history-hero-man\.png/)
  assert.match(historyExperienceSource, /Перейти к торгам/)
  assert.match(historyExperienceSource, /to="\/auction"/)
  assert.match(historyExperienceSource, /profile-history-list-card/)
  assert.match(historyExperienceSource, /profile-history-empty__cta/)
  assert.match(historyExperienceCss, /--ph-tiffany:\s*#4ecdd6/)
  assert.match(historyExperienceCss, /--ph-platinum:\s*#e8eef0/)
  assert.match(historyExperienceCss, /\.profile-history-list-card/)
  assert.match(historyExperienceCss, /\.profile-history-empty__cta/)
})

test('profile bookings opens fullscreen with travel hero and ticket list', async () => {
  const bookingsExperienceSource = await readFile(
    new URL('../components/ProfileBookingsExperience.jsx', import.meta.url),
    'utf8',
  )
  const bookingsExperienceCss = await readFile(
    new URL('../components/ProfileBookingsExperience.css', import.meta.url),
    'utf8',
  )

  assert.match(profileSource, /profile-cabinet-sheet--bookings/)
  assert.match(profileCss, /\.profile-cabinet-sheet--bookings[\s\S]*height:\s*100dvh/)
  assert.match(profileCss, /\.profile-cabinet-sheet--bookings[\s\S]*\.buyer-sheet__handle[\s\S]*display:\s*none/)
  assert.match(bookingsExperienceSource, /profile-bookings-experience--fullscreen/)
  assert.match(bookingsExperienceSource, /\/images\/profile\/bookings-hero-travel\.png/)
  assert.match(bookingsExperienceSource, /profile-booking-pass/)
  assert.match(bookingsExperienceSource, /Смотреть объекты/)
  assert.match(bookingsExperienceSource, /to="\/map"/)
  assert.match(bookingsExperienceCss, /\.profile-bookings-hero/)
  assert.match(bookingsExperienceCss, /\.profile-bookings-empty__cta/)
  assert.match(bookingsExperienceCss, /--pb-tiffany:\s*#4ecdd6/)
})

test('profile data sheet is stepped with in-panel progress and tiffany accents', () => {
  assert.match(profileSource, /dataSheetStep/)
  assert.match(profileSource, /test-data-steps/)
  assert.doesNotMatch(profileSource, /test-data-progress/)
  assert.doesNotMatch(profileSource, /test-data-block__title/)
  assert.match(profileSource, /test-passport-ocr-card/)
  assert.match(profileSource, /\/images\/profile\/passport-scan-illustration\.png/)
  assert.match(profileSource, /buyerData_passportScanCta/)
  assert.match(profileCss, /\.test-passport-ocr-card__image/)
  assert.match(profileSource, /PROFILE_CONFETTI_COLORS/)
  assert.match(profileSource, /const TIFFANY = '#4ecdd6'/)
  assert.doesNotMatch(profileSource, /#0099A9/)
  assert.match(profileSource, /profile-data-experience--fullscreen/)
  assert.match(profileSource, /\/images\/profile\/data-hero-woman\.png/)
  assert.match(profileSource, /profile-cabinet-sheet--data/)
  assert.match(profileSource, /detectPhoneDialByGeo/)
  assert.match(profileCss, /--test-font-display:\s*'Montserrat'/)
  assert.match(profileCss, /\.profile-cabinet-sheet--data[\s\S]*height:\s*100dvh/)
  assert.match(profileCss, /\.profile-data-hero/)
  assert.match(profileSource, /variant="split"/)
  assert.match(profileSource, /autoDetectCountry/)
  assert.match(profileSource, /id: 'phone'/)
})

const onboardingDrawerSource = await readFile(
  new URL('../components/OwnerCabinetOnboardingDrawer.jsx', import.meta.url),
  'utf8',
)
const onboardingDrawerCss = await readFile(
  new URL('../components/OwnerCabinetOnboardingDrawer.css', import.meta.url),
  'utf8',
)

test('buyer welcome onboarding drawer uses tiffany accents and Montserrat', () => {
  assert.match(onboardingDrawerSource, /owner-onboarding-drawer--buyer/)
  assert.match(onboardingDrawerSource, /owner-onboarding-drawer__panel--buyer/)
  assert.match(onboardingDrawerCss, /--buyer-onboarding-tiffany:\s*#4ecdd6/)
  assert.match(onboardingDrawerCss, /--buyer-onboarding-font:\s*['"]Montserrat/)
  assert.match(onboardingDrawerCss, /\.owner-onboarding-drawer__panel--buyer[\s\S]*font-family:\s*var\(--buyer-onboarding-font\)/)
  assert.match(
    onboardingDrawerCss,
    /\.owner-onboarding-drawer__panel--buyer[\s\S]*\.owner-onboarding-drawer__cta[\s\S]*background:\s*var\(--buyer-onboarding-tiffany-dark\)/,
  )
})

test('buyer notification drawer animates calmly and states the next step', () => {
  assert.match(notificationsSource, /notificationNextStep/)
  assert.match(notificationsSource, /notification-item__next-step/)
  assert.match(notificationsCss, /notification-item-in/)
  assert.match(notificationsCss, /\.notification-panel__group-items \.notification-item:nth-child\(2\)/)
  assert.match(notificationsCss, /\.notification-item__next-step/)
  assert.match(notificationsCss, /@media \(prefers-reduced-motion:\s*reduce\)/)
  assert.match(notificationsContextSource, /aria-label=\{t\('notifications'\)\}/)
})
