# Продуктово-технический аудит SellYourBrick

Дата аудита: 26 августа 2026  
Контур: локальная рабочая копия `/Users/vtichonenko/newsellyourbrick`, frontend `http://localhost:5173`, backend `http://localhost:3000`.  
Режим: read-only аудит исходников, схемы данных, локального runtime и ключевых продуктовых сценариев. Исходный код не изменялся.

## 1. Резюме для принятия решения

SellYourBrick — не просто каталог недвижимости, а широкая transaction/decision platform: аукцион, покупка по фиксированной цене, долевая инвестиция, долговые объекты, тест-драйв жилья, сравнение, AI-презентации, «умный инвестор», кабинет продавца, VIP-клуб, бонусы, кошелёк и платежи. Самая сильная продуктовая идея — провести пользователя от интереса к обоснованному решению в одном продукте: **избранное → сравнение → финансовая модель/AI → тест-драйв → бронь или покупка**. Для продавца сильная цепочка выглядит как **оценка → стратегия продажи → AI-упаковка → документы → публикация/модерация → лиды и сделка**.

Однако текущий контур нельзя безопасно выводить в открытый production с реальными платежами, паспортами и долевыми инвестициями. Причина не в визуальном качестве, а в критическом слое доверия: hardcoded `admin/admin`, открытые административные и пользовательские API, опциональная авторизация, универсальный промокод `ADMIN`, хранение CVV, доверие к `user_id` из клиента и публичная раздача upload-файлов. Локально часть защищаемых endpoint'ов действительно ответила без токена.

**Решение:** для закрытого демонстрационного beta-контура — условный Go после изоляции данных; для публичного запуска с деньгами/KYC/долями — **No-Go до закрытия P0 security, privacy и regulatory**.

| Область | Оценка | Вывод |
|---|---:|---|
| Ценность и дифференциация | 8.5/10 | Редкое и сильное объединение сделки и инструментов принятия решения |
| Инструменты покупателя | 8.0/10 | Сравнение, AI, тест-драйв и расчёты образуют полезный decision stack |
| Путь продавца | 7.5/10 | Глубокий wizard, несколько моделей продажи, документы, черновики и оплата |
| Целостность воронок | 6.4/10 | Много полноценных веток, но слишком много обещаний и точек входа |
| Производительность/масштабирование | 5.3/10 | Есть lazy loading и кэш, но list API отдают сотни KB/MB и клиент собирает всё |
| Архитектура/сопровождаемость | 4.8/10 | Рабочая система, но backend-монолит 17.7k строк и дублированные деревья |
| Модель данных | 4.5/10 | Богатый домен, но Float для денег, строковые даты и три таблицы объектов |
| Надёжность и наблюдаемость | 4.0/10 | Много тестов, но общий прогон красный; нет единого quality gate/telemetry |
| Security/privacy | 1.5/10 | Несколько эксплуатационно критических уязвимостей P0 |
| Общая готовность | 5.6/10 | Сильный продуктовый прототип, пока не production-grade transaction platform |

## 2. Что уже сделано хорошо

1. **Осмысленная продуктовая связка.** Сравнение, калькулятор/«умный инвестор», AI-отчёт и тест-драйв уменьшают информационную асимметрию перед дорогой покупкой. Это важнее очередного каталога.
2. **Глубокий seller journey.** Wizard покрывает тип/адрес, параметры, медиа и презентацию, стратегию, финансы, документы и итог; поддерживает auction, auction+buy-now, shares, debt и debt-auction (`src/pages/OwnerAddPropertyTestPage.jsx:550-583`, `src/pages/OwnerAddPropertyTestPage.jsx:1674-1694`). Есть сохранение черновика и IndexedDB для медиа — хороший ответ на длинную форму.
3. **AI даёт артефакт, а не только чат.** Пользователь получает короткий ответ и подробную PDF-презентацию, видит прогресс, историю и может вернуться к отчёту (`src/components/PropertyAiExperience.jsx:397-450`).
4. **Тест-драйв не является декоративной страницей.** Есть расчёт, запрос, Stripe checkout, подтверждение, действия владельца, check-in, анкеты и завершение — редкая операционная глубина (`server/server.js:11636-13185`).
5. **Инженерные оптимизации уже начаты.** Маршруты загружаются лениво (`src/App.jsx:64-118`), карта prefetch'ится в idle (`src/App.jsx:438-475`), есть frontend dedupe одинаковых запросов (`src/utils/fetchDedupe.js:1-42`) и серверный cache/in-flight merge списков (`server/middleware/publicPropertyListsCache.js:1-108`).
6. **У долей появился честный риск-текст.** В актуальном блоке присутствует «Доходность не гарантируется» (`src/i18n/locales/mainPage/ru.json:5243-5275`). Это правильное направление.
7. **Prisma schema синтаксически валидна.** `npx prisma validate` завершился успешно; история включает 24 миграции и 43 модели.

## 3. Продуктовая цель, позиционирование и информационная архитектура

В маршрутах одновременно присутствуют каталог/аукцион, объект, тест-драйв, профиль, сравнение, кошелёк, бонусы, доли, долги, VIP, продавец и калькулятор (`src/App.jsx:672-980`). Это показывает масштаб идеи, но создаёт риск «витрины восьми продуктов».

Рекомендованное ядро позиционирования:

> SellYourBrick — платформа проверенного решения и сделки с недвижимостью в Испании: сравните экономику, проверьте объект, попробуйте проживание и выберите подходящий формат покупки.

Все остальные функции следует подчинить этому обещанию:

- «Сравнение», «Умный инвестор» и AI — этап **проверить решение**;
- тест-драйв — этап **проверить объект жизнью**;
- аукцион/buy-now/shares — **формат сделки**;
- VIP — **сервисный уровень**, а не самостоятельное расплывчатое обещание;
- бонусы — **retention/referral-механика после активации**, а не одна из главных причин прийти.

Главный продуктовый риск — обещания превосходят доказательства. На seller-странице захардкожены `$22,850`, `+8.07%`, «готово за 12 дней», 200K покупателей, $200M стоимости объектов, 4.8/5 и 185+ продавцов без периода, методики и ссылки на источник (`src/pages/SellerPage.tsx:52-169`, `src/pages/SellerPage.tsx:296-304`). Для недвижимости такие числа повышают ожидания и одновременно снижают доверие.

**Рекомендация:** заменить marketing counters на живой proof layer: период, страна, cohort, медиана, размер выборки, дата обновления; показывать отдельно «целевая оценка» и «фактический результат».

## 4. Аудит ключевых инструментов

### 4.1. Умная панель инвестора

Сильные стороны:

- понятная цель — не просто цена объекта, а стратегия, доходность, расходы и сценарий;
- источники объекта: пример, избранное и ручной ввод;
- хорошая эмоциональная подача и качественный визуальный первый экран;
- моделируются налоги/издержки Испании, leverage и долевая модель.

![Вход в умную панель инвестора](/Users/vtichonenko/newsellyourbrick/audit-output/screenshots/product-tech/01-smart-investor-entry.png)

![Выбор источника объекта](/Users/vtichonenko/newsellyourbrick/audit-output/screenshots/product-tech/02-smart-investor-goal.png)

Недостатки:

- первый экран продаёт «лучшее будущее», но не показывает конкретный deliverable: какие метрики, за сколько минут, откуда берутся данные и где границы точности;
- налоговые и рыночные допущения должны иметь дату, источник и возможность редактирования;
- optimistic base case может восприниматься как прогноз; нужны base/upside/downside и stress-case;
- нет явного разделения «информационный расчёт» и персональная инвестиционная рекомендация;
- монетизационная логика/entitlement распределена между калькулятором, Compare и VIP/Pro, поэтому пользователь может узнать о блокировке поздно (`src/pages/Compare.jsx:648`, `src/pages/Compare.jsx:842-900`).

Рекомендации: на hero показать пример результата; раскрывать формулу каждой метрики; хранить versioned assumptions; добавить sensitivity table для цены, vacancy, ставки, ремонта и exit value; экспортировать сценарии вместе с датой и источниками.

### 4.2. Сравнение объектов

Сильные стороны:

- логичное продолжение избранного;
- таблица характеристик, рыночный расчёт, AI-анализ и быстрый переход к инвесторскому drawer;
- понятные empty states; сравниваются сопоставимые способы продажи.

![Вход в сравнение](/Users/vtichonenko/newsellyourbrick/audit-output/screenshots/product-tech/03-comparison-entry.png)

Недостатки:

- ценность доступна только после накопления избранного, а совместимость типа продажи создаёт дополнительный тупик;
- AI/калькулятор могут оказаться gated уже после того, как пользователь собрал пару;
- «лучший» объект нельзя объявлять без веса критериев пользователя;
- нужны freshness timestamps для цены, района и доходности.

Рекомендации: CTA «Добавить в сравнение» прямо на карточке; объяснять несовместимость; предложить замену объекта; позволить выбрать веса — проживание, доходность, ликвидность, риск; отображать различия прежде общих характеристик.

### 4.3. AI-презентации

Сильные стороны: пользователь получает reusable PDF, а продавец — ускоренную упаковку описания и презентации (`src/pages/OwnerAddPropertyPresentationStep.jsx:45-63`, `src/services/aiService.js`).

Ключевые риски:

- нет обязательных ссылок на происхождение рыночных фактов и даты данных;
- объектный AI связывает пользователя через переданный `X-User-Id`/query/body и лишь проверяет существование числового пользователя, но не соответствие токену (`server/propertyAiRoutes.js:50-64`);
- job запускается через `queueMicrotask`, поэтому исчезнет при рестарте и не имеет durable retry/dead-letter (`server/propertyAiRoutes.js:81-129`);
- PDF/подписи хранятся большими строками/bytes в DB, что увеличивает backup и query cost.

Рекомендации: citations и source panel; fact/estimate/opinion labels; версия промпта/модели/данных; durable queue; server-derived identity; object storage с signed URL; контроль hallucination на заранее определённой схеме отчёта.

### 4.4. Бонусы

Есть 9 hardcoded задач: Instagram/TikTok, bio/link, referral и продавец; отправка уходит на проверку и затем выдаётся промокод (`src/pages/Bonuses.jsx:19-30`, `src/pages/Bonuses.jsx:109-190`). Это хороший acquisition loop и есть разделение buyer/seller.

Проблемы:

- правила, награды, бюджет, срок и attribution не являются управляемой campaign-моделью;
- ручная проверка плохо масштабируется и допускает повторное использование доказательств;
- клиент отправляет `user_id` и promo code, а backend должен вычислять пользователя из сессии;
- **критично:** строка `ADMIN` всегда проходит без проверки, владения и расходования (`server/server.js:5507-5534`). Это бесплатный bypass публикационного fee для любого знающего код пользователя.

Рекомендация: немедленно удалить bypass и проаудировать использования; хранить campaigns/rules/rewards/budgets/expiry; immutable reward ledger; anti-fraud fingerprints; связывать бонус с verified outcome, а не только с публикацией.

### 4.5. VIP-клуб

Позиционирование включает закрытые лоты, персонального менеджера, ранние новости и WhatsApp-сообщество (`src/i18n/locales/mainPage/ru.json:4887-4932`). Это может усиливать supply exclusivity и ARPU.

Но WhatsApp CTA фактически disabled, число `+127` захардкожено (`src/pages/PrivateClub.jsx:209-231`). Не определены SLA менеджера, частота private supply, возврат при отсутствии ценности, статус места/сообщества. «Инвестиции от €100» рядом с VIP смешивают сервисную подписку и регулируемый инвестиционный продукт.

Рекомендация: продавать измеримый сервис: N новых private lots/месяц, ответ менеджера до X часов, история closed deals, календарь активностей; дать trial/preview; измерять paid activation, 30/90-day retention и долю членов, реально использовавших benefit.

### 4.6. Покупка долей

Плюсы: низкий порог, каталог, фильтры, цена доли/доходность, честный текст об отсутствии гарантии.

Критические пробелы продукта:

- не видно юридического носителя доли, прав инвестора и custody/nominee/SPV-схемы;
- нет KIIS/версии risk disclosure, suitability/knowledge test, loss simulation и reflection period;
- не определены комиссия, налоги, распределение cashflow, vacancy/ремонт, default waterfall;
- нет cap-table transfer, secondary market/exit или объяснения неликвидности;
- в старых дублированных переводах остаются «ежемесячный доход», «прозрачно, безопасно и выгодно», 12.7% и €100 (`src/i18n/locales/mainPage/ru.json:1345-1367`), что конфликтует с более осторожным новым текстом.

Это не юридическое заключение, но перед масштабированием необходим regulatory design. Для EU crowdfunding Regulation (EU) 2020/1503 предусматривает авторизованного провайдера, ясный и не вводящий в заблуждение маркетинг, knowledge test/loss simulation для non-sophisticated investors, pre-contractual reflection period и Key Investment Information Sheet: [EUR-Lex, Regulation (EU) 2020/1503](https://eur-lex.europa.eu/eli/reg/2020/1503/oj). Проверку применимости и статуса провайдера нужно провести с испанским counsel и CNMV: [CNMV — warnings and authorised entities](https://www.cnmv.es/portal/Advertencias?lang=es), [ESMA — Crowdfunding](https://www.esma.europa.eu/esmas-activities/investors-and-issuers/investment-services-and-crowdfunding).

### 4.7. Тест-драйв жилья

Очень сильная дифференциация: «пожить до покупки» снижает один из главных страхов дорогой сделки. В backend уже есть полноценный lifecycle.

Несогласованность: бизнес-правило разрешает 5–21 день (`server/server.js:11779-11852`), а каталог предлагает фильтры 3–7 дней, 1–2 недели, 2–4 недели, 1–3 месяца и >3 месяцев (`src/pages/TestDriveLandingPage.jsx:71-75`, `src/i18n/locales/mainPage/ru.json:4630-4634`). Пользователь может выбрать обещание, которое нельзя забронировать.

Рекомендации: единый availability contract на server; календарь и минимальный срок из объекта; прозрачный депозит/ущерб/отмена/уборка; SLA подтверждения владельцем; KPI request→accepted→paid→check-in→purchase.

### 4.8. Путь продавца

Сильные стороны: несколько стратегий, AI-упаковка, документы, KYC/модерация, Stripe fee и сохранение длинного черновика.

Пробелы:

- слишком рано приходится выбирать сложный формат продажи без объяснения economics/trade-offs;
- захардкоженные performance claims не доказаны;
- fee можно обойти кодом `ADMIN`;
- не видно seller SLA: когда проверят документы, кто отвечает, что исправить, когда объект опубликован;
- нет явного post-listing cockpit: качество лида, просмотры→избранное→контакт→offer, рекомендации повышения конверсии.

Рекомендация: сначала цель продавца («быстро», «максимальная цена», «получить ликвидность частями»), затем рекомендовать формат с объяснением. После публикации — checklist качества, воронка и next-best-action.

## 5. Полнота воронок

| Воронка | Что есть | Главный разрыв | KPI |
|---|---|---|---|
| Покупатель | discovery, карточка, избранное, compare, AI/калькулятор, test-drive, reserve/pay | доверие к данным, поздние paywall, разрозненные CTA | search→detail, detail→favorite, favorite→compare, decision-ready→booking |
| Продавец | onboarding, тип, медиа, AI, стратегия, документы, fee, moderation | доказательность обещаний, bypass fee, SLA/analytics | start→draft, draft→KYC, publish time, qualified leads, sold time |
| Доли | каталог, цена доли, yield, подпись/платёжные сущности | legal wrapper, disclosure, suitability, distributions, exit | disclosure completion, funding, payout accuracy, complaint/default |
| Test drive | quote, request, pay, owner flow, check-in/out, survey | сроки каталога конфликтуют с server; policies/SLA | accepted, paid, completion, conversion to transaction |
| VIP | landing, subscription gate, private flag | disabled community CTA, недоказанная supply/service ценность | trial→paid, benefit usage, 30/90-day retention |
| Бонусы | task→submit→review→promo→use | fraud, hardcoded ADMIN, нет campaign economics | verified CAC, fraud rate, redemption, incremental conversion |

Главная north-star metric: **доля активных покупателей, дошедших до “decision-ready” события** — сравнили ≥2 объекта, проверили допущения и совершили high-intent action (просмотр/test-drive/offer). GMV без этого слишком поздний и редкий сигнал.

## 6. Техническая архитектура

Frontend — React 19/Vite 5, большой набор route-level страниц; backend — Express/Prisma/Postgres с Clerk, Stripe, AI, TON и загрузкой файлов. В репозитории 1,028 JS/TS-подобных файлов; frontend около 189.5k LOC, server около 51.4k LOC.

### Основная проблема: монолит и дублирование

`server/server.js` содержит около **17,777 строк** и объединяет boot/config, auth, пользователей, свойства, бонусы, админку, платежи, test-drive и другие домены. Это повышает blast radius, затрудняет ownership, review и безопасное размещение middleware.

Отдельно присутствует крупное legacy/duplicated дерево `apps/client`: около 9.7 GB локально, включая собственные `node_modules`, `dist-android`, `dist-web` и зеркальные тесты. Часть тестов ожидает зеркальные server-файлы, которых нет. Это создаёт два источника правды и существенно увеличивает диск/CI.

Рекомендованное разбиение backend: `identity`, `catalog`, `seller-listing`, `decision-tools`, `test-drive`, `investments`, `billing`, `rewards`, `admin`; сначала как модули в одном deployable monolith, а не преждевременно как микросервисы. Каждый router должен экспортировать policy, schema validation и service layer; `server.js` оставить composition root.

## 7. Производительность и загрузка данных

Локальные замеры — это не production benchmark, а доказательство размера контрактов. Dev Vite HTML для `/`, `/auction`, `/calculator` отдавался за ~1.8–2.3 ms TTFB и весил 6.6–7.5 KB. Backend `/api/health` — ~1.3 ms. Тёплый cache маскирует стоимость DB, но payload остаётся большим.

| Endpoint | Статус/объекты | Размер | Локальное время |
|---|---:|---:|---:|
| `/api/properties/test-timers` | 4 | 9,555 B | 63.7 ms cold |
| `/api/properties/auctions?lang=ru` | 128 | 1,034,740 B | ~24 ms cold / ~4 ms warm |
| `/api/properties/approved?lang=ru` | 113 | 595,453 B | ~3 ms |
| `/api/properties/debts` | 50 | 212,679 B | ~1.7 ms |
| `/api/properties/shares` | 100 | 452,119 B | ~9 ms warm |

Auction home/cache service параллельно загружает четыре полных списка и объединяет их на клиенте (`src/services/auctionListCache.js:227-320`). Это около **1.85 MB JSON до bid enrichment и перевода**. Shares последовательно проходит страницы, пока не загрузит все записи (`src/pages/Shares.jsx:106-141`). На мобильной сети bottleneck будет transfer/parse/render, а не локальный TTFB.

Плюсы: кэш списков 10 секунд и объединение in-flight запросов (`server/middleware/publicPropertyListsCache.js:1-108`), response cache header для auction, lazy imports и prefetch.

Рекомендации:

1. Один BFF endpoint для конкретного экрана с pagination/cursor, projection и `fields`; не отдавать документы, длинное описание и все image variants в карточке.
2. Сортировка/фильтрация/агрегация — на server; infinite scroll вместо «загрузить всё».
3. CDN + responsive WebP/AVIF, width/quality variants, lazy image; убрать исходники 2–5 MB из общего `public` delivery.
4. ETag/Last-Modified и stale-while-revalidate; invalidation после изменения объекта.
5. Performance budgets: list JSON <200 KB, image card <150 KB, initial JS <250 KB gzip, LCP p75 <2.5 s, INP p75 <200 ms.
6. Vite manual chunks уже настроены (`vite.config.js:264-300`), но threshold 1000 KB слишком мягкий; сравнивать bundles в CI.

## 8. Security и privacy — критический блок

### P0. Hardcoded super-admin и отсутствие реальной сессии

`POST /api/admin/auth/login` принимает `admin/admin`, при отсутствии создаёт super-admin со всеми правами; пароль — простой SHA-256 (`server/server.js:8099-8175`). Последующие admin CRUD endpoints не содержат локальной RBAC-проверки (`server/server.js:8182-8368`). Локально `GET /api/admin/administrators` и `/api/admin/stats/counts` вернули `200` без Authorization.

**Действие 0–24 часа:** удалить bypass; отключить/ограничить admin routes на gateway; принудительная федеративная admin-auth + MFA; server-side session/token; RBAC per endpoint; аудит журналов и ротация всех admin credentials. SHA-256 заменить Argon2id/scrypt через проверенный auth provider.

### P0. API auth опциональна и применяется поздно

`REQUIRE_API_AUTH` по умолчанию превращает middleware в no-op; при отсутствии ключей в non-required режиме любой Bearer получает `sub: unverified` (`server/middleware/clerkAuth.js:19-68`). Глобальный middleware регистрируется только около `server/server.js:1118-1127`, тогда как AI/assistant/investor/news/SEO/catalog routers подключены раньше (`server/server.js:198-206`) и его обходят.

Локально без токена ответили `GET /api/users` (200, 12,665 B), admin list и admin stats. User CRUD включает list/get/update/delete и очистку всех пользователей (`server/server.js:3033-3064`) без object-level ownership.

**Действие:** fail closed; auth middleware до любого `/api`; явный public allowlist только для health/catalog projections; RBAC/ABAC на каждом mutation и sensitive read; identity брать только из verified token, не из body/header `user_id`; integration tests “anonymous cannot read/write”.

### P0. Универсальный промокод `ADMIN`

Любой запрос с `promo_code=ADMIN` получает success без проверки пользователя, задания, лимита или used state (`server/server.js:5524-5533`). Это прямой business-logic bypass оплаты публикации.

**Действие:** удалить ветку, заблокировать код, найти все redemptions/listings, пересчитать выручку, добавить server-side signed promotion/ledger и idempotency.

### P0. Хранение CVV и небезопасная card vault модель

В `users` хранятся `card_number` и `card_cvv` (`prisma/schema.prisma:860-924`). Endpoint шифрует номер и CVV AES-CBC с фиксированной salt и имеет fallback key (`server/server.js:14955-15048`). CVV нельзя хранить после авторизации даже зашифрованным; собственная card vault резко расширяет PCI scope.

**Действие:** немедленно выключить endpoint; Stripe SetupIntent/PaymentMethod/tokenization; никогда не принимать/логировать/хранить PAN/CVV; согласовать безопасное удаление уже сохранённого CVV, провести PCI/security incident review и ротацию ключей.

### P0/P1. PII, uploads и snapshot

Публично раздаётся `/uploads` (`server/server.js:1170-1205`), а схема содержит паспортный номер, identification number и фото паспорта. `storageSnapshot` маскирует пароль/карты, но не весь паспортный/документный/сообщенческий контент (`server/services/storageSnapshot.js:1-65`); mirror endpoint может отправлять snapshot внешнему storage (`server/server.js:8052-8092`). Create/update routes логируют body/files (`server/server.js:9001-9009`, `server/server.js:9821-9829`, `server/server.js:11284-11303`).

**Действие:** private object storage; signed URL с коротким TTL и policy; malware/MIME checks; полевая encryption для обязательной PII; minimization/retention/deletion; redact logger; запрет production snapshots через открытый HTTP; DPA/data mapping/DSAR process.

### P1. CORS, browser security и object ownership

При пустом production allowlist CORS допускает произвольный origin, также используется substring matching (`server/middleware/corsOrigin.js:5-48`). Локально `Origin: https://evil.example` получил отражённый `Access-Control-Allow-Origin` и credentials. Не наблюдались Helmet/CSP/HSTS; Express выдаёт `X-Powered-By`. Property AI доверяет spoofable numeric ID. Frontend auth также опирается на localStorage role/user flags (`src/services/authService.js:197-287`).

**Действие:** точное сравнение origins; credentials только для allowlist; Helmet/CSP/HSTS; CSRF для cookie flows; BOLA tests; server-derived entitlements; rate limits в shared store; idempotency keys и транзакционные row locks для bid/share/payment.

### P1. Accessibility/security UX

На ключевых маршрутах viewport ставит `user-scalable=no` и перехватывает ctrl/pinch zoom (`src/App.jsx:302-391`). Это ухудшает доступность пользователей со слабым зрением и не даёт security-выгоды. Удалить блокировку zoom и проверить WCAG 2.2 AA.

## 9. Модель данных

Схема богата, но отражает эволюцию продукта без консолидации:

- три большие дублирующие таблицы объектов: `properties` (`prisma/schema.prisma:350-418`), `properties_apartments` (`:420-513`), `properties_houses` (`:515-605`); связанные сущности вынуждены хранить `property_table/source_table`;
- money/deposits/transactions/shares используют `Float`; для денег нужен `Decimal(p,s)` либо integer minor units;
- даты часто `String` с `datetime('now')`, статусы — произвольные строки, bool — Int; это SQLite heritage на Postgres и отсутствие DB invariants;
- signature/PDF blobs в DB раздувают таблицы и backups;
- `property_shares` (`prisma/schema.prisma:632-652`) похожа на записи покупки, но не заменяет cap table, immutable cash ledger, distribution и transfer model;
- `stripe_subscription_state.user_id` имеет необычный `autoincrement()` одновременно как PK/FK (`prisma/schema.prisma:788-799`);
- `stripe_wallet_deposit_credits` исключена `@@ignore` (`prisma/schema.prisma:803-815`).

Целевая модель: один `Property` parent + typed subtype tables/validated JSON; `Offer/Listing` отдельно от physical asset; `Deal`, `Bid`, `Reservation`; `InvestmentVehicle`, `OfferingVersion`, `Holding`, `CashLedger`, `Distribution`, `Transfer`; Postgres enums/checks/FKs; `timestamptz`; Decimal/minor units; optimistic version/idempotency keys. Переход — dual read/write и backfill с reconciliation, не big-bang.

## 10. Качество, тесты, build и observability

- В дереве обнаружено 209 test-файлов. Полный `node --test`: **810 tests, 762 pass, 48 fail, exit 1**. Часть падений — legacy Expo mirror tests с отсутствующим зеркальным server-файлом, часть — source-contract/layout assertions. Это текущая рабочая копия, поэтому пользовательский WIP мог увеличить число ошибок, но release gate объективно красный.
- В корневом `package.json` нет единого `test`, `lint` или `typecheck` script; тесты существуют, но не собраны в воспроизводимый pipeline.
- `npm run build` трансформировал 4,379 модулей, затем упал через ~23 s с `ENOSPC` при копировании `public/images/sellyourbrick/landing-models-platform-bg.png`. Это не compile error, но production artifact не подтверждён.
- Диск был фактически заполнен (100%, в ходе аудита свободно опускалось до ~146 MB). `public` около 431 MB; `apps/client` около 9.7 GB (node_modules ~5.8 GB, dist-android ~3.4 GB, dist-web ~185 MB). Root tracked content около 984 MB; `apps/client/dist-web` отслеживается. Есть несколько SQLite backup примерно по 37.8 MB.
- Не обнаружен полноценный application observability stack (Sentry/OpenTelemetry/Prometheus или структурированный Pino/Winston). `console.log` содержит request body/file metadata и config status.
- В browser console были предупреждения Clerk development keys, deprecated `afterSignInUrl` и React Router v7 future flags; критических runtime errors в просмотренных Calculator/Compare состояниях не было.

Рекомендации:

1. Один `npm run verify`: format/lint/typecheck/unit/integration/security-contract/build; CI на чистом clone.
2. Разделить legacy и active tree; не отслеживать generated `dist-*`; artifact retention; disk preflight ≥10–20 GB.
3. Test pyramid: domain unit, API auth/ownership contract, DB integration с real Postgres, Stripe webhook/idempotency, 5 критических Playwright journeys.
4. Error tracking + structured logs с request ID и redaction; traces для DB/AI/Stripe; RED metrics, queue depth, webhook failures, AI job SLA.
5. SLO: catalog 99.9%, payment mutation 99.95%, p95 API list <400 ms, error rate <1%, zero unowned sensitive reads.

## 11. Приоритетный roadmap

### 0–72 часа — P0 containment

| Действие | Owner | Условие готовности |
|---|---|---|
| Закрыть admin/user/snapshot/upload endpoints на gateway | Security + Backend | anonymous/regular user получает 401/403 во всех contract tests |
| Удалить `admin/admin`, `ADMIN` promo и SHA-256 auth | Backend + Product Ops | нет bypass; credentials rotated; redemption audit завершён |
| Включить fail-closed Clerk auth до всех routers | Backend | токен проверяется криптографически; identity только из claims |
| Отключить card vault/CVV, перейти на Stripe tokens | Payments + Security | PAN/CVV не проходят через app/backend/logs/DB |
| Закрыть uploads/snapshots и redact logs | Backend + Privacy | signed access, PII scan/log scan чистые |
| Изолировать публичный beta от реальных данных/платежей | Eng lead | demo dataset и test-mode Stripe |

### 1–2 недели — восстановить доверие к релизу

- RBAC/ABAC matrix, BOLA tests, exact CORS, Helmet/CSP/HSTS, rate limiting в Redis/shared store.
- Удалить generated artifacts/duplicate dependencies из tracked tree; обеспечить 20 GB CI headroom.
- Починить 48 тестов либо явно отделить retired legacy suite; добавить root verify scripts.
- Уменьшить list API до <200 KB, pagination/projection; оптимизировать images/CDN.
- Убрать неподтверждённые seller counters и конфликтующие investment claims.
- Синхронизировать Test Drive durations с 5–21 day server rule.

### 30–60 дней — продуктовая консолидация

- Сформировать единый Decision Journey и event taxonomy.
- AI provenance: источники, дата, confidence, scenario analysis, durable queue.
- Seller cockpit: SLA, funnel, lead quality, next-best-action.
- Campaign/bonus ledger и anti-fraud.
- VIP benefits с измеримым SLA и usage analytics.
- Начать миграцию money/date/status/property-domain модели.

### До масштабирования долей — отдельный launch gate

- Испанское legal opinion и определение лицензированного провайдера/структуры;
- KIIS/versioning, suitability/knowledge test, loss simulation, reflection period;
- fees/taxes/cashflow/default/exit disclosure;
- cap table, immutable ledger, reconciliation, custody/payment segregation;
- complaint handling, incident response, AML/KYC и data retention.

### 60–90 дней — measurement и scale

- Production RUM/Lighthouse/trace baselines; performance budgets в PR.
- Постепенное удаление legacy tree и разделение backend на доменные модули.
- Cohort dashboards: decision-ready activation, seller publish time, test-drive conversion, VIP retention, bonus incremental CAC.
- Chaos/recovery tests для AI queue, Stripe webhooks и DB backup restore.

## 12. Рекомендуемый порядок продукта

1. Сначала безопасность и доказуемость — это часть продукта доверия, а не «технический долг».
2. Затем один сквозной buyer decision journey: избранное → сравнение → инвестор/AI → action.
3. Параллельно seller proof/SLA и post-listing analytics.
4. VIP и бонусы развивать только через измеримый incremental effect.
5. Доли масштабировать после отдельного regulatory/product/ledger launch gate.

## 13. Методика и границы доказательств

Выполнены: инвентаризация маршрутов/кода/LOC, обзор Prisma schema и миграций, targeted review auth/payments/AI/bonus/test-drive/seller, локальные HTTP timing/headers/payloads, UI-проверка Smart Investor и Compare, browser console, Prisma validate, полный Node test run, попытка production build и анализ диска.

Команды/результаты:

- `npx prisma validate` → success;
- `node --test` → 810 total / 762 pass / 48 fail;
- `npm run build` → 4,379 modules transformed, затем ENOSPC при копировании public asset;
- `curl` локальных frontend/backend endpoint'ов → timing/payload таблица выше;
- runtime anonymous probes → `/api/users`, `/api/admin/administrators`, `/api/admin/stats/counts` вернули 200;
- malicious-origin CORS probe → origin отражён с credentials.

Ограничения: тестировался локальный dev-контур и текущая dirty working copy, не production infrastructure/CDN/WAF/real-user network; локальные timings нельзя трактовать как production SLA. Отсутствие production env исключает утверждение о конкретных секретах/флагах, но hardcoded bypass и порядок middleware являются свойствами кода, а открытые local endpoints подтверждают небезопасный default. Регуляторный раздел — product-risk review, не юридическое заключение.

## Итог

Проект уже обладает сильной продуктовой основой и несколькими трудно копируемыми механиками: тест-драйв, decision stack, глубокий seller wizard и AI-артефакты. Сохранять и развивать стоит именно эту связность. Главная рекомендация — временно сократить ширину публичного обещания и сделать доверие измеримым: защищённые данные и деньги, доказуемые цифры, прозрачные допущения, понятные права инвестора, один основной путь к решению. После закрытия P0 и консолидации контрактов продукт сможет перейти от впечатляющего прототипа к надёжной transaction platform.
