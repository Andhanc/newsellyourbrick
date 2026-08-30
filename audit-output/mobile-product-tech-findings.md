# Mobile product-tech аудит SellYourBrick

Дата: 26 августа 2026  
Целевой viewport: **390×844**  
Фокус: mobile adaptive ключевых differentiators — Compare, Smart Investor, AI presentation entry, Bonuses и VIP; responsive architecture, touch/accessibility и mobile performance.  
Демо- и тестовые данные, их содержимое и бизнес-метрики полностью исключены из выводов.

Визуальная часть выполнена главным reviewer в current-run встроенного браузера на 390×844 и 360×800. Принятые кадры Compare, Smart Investor, Bonuses, VIP, property и seller surfaces приложены к итоговому документу. Подзадача ниже дополняет их mobile code/runtime-contract review; старые desktop screenshots и выводы о тестовых данных не используются.

## 1. Итог

Mobile adaptive не является поздней CSS-обёрткой: для Compare и Smart Investor уже созданы отдельные мобильные компоненты, используются `svh/dvh`, safe-area insets, scroll snap, touch-sized primary CTA, reduced-motion и responsive image helpers. Это сильная основа.

Главные проблемы находятся в четырёх местах:

1. **Mobile network contract остаётся desktop-sized.** Compare и Smart Investor при mount загружают четыре полных каталога, хотя экрану нужны только избранные ID и карточечная projection (`src/hooks/useFavoriteAuctionItems.js:19-40`, `:114-116`).
2. **Zoom намеренно запрещён** на `/compare` и `/bonuses`, включая pinch и keyboard zoom (`src/App.jsx:302-391`). Это P0 accessibility для mobile adaptive.
3. **Responsive code фрагментирован.** Для ключевых экранов 13,210 строк CSS; Compare имеет пять отдельных `@media (max-width: 768px)` блоков и JS breakpoint 767 при CSS 768, что создаёт неверный layout ровно на 768 px (`src/pages/Compare.jsx:645`, `src/pages/Compare.css:51`, `:1229`, `:1530`, `:1632`, `:1864`).
4. **Статические изображения не проходят оптимизатор.** Helper создаёт `srcset` только для `/uploads/`; public assets возвращаются без трансформации (`src/utils/responsiveImage.js:20-21`, `:47-70`). В результате 52×52 avatar Smart Investor может получить исходный файл 2.33 MB, а VIP hero — PNG 1.66 MB.

### Оценка mobile readiness

| Область | Оценка | Комментарий |
|---|---:|---|
| Mobile IA/flow | 7.6/10 | Separate mobile Compare/Investor journeys — сильное решение |
| Responsive reflow | 7.4/10 | Safe areas, `svh/dvh`, mobile components; есть breakpoint/cascade debt |
| Touch ergonomics | 7.2/10 | Большинство основных CTA ≥44 px; остаются 38–42 px controls |
| Mobile performance | 4.8/10 | Route lazy loading есть, но каталоги и public images слишком тяжёлые |
| Accessibility | 4.0/10 | Семантика местами хорошая, но zoom lock и modal focus gaps критичны |
| Mobile production readiness | 6.0/10 | Готово для controlled beta после P0 zoom/data/security fixes |

## 2. Numbered mobile steps и health

Эти steps определяют current-run сценарий 390×844. Health объединяет responsive code/interaction contract с новыми визуально проверенными кадрами главного reviewer.

1. **Compare: вход и выбор двух объектов — Health: At risk.** Есть полноценный mobile picker, skeleton/empty state, выбор пары и запрет несовместимых типов (`src/pages/Compare.jsx:1100-1112`, `src/components/compare/CompareMobilePicker.jsx:173-318`). Риск: четыре каталога грузятся полностью, dialog не управляет focus/Escape, на scroll выполняются layout reads для всех cards.
2. **Compare: метрики, market estimate и решение — Health: Good with issues.** Mobile-specific cards заменяют широкую таблицу; sticky pair header, readable grouping, replace/reset, live status (`src/pages/Compare.jsx:1224-1246`, `src/components/compare/CompareMobileMetrics.jsx:95-149`, `src/components/compare/CompareMobileMarketEstimate.jsx:85-156`). Риск: sticky header занимает значительную часть 844 px height и использует hardcoded 96 px offset.
3. **Smart Investor: start → source → goal — Health: Good with issues.** Dedicated mobile layouts, full-width 62 px CTA, 1-column fields, 82% horizontal goal cards and safe viewport handling (`src/components/investor/InvestorSourceHero.css:746-900`, `src/components/investor/InvestorGoalFlow.css:393-446`). Риск: eagerly-loaded 2.33 MB image в 52 px avatar и повторный full-catalog load.
4. **AI presentation entry → picker/chat — Health: At risk.** Full-screen drawer, `100dvh`, safe-area composer, `aria-modal`, live progress/PDF states (`src/components/PropertyAiExperience.jsx:336-495`, `src/components/PropertyAiExperience.css:289-337`, `:634-669`). Риск: нет focus trap/restore/Escape, controls по 38–42 px, iOS keyboard не проверен, часть текста hardcoded RU.
5. **Bonuses/VIP: mobile value proposition and action — Health: Mixed.** Bonuses reflow в single column и mobile drawer; VIP превращает benefits/stories в horizontal snap, secondary images lazy (`src/pages/Bonuses.css:1196-1447`, `src/pages/PrivateClub.css:1052-1369`). Риск: Bonus hero долго держит CTA/tasks below fold; VIP hero/static assets слишком тяжёлые; WhatsApp action disabled в контракте (`src/pages/PrivateClub.jsx:209-231`).

## 3. Сильные стороны mobile adaptive

### 3.1. Отдельные mobile information patterns

Compare не пытается сжать desktop table: на ширине mobile рендерятся `CompareMobilePicker`, `CompareMobileMetrics`, `CompareMobileMarketEstimate` и `CompareDecisionSummary` (`src/pages/Compare.jsx:1100-1112`, `:1224-1246`). Это правильно: mobile сравнение строится как последовательность коротких решений, а не горизонтальная таблица.

Smart Investor аналогично разделяет source, goal, assumptions и result на специальные mobile surfaces (`src/pages/InvestmentCalculator.jsx:995-1080`, `:1112-1145`). Inputs крупные, numeric values используют 24–38 px type, что предотвращает iOS auto-zoom для полей (`src/components/investor/InvestorSourceHero.css:638-657`, `src/components/investor/InvestorGoalFlow.css:307-326`).

### 3.2. Viewport и safe-area awareness

- `viewport-fit=cover` задан глобально (`src/App.jsx:302-304`).
- Compare picker учитывает top/bottom safe area и использует `100svh` (`src/components/compare/CompareMobilePicker.css:1-8`).
- AI chat использует `100dvh`, а composer — `env(safe-area-inset-bottom)` (`src/components/PropertyAiExperience.css:289-299`, `:634-647`).
- Smart Investor и VIP используют `svh/dvh` и отдельные short-height overrides (`src/components/investor/InvestorSourceHero.css:746-817`, `src/pages/Bonuses.css:1520-1535`).

### 3.3. Touch target discipline

Сильные примеры: Compare back 50×50 и primary 56 px (`src/components/compare/CompareMobilePicker.css:14-28`, `:221-236`); Smart Investor CTA 62 px (`src/components/investor/InvestorSourceHero.css:806-809`, `:897-899`); Bonuses task/tabs/drawer controls преимущественно 44–52 px (`src/pages/Bonuses.css:318-333`, `:1356-1381`, `:1406-1411`).

### 3.4. Motion safeguards

Compare picker/showdown, Investor flows, Bonuses и Property AI содержат `prefers-reduced-motion` ветки (`src/components/compare/CompareMobilePicker.css:443-448`, `src/components/investor/InvestorGoalFlow.css:455-461`, `src/pages/Bonuses.css:1537-1559`, `src/components/PropertyAiExperience.css:875-891`). Это хорошая основа; её нужно подтвердить в реальном browser run.

### 3.5. Семантика состояний

Mobile Compare использует `aria-modal`, `aria-pressed`, region labels, headings и `aria-live` для рыночного результата (`src/components/compare/CompareMobilePicker.jsx:239-295`, `src/components/compare/CompareMobileMetrics.jsx:111-145`, `src/components/compare/CompareMobileMarketEstimate.jsx:97-125`). Property AI сообщает прогресс через `aria-live` (`src/components/PropertyAiExperience.jsx:401-419`).

## 4. Основные mobile issues

### P0 — zoom lock ломает adaptive accessibility

На `/compare` и `/bonuses` выставляются `maximum-scale=1`, `user-scalable=no`; дополнительно блокируются pinch gesture, Ctrl/⌘ zoom и wheel zoom (`src/App.jsx:302-391`). Пользователь с low vision не может увеличить мелкий текст 8–13 px. Это противоречит самой цели adaptive layout.

**Рекомендация:** всегда `width=device-width, initial-scale=1, viewport-fit=cover`; удалить gesture/keyboard intercept. Проверить reflow при 200% и text zoom 200%, ширины 320/360/390/430/768.

### P0/P1 — Compare/Investor загружают весь catalog universe

`useFavoriteAuctionItems()` при mount параллельно вызывает approved, auctions, debts и shares, затем нормализует все записи в Map (`src/hooks/useFavoriteAuctionItems.js:19-105`, `:114-116`). Compare и Smart Investor используют этот hook (`src/pages/Compare.jsx:645-647`, `src/pages/InvestmentCalculator.jsx:164`). Smart Investor ещё раз вызывает `loadCatalog()` при выборе favorites (`src/pages/InvestmentCalculator.jsx:480`, `:1040-1043`).

Это network anti-pattern именно для mobile: пользователь ждёт/оплачивает четыре списка, чтобы показать несколько favorites. Размер результата растёт с общим marketplace, а не с задачей пользователя.

**Рекомендация:** `GET /users/me/favorites?include=card,compare&cursor=...` либо batch `POST /properties/resolve` только по favorite keys. Projection: id, table/type, title, card image variants, price, 10–15 compare fields, version. Один shared query cache (React Query/SWR), AbortController, retry/backoff, dedupe, offline stale snapshot. Цель: first useful Compare <2.5 s on Fast 3G, initial JSON <100–150 KB.

### P1 — breakpoint split-brain at 768 px

Compare JS считает mobile до 767 px (`useMobileLayout(767)`), а CSS применяет mobile до 768 px. Ровно на 768 px будет desktop JSX под mobile CSS. Другие screens используют 768 (`src/hooks/useMobileLayout.js:3-16`, `src/pages/InvestmentCalculator.jsx:120`).

**Рекомендация:** единый token `--breakpoint-mobile` не решит JS media query напрямую; экспортировать константу и генерировать CSS/custom-media из одного source. Согласовать `<768` или `<=768`, добавить visual regression на 767/768/769.

### P1 — mobile CSS cascade слишком сложен

Только audited CSS — 13,210 строк. `Compare.css` 2,096 строк с пятью mobile blocks; `InvestmentCalculator.css` 2,526 строк с множеством перекрывающихся mobile sections. В Compare одновременно остаются legacy mobile table rules и новые dedicated mobile components (`src/pages/Compare.css:1229-1527`, `:1530-1629`, `:1632-1760`, `:1864-2070`).

**Рекомендация:** component-scoped styles рядом с dedicated component; удалить unreachable legacy rules после coverage audit; mobile-first base + один tablet override; Stylelint rule для duplicate selectors; CSS size/change budget в PR.

### P1 — image delivery игнорирует фактический slot size

`buildResponsiveImageProps()` оптимизирует только `/uploads/`; public paths остаются original (`src/utils/responsiveImage.js:20-21`, `:56-58`). В Smart Investor первая card eager загружает `about-hero-villa.jpg` (~2.33 MB) в mobile slot 52×52 (`src/components/investor/InvestorSourceHero.jsx:12-35`, `:128-135`; CSS `:786-789`). VIP hero — ~1.66 MB PNG, WhatsApp background — ~1.39 MB, Bonus hero — ~578 KB; у них нет `srcset/sizes` (`src/pages/PrivateClub.jsx:22-24`, `:163-169`, `:209-213`, `src/pages/Bonuses.jsx:283-292`).

**Рекомендация:** все public visuals через build-time image pipeline/CDN, AVIF/WebP variants 1x/2x; avatar 64/104 px, card 320/640 px, hero 390/780/1170 px. Hero image budget <180 KB mobile, below-fold image <120 KB, avatar <20 KB. Добавить `width/height`, `decoding`, `loading` и `sizes`; только реальный LCP image `fetchPriority=high`.

### P1 — Compare picker scroll делает layout work на каждый event

Каждый `scroll` вызывает `getBoundingClientRect()` viewport и всех `[data-drum-index]`, затем `setActiveIndex` (`src/components/compare/CompareMobilePicker.jsx:103-118`). При большом favorites list dialog рендерит все cards и images (`:258-298`). Images не получают `loading`, `decoding`, `srcset/sizes` (`:31-40`). Это создаёт layout thrash и touch jank.

**Рекомендация:** requestAnimationFrame throttle или IntersectionObserver; virtualize/window around active item; scrollend/snap selection; lazy responsive images; `content-visibility:auto` для offscreen cards. Цель INP p75 <200 ms, dropped frames <5%.

### P1 — modal/focus behavior неполон

Compare drum и Property AI объявлены `aria-modal`, но не реализуют focus trap, initial focus, Escape close и return focus (`src/components/compare/CompareMobilePicker.jsx:239-249`, `src/components/PropertyAiExperience.jsx:349-395`). Compare меняет `document.body.style.overflow` и восстанавливает inline value, что конфликтует с другим modal lock (`src/components/compare/CompareMobilePicker.jsx:73-101`).

**Рекомендация:** общий accessible Dialog/Sheet primitive: inert background, focus trap, Escape, initial/restore focus, reference-counted scroll lock, route/back-button behavior. Проверить TalkBack/VoiceOver order.

### P1/P2 — touch target exceptions

- Property AI close/header actions 38×38 (`src/components/PropertyAiExperience.css:158-166`, `:322-332`).
- PDF actions 38 px min-height (`src/components/PropertyAiExperience.css:576-595`).
- AI composer submit 42×42 (`src/components/PropertyAiExperience.css:658-669`).
- VIP primary hero CTA 42 px на <=560 (`src/pages/PrivateClub.css:1162-1168`).
- Compare empty CTA 38 px mobile (`src/pages/Compare.css:1332-1335`).

**Рекомендация:** 44×44 CSS px minimum, 48–56 px для primary. Между adjacent targets ≥8 px.

### P2 — typography местами становится слишком мелкой

Compare tags используют 8–9 px, card labels 10–12 px, sticky headers 11 px (`src/components/compare/CompareMobilePicker.css:164-185`, `:259-268`, `src/components/compare/CompareMobileMetrics.css:76-79`). Smart Investor intro/helper copy местами 10–12 px (`src/components/investor/InvestorSourceHero.css:800-804`, `:824-827`). После снятия zoom lock это станет поправимо пользователем, но базовый размер всё равно следует поднять.

**Рекомендация:** body/supporting ≥14 px, critical labels ≥12 px, line-height 1.35–1.55; не кодировать смысл только тонким цветом/8 px badge.

### P2 — viewport/keyboard и hardcoded offsets

Smart Investor вычитает фиксированные 112 px из `100svh`; Compare sticky header использует fixed 96 px offset (`src/components/investor/InvestorSourceHero.css:746-817`, `src/components/compare/CompareMobileMetrics.css:8-21`). Это может расходиться с реальной высотой header/safe-area/locale. AI composer absolute inside `100dvh`; поведение при iOS keyboard/VisualViewport не доказано (`src/components/PropertyAiExperience.css:289-299`, `:634-669`).

**Рекомендация:** измеряемая CSS variable фактического header; `min-height` вместо жесткого fullscreen там, где контент должен scroll; test matrix iOS Safari address bar collapsed/expanded, keyboard open, landscape, Android font scale 1.3/2.0.

## 5. Feature-by-feature mobile product audit

### Compare

Что сохранить:

- mobile-first picker вместо thumbnail grid;
- последовательность pair → metrics → market → decision;
- sticky pair identity при длинном сравнении;
- replace/reset без возврата на начало (`src/components/compare/CompareMobileMetrics.jsx:33-67`, `:95-121`).

Что улучшить:

- открывать Compare сразу после второго favorite через lightweight pair payload;
- показывать progress/status skeleton отдельно для pair and market analysis;
- не скрывать объяснение disabled объекта: сейчас card получает `disabled`, но причина может быть доступна только из общего hint (`src/components/compare/CompareMobilePicker.jsx:263-279`);
- sticky header должен сворачиваться после первых metrics, иначе на 844 px доступно мало content viewport;
- добавить share/export comparison и сохранить scroll/state при возврате.

### Smart Investor

Что сохранить:

- крупные numeric inputs, 62 px continue, отдельный goal carousel;
- manual fallback, если favorites пусты;
- dedicated AI result, assumptions sheet и mobile result card;
- загрузка upload images через responsive helper (`src/pages/InvestmentCalculator.jsx:85-102`).

Что улучшить:

- на первом экране показать deliverable и время: «3 сценария, расходы, risk range»;
- выбирать source до тяжёлой загрузки favorites; запрос делать только после выбора;
- явный step indicator и сохранение draft при back/route change;
- каждому числу — источник/дата/deductible assumptions; base/downside/upside;
- цель-carousel должен иметь видимый next-card cue и screen-reader instruction, не полагаться только на horizontal swipe.

### AI presentation entry

Что сохранить:

- launcher ≥56 px, full-screen mobile chat, safe-area composer;
- progressive short answer + strengths/risks + PDF artifact;
- live progress и recovery/retry states.

Что улучшить:

- заменить двухсекундный launcher morph на более короткий или только первый session; пользовательский tap во время morph игнорируется (`src/components/PropertyAiExperience.jsx:241-269`, `:325-334`), что выглядит как неработающая кнопка;
- все copy через i18n: сейчас большая часть AI UI hardcoded Russian (`src/components/PropertyAiExperience.jsx:343-492`);
- Dialog primitive и keyboard tests;
- на mobile PDF open/download объяснить file size, статус и fallback при popup blocking;
- добавить source/date/confidence рядом с AI выводом.

### Bonuses

Что сохранить:

- single-column tickets, touch-sized task drawer, short-height breakpoint;
- role-aware buyer/seller tasks и clear status states;
- reduced-motion branch.

Что улучшить:

- mobile hero имеет `min-height:83svh` плюс крупное изображение, а stats скрыты; полезный task list оказывается почти на втором экране (`src/pages/Bonuses.css:1224-1317`). Сжать hero до 55–65svh и поднять первый task/«как это работает»;
- cinematic 1.34 s flip + 0.88 s arrival задерживает task details (`src/pages/Bonuses.css:651-680`, `:862-877`); на touch лучше <300 ms, эффект оставить только celebration;
- error recovery должен держать введённую ссылку, autofocus invalid field и `aria-live` error;
- submit нельзя строить на client-supplied user/task/promo identity (`src/pages/Bonuses.jsx:141-165`).

### VIP

Что сохранить:

- хороший mobile reflow: benefits/stories превращаются в snap cards, info cards — single column, secondary images lazy (`src/pages/PrivateClub.css:1185-1303`, `src/pages/PrivateClub.jsx:238-313`);
- repeated join CTA в hero и bottom panel.

Что улучшить:

- hero asset 1.66 MB без responsive source — критичный LCP кандидат;
- horizontal carousels требуют pagination/status tied to actual scroll; `storyIndex` меняется только arrow handler, не ручным swipe (`src/pages/PrivateClub.jsx:126-130`, `:256-314`), поэтому counter может стать неверным;
- disabled WhatsApp button выглядит как broken promise; заменить locked preview + явный «доступ после вступления» и объяснение (`src/pages/PrivateClub.jsx:218-231`);
- показать цену/period/benefit SLA до открытия gate.

## 6. Mobile performance architecture

### Что уже есть

- Route-level lazy imports в `src/App.jsx:64-118`.
- Upload resize endpoint и responsive props (`src/utils/responsiveImage.js:20-70`).
- Lazy loading у большинства below-fold VIP images (`src/pages/PrivateClub.jsx:212`, `:244`, `:301`).
- Mobile content uses `min-width:0`, text clipping and `overflow-wrap` в основных pair/cards.

### Что требуется

1. **Data:** mobile view-specific endpoints; only current favorites; cursor pagination; no four-list aggregation.
2. **Images:** one pipeline for uploads + public; width descriptors; AVIF/WebP; CDN cache immutable hashed files.
3. **Rendering:** virtualize long picker/carousels; throttle scroll calculations; `content-visibility:auto` below fold.
4. **JS:** measure per-route gzip chunks; defer AI/Chart.js until entry; confirm Chart.js isn't in initial Smart Investor intro chunk.
5. **RUM:** LCP/INP/CLS by route+viewport+network; track image bytes, API bytes and long tasks.

Budgets for 390×844:

| Metric | Target |
|---|---:|
| LCP p75 | <2.5 s 4G, <4.0 s Fast 3G |
| INP p75 | <200 ms |
| CLS p75 | <0.1 |
| Initial JS | <250 KB gzip |
| Initial images | <300 KB total |
| First-use API JSON | <150 KB |
| Single hero | <180 KB |
| Touch target | ≥44×44 px |

## 7. Security/privacy P0, не зависящие от test/demo данных

Эти findings являются свойствами production code paths и не основаны на тестовых записях:

1. **Hardcoded super-admin:** `admin/admin` создаёт/возвращает super-admin (`server/server.js:8099-8175`). Удалить, rotate credentials, admin SSO+MFA, server session и per-route RBAC.
2. **Optional auth gate:** `REQUIRE_API_AUTH` может превращать auth в no-op; в non-required mode fallback принимает непривязанный Bearer (`server/middleware/clerkAuth.js:19-68`). Auth middleware подключается после части routers (`server/server.js:198-206`, `:1118-1127`). Сделать fail closed до всех routes.
3. **Promo bypass:** `promo_code=ADMIN` всегда success без ownership/limit (`server/server.js:5524-5533`). Удалить и проаудировать redemptions.
4. **CVV storage:** schema хранит `card_cvv`, endpoint шифрует и пишет его (`prisma/schema.prisma:860-924`, `server/server.js:14955-15048`). Немедленно убрать PAN/CVV из app/backend/DB, использовать Stripe PaymentMethod/SetupIntent.
5. **CORS/identity:** permissive CORS fallback и доверие к client `user_id`/localStorage остаются независимо от данных (`server/middleware/corsOrigin.js:5-48`, `src/services/authService.js:197-287`, `server/propertyAiRoutes.js:50-64`). Exact allowlist, verified claims, BOLA tests.

Для mobile это особенно важно: device loss, deep links и embedded browser sessions расширяют последствия client-trusted identity. Никакой role/user ID не должен считаться доверенным только потому, что он сохранён на устройстве.

## 8. Mobile roadmap

### 0–72 часа

- снять zoom lock на всех маршрутах;
- синхронизировать Compare breakpoint 767/768;
- убрать `admin/admin`, `ADMIN` promo, optional auth и CVV path;
- создать lightweight favorites-resolve endpoint для Compare/Investor;
- подготовить responsive variants 4 LCP/public assets;
- browser verify 390×844: iOS-like, Android-like, keyboard open, 200% zoom.

### 1–2 недели

- общий Dialog/Sheet primitive с focus/scroll lock/Escape/back;
- virtualize Compare picker и rAF throttle scroll;
- unified image component для public/uploads, enforce budgets;
- consolidation of duplicate mobile CSS blocks;
- Playwright visual matrix 320/360/390/430/768/769 и reduced motion;
- Lighthouse mobile + WebPageTest Fast 3G на Compare/Investor/VIP/Bonuses/property AI.

### 30–60 дней

- React Query/SWR shared cache, cancellation/offline stale state;
- RUM dashboards by route/device/network;
- mobile event funnel: entry→first useful content→interaction→goal completion;
- TalkBack/VoiceOver audit и Android font scale 2.0;
- route bundle splitting of Chart.js/AI/PDF code after intent.

## 9. Результат current-run 390×844 и 360×800

Главный reviewer подтвердил новыми screenshots/interaction notes, без старых artifacts:

- [x] Compare entry/picker: horizontal body overflow не обнаружен, title/CTA/pair cards читаются (`08-compare-390.png`).
- [x] Compare result: отдельные mobile cards читаемы; sticky pair занимает существенную часть viewport, но не закрывает первый metric (`09-compare-result-390.png`).
- [x] Smart Investor source: landing и source cards помещаются в 844 px (`10`, `11`).
- [x] Smart Investor inputs: обнаружена обрезка заголовка под fixed header и слабый contrast (`12-calculator-inputs-390.png`).
- [x] Bonuses/VIP: task modal и tariff card адаптированы; Bonus hero отодвигает task ниже fold (`19`–`21`).
- [x] 360 px: AI launcher визуально закрывает filter control (`22-auction-360.png`).
- [ ] Pinch zoom 200%, orientation/font scale/reduced-motion и physical keyboard/device всё ещё требуют device run после снятия zoom lock.
- [ ] Network budgets/responsive variants требуют повторной проверки после реализации оптимизаций.

## 10. Evidence limits

Визуальные claims основаны на current-run browser viewport главного reviewer; code review подтверждает CSS contracts, payload initiation и accessibility implementation gaps. Это всё ещё не заменяет physical touch device, screen reader, Safari VisualViewport, production-network RUM и инструментальный contrast measurement.

## Финальный вывод

SellYourBrick уже имеет зрелую mobile product direction: ключевые decision tools не просто «ужаты», а переосмыслены. Наибольший ROI сейчас даст не новый визуальный polish, а сокращение mobile data/images, снятие zoom lock, общий accessible modal primitive и консолидация responsive source of truth. После этих изменений Compare, Smart Investor и AI могут стать сильным mobile differentiator; без них дорогая графика и full-catalog requests будут скрывать ценность на реальных телефонах.
