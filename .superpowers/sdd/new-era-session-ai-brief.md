# New Era session — пакет для ИИ

Сгенерировано: 2026-09-04T14:36:50Z
Ветка: `new-era`
Базовый коммит: `1d9c071e` — feat: refine wallet and comparison experiences

## Цель пакета
Контекст незакоммиченных изменений New Era: кабинеты buyer/owner, верификация, депозит, уведомления, Private Club WhatsApp, toast/parity web↔legacy.

## Темы изменений

1. **Owner / buyer welcome onboarding** — пресеты, хост, изображения, drawer онбординга кабинета.
2. **Верификация** — VerificationModal / SellerVerification / RejectedGate; серверные notify approve/reject; i18n-скрипты.
3. **Депозит** — DepositVerificationGate + интеграция в deposit drawers/picker.
4. **Уведомления покупателя** — localize/format/group buyer notifications.
5. **Private Club** — WhatsApp community modal + VIP gate polish.
6. **Профиль владельца / TestPage / Wallet** — UX кабинета, wallet descriptions, toast model.
7. **Каталог / карточки** — Auction/Shares cards, PropertyList, pagination, discover styles.
8. **Parity** — зеркальные правки `src/` и `apps/client/src/legacy/` + локали ru/en/de/es/fr/pl/sv.

## Статистика
```
 apps/client/src/legacy/App.jsx                     |   2 +
 .../legacy/components/AuctionCategoryCtaCards.jsx  |  40 +-
 .../AuctionPropertyCard.app-first-mobile.test.js   |   6 +-
 .../src/legacy/components/AuctionPropertyCard.css  |  13 +-
 .../src/legacy/components/AuctionPropertyCard.jsx  |   5 +
 .../src/legacy/components/AuctionReminderModal.jsx |  23 -
 .../src/legacy/components/DepositInfoDrawer.jsx    |  25 +-
 .../src/legacy/components/DepositSuccessDrawer.jsx | 107 ++-
 .../src/legacy/components/DepositTopUpPicker.jsx   |   4 +-
 apps/client/src/legacy/components/Footer.jsx       |   1 +
 .../src/legacy/components/HeaderMegaMenu.jsx       |   4 +
 .../legacy/components/ListingPagePagination.css    |  95 ++-
 .../src/legacy/components/MapPagePropertyGrid.jsx  |   5 +-
 .../components/OwnerCabinetOnboardingDrawer.css    |  13 +
 .../components/OwnerCabinetOnboardingDrawer.jsx    |  40 +-
 .../components/OwnerProfileCompletionBanner.jsx    |  37 +-
 .../legacy/components/OwnerTestCabinetChrome.jsx   |  33 +-
 .../components/PrivateClubVipCelebrationModal.jsx  |  36 +-
 .../src/legacy/components/PrivateClubVipGate.css   | 160 +++-
 .../components/ProfileSpotlightOnboarding.jsx      |   6 +-
 .../PropertyList.auction-app-first-mobile.test.js  |  21 +-
 apps/client/src/legacy/components/PropertyList.css |  62 +-
 apps/client/src/legacy/components/PropertyList.jsx |  42 +-
 .../legacy/components/SellerVerificationModal.css  | 277 +++----
 .../legacy/components/SellerVerificationModal.jsx  | 156 ++--
 .../legacy/components/ShareDetailPurchasePanel.css |   4 +
 .../legacy/components/ShareDetailPurchasePanel.jsx |  50 +-
 .../client/src/legacy/components/SharesListing.css |  12 +-
 .../src/legacy/components/SharesPropertyCard.css   | 649 +++++++++++-----
 .../src/legacy/components/SharesPropertyCard.jsx   | 316 +++++---
 apps/client/src/legacy/components/Toast.css        | 116 ++-
 apps/client/src/legacy/components/Toast.jsx        |  22 +-
 .../src/legacy/components/Toast.mobile.test.js     |  18 +-
 .../src/legacy/components/ToastContainer.jsx       |  14 +-
 .../src/legacy/components/VerificationModal.css    | 707 ++++++++++++++++-
 .../src/legacy/components/VerificationModal.jsx    | 808 +++++++++++++------
 .../legacy/components/VerificationRejectedGate.css |   5 +-
 .../legacy/components/VerificationRejectedGate.jsx | 190 +++--
 .../src/legacy/components/admin/WhatsApp.jsx       |  60 +-
 .../components/compare/CompareMobilePicker.css     |  15 +-
 .../components/compare/CompareMobilePicker.test.js |   2 +-
 .../legacy/context/SiteNotificationsContext.jsx    |  23 +-
 .../src/legacy/context/SiteNotificationsPanel.css  | 293 +++----
 .../src/legacy/context/SiteNotificationsPanel.jsx  | 237 +++---
 .../context/SiteNotificationsPanel.mobile.test.js  |  26 +-
 .../src/legacy/i18n/locales/mainPage/de.json       | 346 ++++++++-
 .../src/legacy/i18n/locales/mainPage/en.json       | 401 +++++++++-
 .../src/legacy/i18n/locales/mainPage/es.json       | 348 ++++++++-
 .../src/legacy/i18n/locales/mainPage/fr.json       | 346 ++++++++-
 .../src/legacy/i18n/locales/mainPage/pl.json       | 349 ++++++++-
 .../src/legacy/i18n/locales/mainPage/ru.json       | 409 +++++++++-
 .../src/legacy/i18n/locales/mainPage/sv.json       | 348 ++++++++-
 .../pages/BuyerAccountMobileExperience.test.js     |   3 +-
 .../src/legacy/pages/CoInvestment.mobile.css       | 106 +--
 apps/client/src/legacy/pages/Favorites.css         |   1 +
 apps/client/src/legacy/pages/InvestorHomePage.css  |  37 +-
 apps/client/src/legacy/pages/MapPage.css           |   5 +
 .../client/src/legacy/pages/MobileDiscoverPage.css | 339 +++-----
 apps/client/src/legacy/pages/News.css              |  84 +-
 apps/client/src/legacy/pages/News.jsx              |  22 +-
 apps/client/src/legacy/pages/NewsArticlePage.css   |  92 ++-
 apps/client/src/legacy/pages/NewsArticlePage.jsx   |  76 +-
 .../src/legacy/pages/OwnerProfileTestPage.css      | 191 ++++-
 .../src/legacy/pages/OwnerProfileTestPage.jsx      | 858 +++++++++++++++++++--
 .../legacy/pages/OwnerProfileTestPage.mobile.css   | 178 ++---
 apps/client/src/legacy/pages/OwnerTestPage.jsx     |   9 +-
 apps/client/src/legacy/pages/PrivateClub.css       |  61 ++
 apps/client/src/legacy/pages/PrivateClub.jsx       | 107 ++-
 .../src/legacy/pages/PrivateClub.mobile.test.js    |  10 +-
 .../src/legacy/pages/PropertyDetailClassic.jsx     |   6 +-
 .../PropertyDetailClassic.share-mobile.test.js     |   5 +
 .../src/legacy/pages/Shares.mobile-catalog.test.js |  24 +-
 .../src/legacy/pages/TestDriveLandingPage.css      |   6 +-
 apps/client/src/legacy/pages/TestPage.css          |  11 +-
 apps/client/src/legacy/pages/TestPage.jsx          | 217 ++++--
 .../legacy/pages/TestPage.purchase-history.test.js |   4 +-
 apps/client/src/legacy/pages/Wallet.jsx            |  20 +-
 .../src/legacy/styles/discoverAuctionCards.css     | 162 ++--
 .../src/legacy/styles/discoverAuctionCards.test.js |  44 +-
 .../src/legacy/utils/groupBuyerNotifications.js    |  57 +-
 .../legacy/utils/groupBuyerNotifications.test.js   |  52 +-
 apps/client/src/legacy/utils/mainScroll.js         |   4 +-
 .../src/legacy/utils/ownerCabinetOnboarding.js     |  12 +
 apps/client/src/legacy/utils/toastModel.js         |  53 +-
 apps/client/src/legacy/utils/toastModel.test.js    |   9 +-
 .../client/src/legacy/utils/whatsappManagerChat.js |  21 +
 server/database/module1Prisma.js                   |   4 -
 server/server.js                                   | 328 ++++----
 src/App.jsx                                        |   2 +
 src/components/AuctionCategoryCtaCards.jsx         |  40 +-
 src/components/AuctionPropertyCard.jsx             |   5 +
 src/components/AuctionReminderModal.jsx            |  23 -
 src/components/DepositInfoDrawer.jsx               |  25 +-
 src/components/DepositSuccessDrawer.jsx            |  20 +-
 src/components/DepositTopUpPicker.jsx              |  10 +-
 src/components/Footer.jsx                          |   1 +
 src/components/HeaderMegaMenu.jsx                  |   4 +
 src/components/ListingPagePagination.css           |  95 ++-
 src/components/MapPagePropertyGrid.jsx             |   5 +-
 src/components/OwnerCabinetOnboardingDrawer.css    |  13 +
 src/components/OwnerCabinetOnboardingDrawer.jsx    |  40 +-
 src/components/OwnerProfileCompletionBanner.jsx    |  37 +-
 src/components/OwnerTestCabinetChrome.jsx          |  33 +-
 src/components/PrivateClubVipCelebrationModal.jsx  |  36 +-
 src/components/PrivateClubVipGate.css              | 160 +++-
 src/components/ProfileSpotlightOnboarding.jsx      |   6 +-
 .../PropertyList.auction-app-first-mobile.test.js  |  21 +-
 src/components/PropertyList.css                    |  62 +-
 src/components/PropertyList.jsx                    |  42 +-
 src/components/SectionInfoDrawer.css               |   4 +
 src/components/SellerVerificationModal.css         |   2 +-
 src/components/SellerVerificationModal.jsx         |  26 +-
 src/components/ShareDetailPurchasePanel.css        |   4 +
 src/components/ShareDetailPurchasePanel.jsx        |  50 +-
 src/components/SharesListing.css                   |  12 +-
 src/components/SharesPropertyCard.css              | 653 ++++++++++------
 src/components/SharesPropertyCard.jsx              | 318 +++++---
 src/components/Toast.css                           | 116 ++-
 src/components/Toast.jsx                           |  22 +-
 src/components/Toast.mobile.test.js                |  18 +-
 src/components/ToastContainer.jsx                  |  14 +-
 src/components/VerificationModal.css               |  10 +-
 src/components/VerificationModal.jsx               | 312 ++++----
 src/components/VerificationRejectedGate.css        |   5 +-
 src/components/VerificationRejectedGate.jsx        | 190 +++--
 src/components/admin/WhatsApp.jsx                  |  60 +-
 src/components/compare/CompareMobilePicker.css     |  15 +-
 src/components/compare/CompareMobilePicker.test.js |   2 +-
 src/context/SiteNotificationsContext.jsx           |  23 +-
 src/context/SiteNotificationsPanel.css             | 293 +++----
 src/context/SiteNotificationsPanel.jsx             | 237 +++---
 src/context/SiteNotificationsPanel.mobile.test.js  |  22 +-
 src/i18n/locales/mainPage/de.json                  | 270 ++++++-
 src/i18n/locales/mainPage/en.json                  | 264 ++++++-
 src/i18n/locales/mainPage/es.json                  | 270 ++++++-
 src/i18n/locales/mainPage/fr.json                  | 270 ++++++-
 src/i18n/locales/mainPage/pl.json                  | 272 ++++++-
 src/i18n/locales/mainPage/ru.json                  | 272 ++++++-
 src/i18n/locales/mainPage/sv.json                  | 270 ++++++-
 src/pages/BuyerAccountMobileExperience.test.js     |   9 +-
 src/pages/CoInvestment.mobile.css                  | 101 +--
 src/pages/Favorites.css                            |   1 +
 src/pages/InvestorHomePage.css                     |  31 +-
 src/pages/MapPage.css                              |   5 +
 src/pages/MobileDiscoverPage.css                   |  15 +-
 src/pages/News.css                                 |   7 +-
 src/pages/NewsArticlePage.css                      |  92 ++-
 src/pages/NewsArticlePage.jsx                      |  76 +-
 src/pages/OwnerProfileTestPage.css                 | 208 +++--
 src/pages/OwnerProfileTestPage.jsx                 | 858 +++++++++++++++++++--
 src/pages/OwnerProfileTestPage.mobile.css          | 178 ++---
 src/pages/OwnerTestPage.jsx                        |   9 +-
 src/pages/PrivateClub.css                          |  61 ++
 src/pages/PrivateClub.jsx                          | 107 ++-
 src/pages/PrivateClub.mobile.test.js               |  10 +-
 src/pages/PropertyDetailClassic.jsx                |   6 +-
 .../PropertyDetailClassic.share-mobile.test.js     |   5 +
 src/pages/Shares.mobile-catalog.test.js            |  33 +-
 src/pages/TestDriveLandingPage.css                 |   6 +-
 src/pages/TestPage.css                             |  11 +-
 src/pages/TestPage.jsx                             | 227 ++++--
 src/pages/TestPage.purchase-history.test.js        |   2 +-
 src/pages/Wallet.bank.css                          |   9 +-
 src/pages/Wallet.jsx                               |  29 +-
 src/styles/discoverAuctionCards.css                |  28 +-
 src/styles/discoverAuctionCards.test.js            |   9 +
 src/utils/groupBuyerNotifications.js               |  57 +-
 src/utils/groupBuyerNotifications.test.js          |  52 +-
 src/utils/mainScroll.js                            |   4 +-
 src/utils/ownerCabinetOnboarding.js                |  12 +
 src/utils/toastModel.js                            |  53 +-
 src/utils/toastModel.test.js                       |   9 +-
 src/utils/whatsappManagerChat.js                   |  21 +
 src/utils/whatsappManagerChat.test.js              |  36 +-
 vite.config.js                                     |  10 +-
 175 files changed, 13258 insertions(+), 4650 deletions(-)

--- untracked (will be added) ---
.superpowers/sdd/new-era-session-ai-brief.md
apps/client/public/images/owner-profile/
apps/client/public/images/owner-welcome/
apps/client/public/images/profile/buyer-welcome/
apps/client/src/legacy/components/DepositVerificationGate.jsx
apps/client/src/legacy/components/OwnerCabinetWelcomeHost.jsx
apps/client/src/legacy/components/OwnerCabinetWelcomeHost.test.js
apps/client/src/legacy/components/PrivateClubWhatsAppCommunityModal.css
apps/client/src/legacy/components/PrivateClubWhatsAppCommunityModal.jsx
apps/client/src/legacy/components/buyerCabinetWelcomeImages.js
apps/client/src/legacy/components/buyerCabinetWelcomePresets.js
apps/client/src/legacy/components/buyerCabinetWelcomePresets.test.js
apps/client/src/legacy/components/ownerCabinetWelcomePresets.js
apps/client/src/legacy/components/ownerCabinetWelcomePresets.test.js
apps/client/src/legacy/styles/profileDataExperience.css
apps/client/src/legacy/styles/profileFolderCards.css
apps/client/src/legacy/utils/buyerCabinetWelcome.js
apps/client/src/legacy/utils/buyerCabinetWelcome.test.js
apps/client/src/legacy/utils/depositVerificationGate.js
apps/client/src/legacy/utils/depositVerificationGate.test.js
apps/client/src/legacy/utils/formatBuyerNotificationMessage.js
apps/client/src/legacy/utils/formatBuyerNotificationMessage.test.js
apps/client/src/legacy/utils/localizeBuyerNotification.js
apps/client/src/legacy/utils/localizeBuyerNotification.test.js
apps/client/src/legacy/utils/ownerCabinetOnboarding.test.js
apps/client/src/legacy/utils/shareDetailChartSegments.js
apps/client/src/legacy/utils/shareDetailChartSegments.test.js
apps/client/src/legacy/utils/walletTransactionDescription.js
apps/client/src/legacy/utils/walletTransactionDescription.test.js
apps/client/src/legacy/utils/whatsappManagerChat.test.js
public/images/owner-profile/
public/images/owner-welcome/
public/images/profile/buyer-welcome/
scripts/merge-verification-modal-i18n.mjs
scripts/patch-verification-i18n-full.mjs
scripts/patch-verification-rejected-i18n.mjs
scripts/patch-wallet-page-i18n.mjs
server/verificationApprovedNotify.js
server/verificationApprovedNotify.test.js
server/verificationRejectedNotify.js
server/verificationRejectedNotify.test.js
src/components/DepositVerificationGate.jsx
src/components/OwnerCabinetWelcomeHost.jsx
src/components/OwnerCabinetWelcomeHost.test.js
src/components/PrivateClubWhatsAppCommunityModal.css
src/components/PrivateClubWhatsAppCommunityModal.jsx
src/components/buyerCabinetWelcomeImages.js
src/components/buyerCabinetWelcomePresets.js
src/components/buyerCabinetWelcomePresets.test.js
src/components/ownerCabinetWelcomePresets.js
src/components/ownerCabinetWelcomePresets.test.js
src/styles/profileDataExperience.css
src/styles/profileFolderCards.css
src/utils/buyerCabinetWelcome.js
src/utils/buyerCabinetWelcome.test.js
src/utils/depositVerificationGate.js
src/utils/depositVerificationGate.test.js
src/utils/formatBuyerNotificationMessage.js
src/utils/formatBuyerNotificationMessage.test.js
src/utils/localizeBuyerNotification.js
src/utils/localizeBuyerNotification.test.js
src/utils/ownerCabinetOnboarding.test.js
src/utils/shareDetailChartSegments.js
src/utils/shareDetailChartSegments.test.js
src/utils/walletTransactionDescription.js
src/utils/walletTransactionDescription.test.js
```

## Новые ключевые файлы

| Область | Файлы |
|---|---|
| Welcome owner | `OwnerCabinetWelcomeHost`, `ownerCabinetWelcomePresets`, `public/images/owner-welcome/`, `public/images/owner-profile/` |
| Welcome buyer | `buyerCabinetWelcome*`, `public/images/profile/buyer-welcome/` |
| Deposit gate | `DepositVerificationGate.jsx`, `depositVerificationGate.js` |
| Private Club WA | `PrivateClubWhatsAppCommunityModal` |
| Notifications | `localizeBuyerNotification`, `formatBuyerNotificationMessage` |
| Server notify | `verificationApprovedNotify.js`, `verificationRejectedNotify.js` |
| Profile styles | `profileDataExperience.css`, `profileFolderCards.css` |

## Исключено из коммита
- `server/data/news-views.json` — runtime счётчики просмотров новостей.

## Полный diff
См. `new-era-session.diff` рядом с этим файлом (unified diff без бинарных картинок; пути картинок перечислены отдельно в конце diff).

## Продуктовые якоря (не ломать)
- Главная: карусель стратегий MobileDiscoverPage; белая «Подробнее»; tiffany-капсула в описании.
- ProfileStrategyStories web↔legacy идентичны.
- «Стать продавцом» всегда в buyer profile.
- Фото карточек → общая fullscreen gallery.
- Debt risk 3D icons; auction share lock; compare vibration только на touch-scroll.
