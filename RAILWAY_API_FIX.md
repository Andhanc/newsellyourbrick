# Исправление ошибки ERR_CONNECTION_REFUSED на Railway

## Проблема
При деплое на Railway возникали ошибки:
- `Failed to fetch`
- `ERR_CONNECTION_REFUSED` для `localhost:3000/api/documents`
- `localhost:3000/api/documents:1 Failed to load resource`

## Причина
В коде использовались fallback значения `http://localhost:3000/api`, которые не работают на Railway, так как:
1. `localhost` указывает на локальную машину, а не на сервер Railway
2. На Railway нужно использовать относительные пути `/api` или полный URL сервера

## Что было исправлено
✅ Заменены все fallback значения `http://localhost:3000/api` на `/api` в следующих файлах:
- `src/pages/History.jsx`
- `src/pages/PropertyDetail.jsx`
- `src/pages/PropertyDetailPage.jsx`
- `src/pages/OwnerDashboard.jsx`
- `src/pages/Subscriptions.jsx`
- `src/pages/Data.jsx`
- `src/pages/AddProperty.jsx`
- `src/pages/Profile.jsx`
- `src/components/VerificationModal.jsx`
- `src/components/VerificationDocumentsModal.jsx`
- `src/components/VerificationToast.jsx`
- `src/components/VerificationProgress.jsx`
- `src/components/WhatsAppVerificationModal.jsx`
- `src/components/Footer.jsx`
- `src/components/WonPropertyCard.jsx`

## Как это работает
1. Код теперь использует: `import.meta.env.VITE_API_BASE_URL || '/api'`
2. Если переменная `VITE_API_BASE_URL` не установлена, используется относительный путь `/api`
3. Vite proxy (настроен в `vite.config.js`) автоматически проксирует запросы `/api/*` на бэкенд-сервер

## Настройка на Railway

### Обязательные переменные окружения:
- `SERVER_PORT=3000` - порт для бэкенд-сервера

### Опциональные переменные окружения:
- `VITE_API_BASE_URL=/api` - можно установить явно, но не обязательно (по умолчанию используется `/api`)
- `API_URL=http://127.0.0.1:3000` - URL для Vite proxy (по умолчанию используется `http://127.0.0.1:3000`)

### Как проверить:
1. После деплоя на Railway проверьте логи
2. Убедитесь, что оба процесса запущены:
   - SERVER (бэкенд на порту 3000)
   - FRONTEND (Vite dev server на порту PORT)
3. Проверьте, что запросы к API работают через `/api/*`

## Важно
- На Railway Vite proxy работает только если оба процесса (сервер и фронтенд) запущены на одном сервисе
- Если вы используете отдельные сервисы для фронтенда и бэкенда, нужно установить `VITE_API_BASE_URL` на полный URL бэкенд-сервера
- Относительный путь `/api` работает только через Vite proxy в dev режиме

## Если проблема сохраняется
1. Проверьте логи Railway - убедитесь, что оба процесса запущены
2. Проверьте, что `SERVER_PORT=3000` установлен в переменных окружения Railway
3. Если используете отдельные сервисы, установите `VITE_API_BASE_URL` на полный URL бэкенд-сервера (например: `https://your-backend.railway.app/api`)
