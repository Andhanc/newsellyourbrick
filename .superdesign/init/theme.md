# Theme and design tokens

## Theme implementation

- Tailwind CSS v4 is loaded through `@import "tailwindcss"` in `src/index.css`; this repository intentionally has no `tailwind.config.*` file.
- Most product styling is vanilla global/page CSS with BEM-like class names. A small set of reusable primitives uses Tailwind utilities and CVA.
- Montserrat is the current site/display family; Inter is available for compact body/data copy. The app-first buyer system uses the explicit `--buyer-*` variables below.
- Primary responsive boundary for phone-first overrides is 768px. Acceptance viewports are 320, 375, 390 and 430 CSS pixels; the design reference viewport is 390 × 844.

## Extracted token summary

| Domain | Values |
|---|---|
| Brand/primary | teal `#0099a9`, deep teal `#006f7b`, auction yellow `#f4d63e` |
| Neutrals | ink `#050505`, warm `#faf8f5`, cloud `#f3f6f5`, white `#ffffff` |
| Semantic | success `#167568`, danger `#c7473a`, muted `#66706e` |
| Radius | 12px, 18px, 26px, 30px sheet |
| Touch | minimum 44 × 44px |
| Motion | 180ms fast, 320ms base, `cubic-bezier(0.22, 1, 0.36, 1)` |
| Shadows | soft teal card and elevated floating-sheet shadows |

## `src/index.css`

Global font import, Tailwind v4 CSS entry, reset, root site tokens and document scroll ownership.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
@import "tailwindcss";
@import "tw-animate-css";
@import './styles/liquid-glass-buttons-global.css';
@source "./**/*.{js,ts,jsx,tsx}";

@theme inline {
  --color-destructive-foreground: oklch(1 0 0);
  --color-color-destructive-foreground: var(--color-destructive-foreground);
}

:root {
  --destructive-foreground: oklch(1 0 0);
  --site-font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  --site-color-accent: #0099A9;
  --site-color-accent-dark: #007d8a;
  --site-color-primary: #0099A9;
  --site-color-text: #0f172a;
  --site-color-muted: #64748b;
  --site-color-subtle: #94a3b8;
  --site-color-bg: #f8fafc;
  --site-color-surface: #ffffff;
  --site-color-border: #e2e8f0;
  --site-card-radius: 18px;
  --site-card-shadow: 0 12px 32px -18px rgba(15, 23, 42, 0.26);
  --site-card-shadow-hover: 0 18px 42px -20px rgba(15, 23, 42, 0.34);
}

.dark {
  --destructive-foreground: oklch(1 0 0);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 100%;
  height: 100%;
  /* Прокрутка только внутри .app-layout — убирает вертикальный/горизонтальный overscroll у document */
  overflow: hidden;
  overscroll-behavior: none;
}

@supports (height: 100dvh) {
  html, body {
    height: 100dvh;
    max-height: 100dvh;
  }
}

html {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

html::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

body {
  font-family: var(--site-font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--site-color-text);
  line-height: 1.6;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  -webkit-overflow-scrolling: touch; /* плавный инерционный скролл на iOS (на контейнере .app-layout) */
  text-rendering: optimizeLegibility;
}

body::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

#root {
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Clerk / StrictMode: один внешний узел должен тянуться на всю высоту до .app-root-fill */
#root > * {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@supports (height: 100dvh) {
  #root {
    height: 100dvh;
    max-height: 100dvh;
  }
}

a {
  text-decoration: none;
  color: inherit;
}

button {
  cursor: pointer;
  border: none;
  font-family: inherit;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Flip countdown / number (used on property detail timer)
   ──────────────────────────────────────────────────────────────────────────── */

@keyframes flip-top {
  0%   { transform: rotateX(0deg); }
  100% { transform: rotateX(-90deg); }
}

@keyframes flip-bottom {
  0%   { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}

.flip-countdown-container {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

/* ── card unit ── */
.flip-unit {
  position: relative;
  width: var(--flip-card-width, 56px);
  height: var(--flip-card-height, 72px);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.30);
  background: var(--flip-card-bg, #111827);
  flex-shrink: 0;
  /* Без perspective rotateX(…) «схлопывается» — флип визуально пропадает */
  perspective: 520px;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

/* ── each half-panel ── */
.flip-card {
  position: absolute;
  left: 0;
  right: 0;
  height: 50%;
  overflow: hidden;
  background: var(--flip-card-bg, #111827);
}

/*
  .flip-digit is absolutely positioned with height = 200% of the half-panel
  (= 100% of the full card). top:0 shows the top half of the digit;
  top:-100% shifts it up so the bottom half becomes visible.
  Using top/% on absolutely-positioned child is always relative to parent HEIGHT ✓
*/
.flip-digit {
  position: absolute;
  left: 0;
  right: 0;
  height: 200%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Plus Jakarta Sans', 'Montserrat', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-weight: 800;
  font-size: var(--flip-card-font-size, 44px);
  color: var(--flip-card-text, #ffffff);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  user-select: none;
}

/* top half: digit positioned from the top → overflow clips the lower half */
.flip-card__top,
.flipper__top {
  top: 0;
  transform-origin: bottom center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.flip-card__top .flip-digit,
.flipper__top .flip-digit {
  top: 0;
}

/* bottom half: digit shifted up by 100% of panel height → overflow clips the upper half */
.flip-card__bottom,
.flipper__bottom {
  bottom: 0;
  transform-origin: top center;
}

.flip-card__bottom .flip-digit,
.flipper__bottom .flip-digit {
  top: -100%;
}

/* ── animated flipper overlay ── */
.flipper {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  z-index: 2;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

.flipper__top,
.flipper__bottom {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

.flipper__bottom {
  transform: rotateX(90deg);
}

.flipper.is-flipping {
  opacity: 1;
}

/* top folds down in 0.18s, then bottom unfolds with 0.18s delay — total 0.36s */
.flipper.is-flipping .flipper__top {
  animation: flip-top 0.18s ease-in forwards;
}

.flipper.is-flipping .flipper__bottom {
  animation: flip-bottom 0.18s ease-out 0.18s forwards;
}

@keyframes accordion-down {
  from {
    height: 0;
  }
  to {
    height: var(--radix-accordion-content-height);
  }
}

@keyframes accordion-up {
  from {
    height: var(--radix-accordion-content-height);
  }
  to {
    height: 0;
  }
}

.animate-accordion-down {
  animation: accordion-down 0.2s ease-out;
}

.animate-accordion-up {
  animation: accordion-up 0.2s ease-out;
}
```

## `src/App.css`

Application shell sizing, scroll container, route-specific overflow behavior and global overlay visibility rules.

```css
/* Цепочка flex от #root до скроллящегося .app-layout */
.app-root-fill {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
}

.app-shell {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
}

/* Блокируем взаимодействие с интерфейсом когда пользователь заблокирован */
.app-layout--blocked {
  pointer-events: none;
  user-select: none;
}

/* Размытие только у скроллящегося контента — футер остаётся чётким (флаги, текст) */
.app-layout--blocked > .app-layout__content {
  opacity: 0.6;
  filter: blur(2px);
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.app-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* Конец страницы (футер) не прячется за вырезом / home indicator */
  scroll-padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}

.app-layout::-webkit-scrollbar {
  display: none;
}

/* Без flex-grow: иначе колонка тянется на высоту вьюпорта и скролл к <footer> сбивается */
.app-layout__content {
  flex: 0 0 auto;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /*
   * Слой контента выше футера: fixed-хедер, бургер-меню и оверлеи внутри страницы
   * не уходят под #site-footer при скролле вниз.
   */
  position: relative;
  z-index: 11;
}

.app-layout > footer {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.app-layout__content::-webkit-scrollbar {
  display: none;
}

/* Маршрут калькулятора: единый скролл только на .app-layout */
.app-layout.app-layout--calculator-single-scroll {
  overflow-y: auto !important;
}

.app-layout.app-layout--calculator-single-scroll .app-layout__content,
.app-layout.app-layout--calculator-single-scroll .investment-calculator-page,
.app-layout.app-layout--calculator-single-scroll .calculator-container {
  overflow: visible !important;
  max-height: none !important;
  height: auto !important;
}

/* Маршрут добавления/редактирования объекта: единый скролл только на .app-layout */
.app-layout.app-layout--add-property-single-scroll {
  overflow-y: auto !important;
}

.app-layout.app-layout--add-property-single-scroll .app-layout__content,
.app-layout.app-layout--add-property-single-scroll .add-property-page,
.app-layout.app-layout--add-property-single-scroll .add-property-container,
.app-layout.app-layout--add-property-single-scroll .add-property-form,
.app-layout.app-layout--add-property-single-scroll .single-page-add-flow,
.app-layout.app-layout--add-property-single-scroll .single-page-add-flow--studio,
.app-layout.app-layout--add-property-single-scroll .property-price-screen,
.app-layout.app-layout--add-property-single-scroll .property-price-main {
  overflow: visible !important;
  max-height: none !important;
  height: auto !important;
}

/* Статья новостей: overflow-x на контенте ломает position:sticky у «Содержания» */
.app-layout.app-layout--news-article .app-layout__content {
  overflow-x: visible;
  overflow-y: visible;
}

/* Выбранные маршруты (главная, аукцион, профиль и т.д.): без pinch и двойного тапа для зума */
html.main-page-no-zoom,
body.main-page-no-zoom {
  touch-action: manipulation;
}

/* Мобильный аукцион: без горизонтальной прокрутки страницы */
html.auction-mobile-lock-x,
body.auction-mobile-lock-x {
  max-width: 100%;
  overflow-x: hidden;
}

/* Мобильный аукцион: контент не должен прятаться под фиксированным хедером */
html.auction-mobile-lock-x .new-header-spacer,
body.auction-mobile-lock-x .new-header-spacer {
  height: calc(112px + env(safe-area-inset-top, 0px));
}

@supports (overflow: clip) {
  html.auction-mobile-lock-x,
  body.auction-mobile-lock-x {
    overflow-x: clip;
  }
}

.app-page-fallback {
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
}

/* Маршруты без своего скелетона: первый кадр без текста по центру — тот же фон, что у приложения */
.app-page-fallback--instant {
  width: 100%;
  min-height: 100%;
  min-height: 100dvh;
  box-sizing: border-box;
  background: #fafafa;
}

.app-page-fallback__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.route-error-boundary {
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  gap: 16px;
  text-align: center;
}

.route-error-boundary__text {
  max-width: 360px;
  margin: 0;
  color: #334155;
  font-size: 15px;
  line-height: 1.5;
}

.route-error-boundary__btn {
  padding: 12px 22px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.route-error-boundary__btn:hover {
  background: #1d4ed8;
}

/* Открыто бургер-меню (Header / MainPage): убираем плавающую кнопку AI под панелью */
html.site-nav-drawer-open .home-auction-floats > button.ai-button,
html.site-nav-drawer-open .shares-floats > button.ai-button,
html.site-nav-drawer-open .ai-assistant-dock > button.ai-button,
html.site-nav-drawer-open .property-list-header .ai-button {
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
  transition: opacity 0.18s ease;
}

/* Открыта модалка входа / регистрации: убираем плавающую кнопку AI */
html.login-modal-open button.ai-button {
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
  transition: opacity 0.18s ease;
}

/*
 * У футера на мобилке: всегда убираем FAB AI (и депозит), чтобы не перекрывать языки.
 * Открытая панель чата / AI (.chat-dock-active) остаётся на экране.
 */
@media (max-width: 768px) {
  html.site-footer-near button.ai-button,
  html.site-footer-near .ai-assistant-dock > button.ai-button,
  html.site-footer-near .home-auction-floats > button.ai-button,
  html.site-footer-near .shares-floats > button.ai-button,
  html.site-footer-near .property-list-header button.ai-button {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    transform: translate3d(calc(100vw + 64px), 0, 0) scale(0.96) !important;
  }

  html.site-footer-near .home-auction-floats .deposit-button,
  html.site-footer-near .shares-floats .deposit-button {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: translate3d(calc(100vw + 64px), 0, 0) scale(0.96) !important;
  }

  html.site-footer-near.chat-dock-active .chat-widget {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    transform: none !important;
  }
}
```

## `src/styles/buyer-mobile-tokens.css`

Authoritative app-first buyer mobile color, type, spacing, radius, shadow, motion, safe-area and touch tokens.

```css
:root {
  --buyer-ink: #050505;
  --buyer-teal: #0099a9;
  --buyer-teal-deep: #006f7b;
  --buyer-mint: #eaf8f5;
  --buyer-warm: #faf8f5;
  --buyer-cloud: #f3f6f5;
  --buyer-auction: #f4d63e;
  --buyer-white: #ffffff;
  --buyer-danger: #c7473a;
  --buyer-success: #167568;
  --buyer-text-muted: #66706e;
  --buyer-line: rgba(5, 5, 5, 0.1);
  --buyer-font-display: 'Montserrat', 'Inter', system-ui, sans-serif;
  --buyer-font-body: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --buyer-radius-sm: 12px;
  --buyer-radius-md: 18px;
  --buyer-radius-lg: 26px;
  --buyer-radius-sheet: 30px;
  --buyer-touch: 44px;
  --buyer-gutter: clamp(14px, 4.1vw, 20px);
  --buyer-section-gap: clamp(24px, 7vw, 36px);
  --buyer-shadow-card: 0 18px 45px rgba(5, 45, 48, 0.1);
  --buyer-shadow-float: 0 20px 60px rgba(3, 35, 38, 0.18);
  --buyer-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --buyer-duration-fast: 180ms;
  --buyer-duration-base: 320ms;
}

.buyer-mobile-only {
  display: block;
}

.buyer-safe-bottom {
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}

.buyer-touch-target {
  min-width: var(--buyer-touch);
  min-height: var(--buyer-touch);
}

@media (min-width: 768px) {
  .buyer-mobile-only {
    display: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --buyer-duration-fast: 1ms;
    --buyer-duration-base: 1ms;
  }

  .buyer-reduce-motion,
  .buyer-reduce-motion::before,
  .buyer-reduce-motion::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
```

## `src/styles/liquid-glass-buttons-global.css`

Shared button press/hover motion treatment.

```css
/**
 * Глобальный «liquid» отклик для нативных кнопок (без SVG-фильтра на каждый элемент — так дешевле для DOM).
 * Отключить для конкретной кнопки: class="liquid-glass--skip"
 * Карта / Leaflet: сброс ниже.
 */
button:not(.liquid-glass--skip),
input[type='submit']:not(.liquid-glass--skip),
input[type='button']:not(.liquid-glass--skip),
input[type='reset']:not(.liquid-glass--skip) {
  transition:
    transform 0.22s cubic-bezier(0.1, 0.4, 0.2, 1),
    filter 0.22s ease,
    box-shadow 0.25s ease;
}

button:not(.liquid-glass--skip):not(:disabled):hover,
input[type='submit']:not(.liquid-glass--skip):not(:disabled):hover,
input[type='button']:not(.liquid-glass--skip):not(:disabled):hover,
input[type='reset']:not(.liquid-glass--skip):not(:disabled):hover {
  filter: brightness(1.06);
}

button:not(.liquid-glass--skip):not(:disabled):active,
input[type='submit']:not(.liquid-glass--skip):not(:disabled):active,
input[type='button']:not(.liquid-glass--skip):not(:disabled):active,
input[type='reset']:not(.liquid-glass--skip):not(:disabled):active {
  transform: scale(0.985);
  filter: brightness(0.93);
}

.leaflet-container button,
.leaflet-container .leaflet-bar a {
  transition: none !important;
  filter: none !important;
}

.leaflet-container button:hover,
.leaflet-container button:active,
.leaflet-container .leaflet-bar a:hover,
.leaflet-container .leaflet-bar a:active {
  transform: none !important;
  filter: none !important;
}
```

## `src/styles/drawerDismiss.css`

Shared drawer dismissal animation states.

```css
/* Общие анимации закрытия drawer / bottom sheet / top sheet */

.drawer-dismiss-backdrop--closing {
  animation: drawer-dismiss-backdrop-out 0.28s ease-out both !important;
}

@keyframes drawer-dismiss-backdrop-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.drawer-dismiss-from-top--closing {
  animation: drawer-dismiss-from-top-out 0.38s cubic-bezier(0.22, 1, 0.32, 1) both !important;
}

@keyframes drawer-dismiss-from-top-out {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, -100%, 0);
  }
}

.drawer-dismiss-from-bottom--closing {
  animation: drawer-dismiss-from-bottom-out 0.38s cubic-bezier(0.22, 1, 0.32, 1) both !important;
}

@keyframes drawer-dismiss-from-bottom-out {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, 100%, 0);
  }
}

.drawer-dismiss-from-right--closing {
  animation: drawer-dismiss-from-right-out 0.32s cubic-bezier(0.22, 1, 0.36, 1) both !important;
}

@keyframes drawer-dismiss-from-right-out {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}

.drawer-dismiss-modal--closing {
  animation: drawer-dismiss-modal-out 0.28s ease-out both !important;
}

@keyframes drawer-dismiss-modal-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
}

@keyframes promo-drawer-modal-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer-dismiss-backdrop--closing,
  .drawer-dismiss-from-top--closing,
  .drawer-dismiss-from-bottom--closing,
  .drawer-dismiss-from-right--closing,
  .drawer-dismiss-modal--closing {
    animation: none !important;
  }
}
```

## `src/styles/promoBottomSheetDrawer.css`

Shared promotional bottom-sheet surface language.

```css
/* Общая мобильная вёрстка promo-drawer: ≤50% экрана, без внутреннего скролла */

@media (max-width: 768px) {
  .test-drive-promo-drawer__panel,
  .first-favorite-drawer__panel,
  .compare-favorites-drawer__panel,
  .compare-investor-pro-drawer__panel {
    max-height: 50dvh;
    display: flex;
    flex-direction: column;
  }

  .test-drive-promo-drawer__drag-zone,
  .first-favorite-drawer__drag-zone,
  .compare-favorites-drawer__drag-zone,
  .compare-investor-pro-drawer__drag-zone {
    flex-shrink: 0;
    min-height: 22px;
    padding: 6px 20px 2px;
  }

  .test-drive-promo-drawer__body,
  .first-favorite-drawer__body,
  .compare-favorites-drawer__body,
  .compare-investor-pro-drawer__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding:
      0
      max(20px, env(safe-area-inset-right, 0px))
      calc(14px + env(safe-area-inset-bottom, 0px))
      max(20px, env(safe-area-inset-left, 0px));
  }

  .test-drive-promo-drawer__illustration,
  .first-favorite-drawer__illustration,
  .compare-favorites-drawer__illustration,
  .compare-investor-pro-drawer__illustration {
    flex: 0 1 auto;
    width: auto;
    max-width: min(132px, 40vw);
    max-height: min(80px, 17dvh);
    height: auto;
    margin: 0 auto 0;
  }

  .test-drive-promo-drawer__badge,
  .first-favorite-drawer__badge,
  .compare-favorites-drawer__badge,
  .compare-investor-pro-drawer__badge {
    width: 28px;
    height: 28px;
    margin: 0 auto 6px;
  }

  .test-drive-promo-drawer__title,
  .first-favorite-drawer__title,
  .compare-favorites-drawer__title,
  .compare-investor-pro-drawer__title {
    font-size: clamp(1.05rem, 4.2vw, 1.28rem);
    line-height: 1.2;
    margin: 0 0 4px;
  }

  .test-drive-promo-drawer__lead,
  .first-favorite-drawer__lead,
  .compare-favorites-drawer__lead,
  .compare-investor-pro-drawer__lead {
    font-size: clamp(12px, 3.2vw, 14px);
    line-height: 1.35;
    margin: 0 0 4px;
    max-width: 34ch;
  }

  .test-drive-promo-drawer__hint,
  .first-favorite-drawer__hint,
  .compare-favorites-drawer__hint,
  .compare-investor-pro-drawer__hint {
    font-size: clamp(11px, 2.8vw, 12px);
    line-height: 1.4;
    margin: 0 0 10px;
  }

  .test-drive-promo-drawer__cta,
  .first-favorite-drawer__cta,
  .compare-favorites-drawer__cta,
  .compare-investor-pro-drawer__cta {
    flex-shrink: 0;
    width: 100%;
    margin-top: auto;
    padding: 12px 16px;
    font-size: 14px;
  }
}

@media (max-width: 768px) and (max-height: 640px) {
  .test-drive-promo-drawer__illustration,
  .first-favorite-drawer__illustration,
  .compare-favorites-drawer__illustration,
  .compare-investor-pro-drawer__illustration {
    max-height: min(64px, 14dvh);
    max-width: min(110px, 36vw);
  }

  .test-drive-promo-drawer__title,
  .first-favorite-drawer__title,
  .compare-favorites-drawer__title,
  .compare-investor-pro-drawer__title {
    font-size: 1.05rem;
    margin-bottom: 2px;
  }

  .test-drive-promo-drawer__lead,
  .first-favorite-drawer__lead,
  .compare-favorites-drawer__lead,
  .compare-investor-pro-drawer__lead,
  .test-drive-promo-drawer__hint,
  .first-favorite-drawer__hint,
  .compare-favorites-drawer__hint,
  .compare-investor-pro-drawer__hint {
    font-size: 11px;
    margin-bottom: 6px;
  }

  .test-drive-promo-drawer__cta,
  .first-favorite-drawer__cta,
  .compare-favorites-drawer__cta,
  .compare-investor-pro-drawer__cta {
    padding: 10px 14px;
    font-size: 13px;
  }
}
```
