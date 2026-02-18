# Исправление ошибки CORS с localhost на Railway

## Проблема
После деплоя на Railway возникают ошибки:
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'https://newsellyourbrick-production.up.railway.app' 
has been blocked by CORS policy: Permission was denied for this request to access the loopback address space.
```

## Причина
Браузер блокирует запросы к `localhost` с внешних доменов по соображениям безопасности. Это правильное поведение браузера.

Проблема возникает, если:
1. В Railway установлена переменная окружения `VITE_API_BASE_URL=http://localhost:3000/api`
2. Код использует эту переменную вместо относительного пути `/api`

## Решение

### Шаг 1: Проверьте переменные окружения в Railway

1. Откройте Railway Dashboard
2. Перейдите в Settings → Variables
3. Найдите переменную `VITE_API_BASE_URL`
4. **УДАЛИТЕ** эту переменную или установите её в `/api`

### Шаг 2: Убедитесь, что код использует правильный fallback

Код должен использовать:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
```

Если `VITE_API_BASE_URL` не установлена, будет использоваться `/api`, который работает через Vite proxy.

### Шаг 3: Перезапустите деплой

После изменения переменных окружения:
1. Перезапустите деплой на Railway
2. Очистите кэш браузера (Ctrl+Shift+R или Cmd+Shift+R)
3. Проверьте, что запросы идут на `/api`, а не на `localhost:3000`

## Правильные переменные окружения для Railway

### Обязательные:
- `SERVER_PORT=3000` - порт для бэкенд-сервера

### НЕ устанавливайте:
- ❌ `VITE_API_BASE_URL=http://localhost:3000/api` - это вызовет ошибку CORS
- ❌ `VITE_API_BASE_URL=http://127.0.0.1:3000/api` - это тоже вызовет ошибку

### Можно установить (но не обязательно):
- ✅ `VITE_API_BASE_URL=/api` - это то же самое, что и fallback по умолчанию

## Как проверить, что исправление работает

1. Откройте DevTools в браузере (F12)
2. Перейдите на вкладку Network
3. Сделайте запрос, который раньше вызывал ошибку
4. Проверьте, что запрос идет на `/api/...`, а не на `http://localhost:3000/api/...`
5. Убедитесь, что нет ошибок CORS

## Если проблема сохраняется

1. **Проверьте, что переменная удалена:**
   - В Railway Dashboard → Settings → Variables
   - Убедитесь, что `VITE_API_BASE_URL` не установлена или равна `/api`

2. **Очистите кэш браузера:**
   - Нажмите Ctrl+Shift+R (Windows/Linux) или Cmd+Shift+R (Mac)
   - Или откройте DevTools → Application → Clear storage → Clear site data

3. **Проверьте логи Railway:**
   - Убедитесь, что оба процесса (SERVER и FRONTEND) запущены
   - Проверьте, что нет ошибок при запуске

4. **Проверьте код:**
   - Убедитесь, что все файлы используют `import.meta.env.VITE_API_BASE_URL || '/api'`
   - Убедитесь, что нет хардкода `localhost:3000` в коде

## Важно

- На Railway **НЕ используйте** `localhost` или `127.0.0.1` в URL для API
- Используйте относительный путь `/api`, который работает через Vite proxy
- Vite proxy автоматически перенаправляет запросы `/api/*` на бэкенд-сервер
