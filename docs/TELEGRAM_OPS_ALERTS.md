# Telegram ops-бот: уведомления для команды SellYourBrick

Инструкция по внедрению бота мониторинга в духе House Tenerife (`telegram-notify.js`): бот **не чатится с клиентами**, а шлёт в Telegram-группу/личку короткие алерты о действиях на платформе, которые требуют внимания админа или координатора.

Связанный документ: [TELEGRAM_LOGIN_SETUP.md](./TELEGRAM_LOGIN_SETUP.md) — там уже настроен **вход через Telegram**. Ops-алерты — отдельная роль того же (или другого) бота.

---

## 1. Что это за бот

| | Вход (уже есть) | Ops-алерты (нужно сделать) |
|--|-----------------|----------------------------|
| Назначение | Login Widget на сайте | Push в чат команды |
| Кто получает | Пользователь сайта | Админы / поддержка / координаторы |
| API | проверка `hash` при `/api/auth/telegram` | `sendMessage` в `TELEGRAM_CHAT_ID` |
| Env | `TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_BOT_USERNAME` | + `TELEGRAM_CHAT_ID` / `TELEGRAM_ALERT_CHAT_IDS` |

**Модель House Tenerife:** один модуль `sendAlert(html)` + вызовы из бизнес-логики в момент события. Без зеркалирования всего диалога, без ответов клиентам из Telegram.

**В SellYourBrick сейчас:**
- Telegram Login — есть
- In-app / SSE / EmailJS / WhatsApp / Expo push — пользователям и частично админке
- **Ops-Telegram для «нужно одобрить / новая ставка / buy now» — нет**

Именно эту дыру закрывает модуль из этой инструкции.

---

## 2. Референс: как устроен бот в House Tenerife

Источник: `/Users/andrei/project/housetenerife/telegram-notify.js`.

### Ядро

1. `TELEGRAM_BOT_TOKEN` — без него модуль выключен.
2. `sendAlert(text)` → `POST https://api.telegram.org/bot{TOKEN}/sendMessage` во все chat id из:
   - `TELEGRAM_ALERT_CHAT_IDS` или `TELEGRAM_CHAT_ID`
   - плюс чаты, сохранённые после `/start` / `/whoami` (`data/telegram-known-chats.json`)
3. HTML (`parse_mode: HTML`), при ошибке 400 — повтор без разметки.
4. Команды опциональны: `/whoami`, `/status`, `/help` (webhook на проде или long-poll локально).

### Паттерн уведомления

```text
📨 <заголовок события>

поле: значение
поле: значение
💬 «короткий preview»
```

Для SellYourBrick копируем **паттерн доставки**, а не WhatsApp-специфику (QR, disconnect). События у нас — модерация, ставки, покупки, чаты.

---

## 3. Что уведомлять в SellYourBrick (приоритеты)

### P0 — обязательно (админ должен среагировать)

| Событие | Когда | Куда в коде вешать |
|---------|--------|--------------------|
| KYC / документы на проверку | Пользователь загрузил документы → pending | `POST /api/documents` — `server/server.js` ~3723 |
| Пользователь ждёт approve | Документы сданы / статус pending review | там же или после агрегации «пакет готов» |
| Объект на модерацию | Создан/изменён объект со статусом `pending` | `POST /api/properties` ~9133; `PUT /api/properties/:id` ~9953; delete-request ~9845 |
| Заявка Buy Now / purchase | Создан purchase-request | `POST /api/purchase-requests` ~4583 |
| Резерв оплачен (Stripe) | Нужна финализация сделки в админке | `processPropertyReservationPaidSession` — `server/stripeBilling.js` ~557 |
| Сообщение в live-chat менеджеру | Новая сессия / новое сообщение посетителя | `POST /api/live-chat/sessions` ~5278, `.../messages` ~5351 |
| Бонус на проверку | Новая submission | `POST /api/bonus-submissions` ~5499 |

### P1 — важно (оперативка / деньги)

| Событие | Куда |
|---------|------|
| Ставка на аукционе | `POST /api/bids` ~15411 (лучше фильтр: первая ставка по лоту / сумма ≥ N) |
| Победа в аукционе | рядом с `insertAuctionWinnerRow` ~16522 |
| Смена статуса заявки | `PUT /api/purchase-requests/:id/status` ~4812 (`processing` / `completed` / `rejected`) |
| Test-drive заявка | `POST /api/properties/:id/test-drive/request` ~11940 |
| Assistant → менеджер | `manager_handoff` в `server/assistant/` |

### P2 — по желанию (шумный канал)

- Каждая ставка (без фильтра) — обычно слишком часто
- Approve/reject пользователя или объекта **админом** — уже видно в админке; алерт полезен, если несколько координаторов и нужно «закрыть петлю» («одобрено»)
- Депозит Stripe, покупка долей, VIP — финансовые события для бухгалтерии/CRM

**Правило:** ops-Telegram шлёт про **входящие задачи** («нужно сделать»). Не дублировать всё, что уже уходит покупателю в Email/WhatsApp (KYC approve пользователю уже шлётся через `verificationApprovedNotify.js`).

---

## 4. Шаблоны сообщений (RU)

Используйте HTML и `escapeHtml` для всех пользовательских строк.

### KYC на проверке

```text
🛡 <b>KYC на проверке</b>
Пользователь #<id> · <имя>
Роль: buyer/seller
Документ: passport / …
Админка → Модерация
```

### Объект на модерации

```text
🏠 <b>Объект на модерации</b>
#<propertyId> «<title>»
Тип: apartment/house · Аукцион: да/нет
Продавец: #<userId>
Админка → Модерация → Объекты
```

### Запрос «Купить сейчас»

```text
🛒 <b>Запрос на покупку</b> #<requestId>
«<propertyTitle>»
Цена: <amount> <currency>
Покупатель: <name> · <phone>
Статус: pending
Админка → Запросы на покупку
```

### Резерв оплачен (критично)

```text
💳 <b>Резерв оплачен — нужна финализация</b>
Заявка #<purchaseRequestId> · объект #<propertyId>
Покупатель #<buyerId> · продавец #<sellerId>
Админка → Запросы на покупку → завершить сделку
```

### Ставка

```text
🔨 <b>Ставка</b>
Лот #<propertyId> «<title>»
Сумма: <amount> <currency>
Участник: #<userId>
```

### Победа в аукционе

```text
🏆 <b>Победа в аукционе</b>
Лот #<propertyId> «<title>»
Ставка: <amount> · победитель #<userId>
Депозит до: <dueDate>
```

### Live-chat / handoff

```text
💬 <b>Чат с менеджером</b>
Сессия #<sessionId> · user #<userId>
«<preview до 200 символов>»
Админка → Чаты
```

### Test-drive

```text
🔑 <b>Test-drive заявка</b> #<bookingId>
«<title>» · <start>–<end>
Покупатель #<buyerId> → владелец #<ownerId>
```

---

## 5. План внедрения (код)

### Шаг A. Env

В `.env` / `.env.example` добавить (токен можно **переиспользовать** от Login Widget):

```env
# Уже есть для логина:
TELEGRAM_BOT_TOKEN=...
VITE_TELEGRAM_BOT_USERNAME=SellYourBrickBot

# Новое — ops-алерты:
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
# или несколько чатов:
# TELEGRAM_ALERT_CHAT_IDS=123456789,-100xxxxxxxxxx

# Опционально:
# TELEGRAM_OPS_ENABLED=1
# TELEGRAM_OPS_BID_MIN_AMOUNT=5000   # не слать мелкие ставки
# TELEGRAM_OPS_NOTIFY_ALL_BIDS=0
```

**Важно:** `TELEGRAM_BOT_TOKEN` один на бота. Login Widget и ops-алерты могут жить на одном боте: виджет — для пользователей на сайте, `sendMessage` — в закрытую группу поддержки.

### Шаг B. Модуль `server/telegramOpsNotify.js`

Минимальный API (по мотивам House Tenerife):

```js
// Псевдокод API модуля
isConfigured()          // есть TOKEN + хотя бы один chat id
sendOpsAlert(htmlText)  // sendMessage во все TELEGRAM_* chat ids
notifyKycPending(data)
notifyPropertyPending(data)
notifyPurchaseRequest(data)
notifyReservationPaid(data)
notifyBid(data)                 // с фильтрами
notifyAuctionWon(data)
notifyLiveChat(data)
notifyBonusPending(data)

escapeHtml(str)
```

Требования к реализации:
- не падать, если Telegram недоступен (только `console.warn`)
- таймаут HTTP ~10–15 с
- дедуп по ключу события на 30–120 с (чтобы webhook Stripe + confirm не прислали два одинаковых «резерв оплачен»)
- без блокировки ответа API клиенту: `void notifyX(...).catch(...)` или `setImmediate`

Референс доставки: `housetenerife/telegram-notify.js` → функции `sendAlert`, `postTelegramMessage`, `escapeHtml`, `getEnvAlertChatIds`.

### Шаг C. Хук в роуты (после успешной записи в БД)

Пример для purchase-request:

```js
// после успешного создания заявки в POST /api/purchase-requests
const { notifyPurchaseRequest } = require('./telegramOpsNotify');
void notifyPurchaseRequest({
  requestId,
  propertyId,
  propertyTitle,
  amount,
  currency,
  buyerName,
  buyerPhone,
}).catch((err) => console.warn('telegram ops:', err.message));
```

Аналогично для остальных P0/P1 точек из таблицы выше.

### Шаг D. Узнать chat id группы

1. Создайте группу (например «SellYourBrick поддержка»).
2. Добавьте бота в группу (сделайте админом, если супергруппа требует).
3. Напишите боту в группе любое сообщение (или `/start` в личке).
4. Откройте:  
   `https://api.telegram.org/bot<TOKEN>/getUpdates`  
   — найдите `"chat":{"id":-100...}`.
5. Либо добавьте в модуль команду `/whoami`, как в House Tenerife, и сохраняйте id в `data/telegram-known-chats.json`.

Пропишите id в `TELEGRAM_CHAT_ID` и перезапустите `npm run server`.

### Шаг E. Проверка

1. Загрузите тестовый документ KYC → в группе алерт «KYC на проверке».
2. Создайте объект со статусом pending → «Объект на модерации».
3. Создайте purchase-request → «Запрос на покупку».
4. (Staging) Оплатите резерв Stripe test → «Резерв оплачен».
5. Убедитесь, что ответ API клиенту не замедлился (алерт асинхронный).

---

## 6. Что НЕ делать

- Не слать QR/сессию WhatsApp — это специфика House Tenerife, не SellYourBrick.
- Не использовать ops-чат как CRM для клиентов (ответы клиентам — админка / WhatsApp / Email).
- Не слать каждую ставку без лимита — зашумите группу.
- Не логировать полный `TELEGRAM_BOT_TOKEN` в консоль/Sentry.
- Не путать Login Widget domain (`/setdomain`) с ops: для `sendMessage` в группу домен сайта не нужен.

---

## 7. Опциональные команды бота

Полезный минимум (можно скопировать идею из House Tenerife):

| Команда | Действие |
|---------|----------|
| `/start` `/help` | Кратко: «это ops-бот SellYourBrick» |
| `/whoami` | Показать `chat.id`, зарегистрировать чат для алертов |
| `/status` | DB ping / server uptime / «ops alerts: on» |
| `/pending` | (позже) счётчики: KYC pending, objects pending, open purchase-requests |

Доставка команд: long-polling локально или webhook на публичном HTTPS (Railway и т.п.). Алерты **не зависят** от polling — они push при событиях.

---

## 8. Связь с админкой

Алерты дополняют, не заменяют:

| Экран админки | События Telegram |
|---------------|------------------|
| Модерация (`Moderation.jsx`) | KYC pending, property pending |
| Запросы на покупку (`PurchaseRequests.jsx`) | purchase-request, reservation paid, status change |
| Чаты (`AdminChat.jsx` / live-chat) | новые сессии и сообщения |
| Бонусы (`BonusesSubmissions.jsx`) | bonus pending |

В тексте алерта желательно писать путь («Админка → …»), позже — deep-link на `/admin?...`, если появится стабильный URL.

---

## 9. Чеклист готовности

- [ ] `TELEGRAM_BOT_TOKEN` валиден (`getMe`)
- [ ] Бот добавлен в группу поддержки
- [ ] `TELEGRAM_CHAT_ID` / `TELEGRAM_ALERT_CHAT_IDS` заданы
- [ ] Файл `server/telegramOpsNotify.js` подключён
- [ ] Хуки на P0 события стоят **после** успешного commit в БД
- [ ] Дедуп на Stripe reservation
- [ ] Фильтр ставок (не все подряд)
- [ ] Тест на staging пройден по 3–4 сценариям
- [ ] В `.env.example` задокументированы новые переменные (без секретов)

---

## 10. Краткий итог

**Бот** = канал оперативных уведомлений для команды SellYourBrick.  
**Паттерн** = как в House Tenerife: тонкий `sendAlert` + вызовы из серверных роутов.  
**События** = модерация пользователей/объектов, Buy Now, оплаченный резерв, ставки (с фильтром), чат с менеджером, бонусы.  
**Не путать** с Telegram Login: один токен может обслуживать обе роли, но это разные функции.

После внедрения этого модуля группа вроде «SellYourBrick поддержка» начнёт получать алерты в том же духе, что сейчас у House Tenerife для WhatsApp-сообщений — только под бизнес-события маркетплейса.
