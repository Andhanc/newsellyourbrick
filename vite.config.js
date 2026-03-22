import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // Определяем режим: если NODE_ENV=production или запущено на Railway (есть PORT), то production
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.PORT
  const actualMode = isProduction ? 'production' : (mode || 'development')
  
  // Загружаем переменные окружения
  // Сначала загружаем из файлов .env
  const env = loadEnv(actualMode, process.cwd(), '')
  
  // Затем перезаписываем значениями из process.env (для Railway и других платформ)
  // Это важно, так как на Railway переменные окружения доступны через process.env, а не через файлы
  const railwayEnv = {
    ...env,
    // Перезаписываем значениями из process.env, если они есть
    REACT_APP_CLERK_PUBLISHABLE_KEY: process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || env.REACT_APP_CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY,
    VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY || env.REACT_APP_CLERK_PUBLISHABLE_KEY,
    REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || env.REACT_APP_GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID,
    VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || env.REACT_APP_GOOGLE_CLIENT_ID,
    REACT_APP_EMAILJS_SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID || env.REACT_APP_EMAILJS_SERVICE_ID || env.VITE_EMAILJS_SERVICE_ID,
    VITE_EMAILJS_SERVICE_ID: process.env.VITE_EMAILJS_SERVICE_ID || env.VITE_EMAILJS_SERVICE_ID || env.REACT_APP_EMAILJS_SERVICE_ID,
    REACT_APP_EMAILJS_TEMPLATE_ID: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || env.REACT_APP_EMAILJS_TEMPLATE_ID || env.VITE_EMAILJS_TEMPLATE_ID,
    VITE_EMAILJS_TEMPLATE_ID: process.env.VITE_EMAILJS_TEMPLATE_ID || env.VITE_EMAILJS_TEMPLATE_ID || env.REACT_APP_EMAILJS_TEMPLATE_ID,
    REACT_APP_EMAILJS_PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || env.REACT_APP_EMAILJS_PUBLIC_KEY || env.VITE_EMAILJS_PUBLIC_KEY,
    VITE_EMAILJS_PUBLIC_KEY: process.env.VITE_EMAILJS_PUBLIC_KEY || env.VITE_EMAILJS_PUBLIC_KEY || env.REACT_APP_EMAILJS_PUBLIC_KEY,
    REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL || env.REACT_APP_API_BASE_URL || env.VITE_API_BASE_URL,
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL,
  }
  
  // Логируем для диагностики (только в production, чтобы не засорять логи в dev)
  if (actualMode === 'production') {
    console.log('[VITE] 🔍 Проверка переменных окружения:');
    console.log('[VITE]    REACT_APP_CLERK_PUBLISHABLE_KEY из process.env:', process.env.REACT_APP_CLERK_PUBLISHABLE_KEY ? '✅ установлен' : '❌ не установлен');
    console.log('[VITE]    REACT_APP_CLERK_PUBLISHABLE_KEY из env файлов:', env.REACT_APP_CLERK_PUBLISHABLE_KEY ? '✅ установлен' : '❌ не установлен');
    console.log('[VITE]    Итоговое значение:', railwayEnv.REACT_APP_CLERK_PUBLISHABLE_KEY ? '✅ установлен' : '❌ не установлен');
    console.log('[VITE] 📧 EmailJS переменные:');
    console.log('[VITE]    REACT_APP_EMAILJS_SERVICE_ID из process.env:', process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID ? '✅ установлен' : '❌ не установлен');
    console.log('[VITE]    REACT_APP_EMAILJS_TEMPLATE_ID из process.env:', process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID ? '✅ установлен' : '❌ не установлен');
    console.log('[VITE]    REACT_APP_EMAILJS_PUBLIC_KEY из process.env:', process.env.REACT_APP_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY ? '✅ установлен' : '❌ не установлен');
    console.log('[VITE]    Итоговые значения EmailJS:');
    console.log('[VITE]      Service ID:', railwayEnv.REACT_APP_EMAILJS_SERVICE_ID || railwayEnv.VITE_EMAILJS_SERVICE_ID ? '✅ установлен' : '❌ не установлен');
    console.log('[VITE]      Template ID:', railwayEnv.REACT_APP_EMAILJS_TEMPLATE_ID || railwayEnv.VITE_EMAILJS_TEMPLATE_ID ? '✅ установлен' : '❌ не установлен');
    console.log('[VITE]      Public Key:', railwayEnv.REACT_APP_EMAILJS_PUBLIC_KEY || railwayEnv.VITE_EMAILJS_PUBLIC_KEY ? '✅ установлен' : '❌ не установлен');
  }
  
  // ============================================================
  // КОНФИГУРАЦИЯ ПОРТОВ:
  // ============================================================
  // Локальная разработка:
  //   - Vite (фронтенд): 5173
  //   - Сервер (бэкенд): 3000
  //
  // На Railway (production):
  //   - Vite (фронтенд): PORT (Railway установит автоматически, например 8080)
  //   - Сервер (бэкенд): SERVER_PORT (нужно установить 3000 в Railway Variables)
  // ============================================================
  
  // Порт бэкенда, куда Vite проксирует /api/* (только в dev).
  // В production Vite dev-сервер не запускается вовсе, поэтому этот proxy не используется.
  // В dev Express всегда слушает SERVER_PORT (по умолчанию 3000).
  const backendPort = parseInt(process.env.SERVER_PORT || '3000', 10)

  // URL API для проксирования (только для локальной разработки)
  const apiUrl = process.env.API_URL || `http://127.0.0.1:${backendPort}`
  
  // Порт для Vite dev-сервера (только для локальной разработки).
  // В production Vite не запускается — статика раздаётся Express из dist/.
  // ВАЖНО: Vite НИКОГДА не должен использовать PORT (это порт Express-сервера на Railway).
  const vitePort = parseInt(process.env.VITE_PORT || '5173', 10)
  
  // Логируем для диагностики
  if (process.env.PORT) {
    console.log('[FRONTEND] ⚠️ Railway PORT установлен:', process.env.PORT)
  } else {
    console.log('[FRONTEND] ⚠️ Railway PORT не установлен, используем 5173')
  }
  
  // Логирование для диагностики (важно для Railway - видим, что Vite запускается)
  console.log('═══════════════════════════════════════════════════════');
  console.log('[FRONTEND] 🚀 Инициализация Vite...');
  console.log('[FRONTEND] 📋 Переменные окружения:');
  console.log('[FRONTEND]    - PORT:', process.env.PORT || 'не установлен');
  console.log('[FRONTEND]    - SERVER_PORT:', process.env.SERVER_PORT || 'не установлен');
  console.log('[FRONTEND]    - NODE_ENV:', process.env.NODE_ENV || 'не установлен');
  console.log('[FRONTEND]    - Backend port for /api proxy:', backendPort);
  console.log('[FRONTEND]    - Режим Vite:', actualMode);
  console.log('[FRONTEND]    - HMR:', actualMode === 'production' ? 'отключен' : 'включен');
  console.log('[FRONTEND] 🌐 Vite будет слушать на порту:', vitePort);
  console.log('[FRONTEND] 🔗 API URL для прокси:', apiUrl);
  console.log('[FRONTEND] ═══════════════════════════════════════════════════════');
  
  return {
    plugins: [
      react({
        // Используем более стабильные настройки для Railway
        jsxRuntime: 'automatic',
        // Отключаем быструю рефреш в production для избежания проблем
        fastRefresh: actualMode !== 'production',
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    // Настройки esbuild для стабильной работы на Railway
    esbuild: {
      // Увеличиваем лимит для больших файлов
      target: 'es2020',
      // Отключаем minify в dev режиме для избежания проблем
      minifyIdentifiers: actualMode === 'production',
      minifySyntax: actualMode === 'production',
      minifyWhitespace: actualMode === 'production',
      // Логируем ошибки вместо падения
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
    // Оптимизация для production
    optimizeDeps: {
      // Предварительно обрабатываем зависимости — шире список снижает «битые» chunk-и после обновлений deps
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'i18next',
        'react-i18next',
        'i18next-browser-languagedetector',
        '@clerk/clerk-react',
        '@tonconnect/ui-react',
        'framer-motion',
        'recharts',
      ],
      // Исключаем проблемные зависимости из оптимизации
      exclude: [],
      // Принудительно пересобираем зависимости при проблемах
      force: false,
      // Используем esbuild для оптимизации
      esbuildOptions: {
        target: 'es2020',
      },
    },
    // Обработка ошибок сборки
    build: {
      // Увеличиваем размер чанков для избежания проблем
      chunkSizeWarningLimit: 1000,
      // Используем более стабильные настройки
      rollupOptions: {
        output: {
          manualChunks: undefined, // Отключаем ручное разбиение для dev режима
        },
      },
      // Увеличиваем лимит памяти для сборки
      minify: 'esbuild',
      sourcemap: false, // Отключаем sourcemap для уменьшения размера
    },
    server: {
      port: vitePort,
      // Важно для OAuth (Google/Facebook origin_mismatch):
      // чтобы случайно не открывали сайт по Network IP (например 192.168.*),
      // а использовали именно localhost.
      host: 'localhost',
      strictPort: false, // НЕ строгий порт - если порт занят, попробуем другой
      // ВАЖНО: Railway устанавливает PORT, приложение должно слушать на этом порту
      // Разрешаем все Railway хосты
      allowedHosts: [
        '.railway.app',
        '.up.railway.app',
        'newsellyourbrick-production.up.railway.app', // Конкретный хост из ошибки
        'localhost',
        '127.0.0.1'
      ],
      // Отключаем HMR в production (на Railway) - он не нужен и вызывает проблемы с WebSocket
      hmr: actualMode === 'production' ? false : {
        clientPort: vitePort, // Для HMR в development
        overlay: false // Отключаем overlay для избежания ошибок esbuild на Railway
      },
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          // Используем IPv4 для избежания проблем с IPv6 на Railway
          family: 4, // Принудительно используем IPv4
          // Таймауты для избежания зависаний
          timeout: 30000, // 30 секунд
          proxyTimeout: 30000,
          // Улучшенная обработка ошибок
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (actualMode !== 'production') {
                console.log(`[Proxy] ${req.method} ${req.url} -> ${apiUrl}${req.url}`)
              }
            })
            proxy.on('error', (err, req, res) => {
              console.error(`[Proxy Error] ${err.message} для ${req.url}`)
              console.error(`[Proxy Error] Код: ${err.code}, Целевой URL: ${apiUrl}`)
              // Отправляем понятную ошибку клиенту
              if (res && !res.headersSent) {
                res.writeHead(502, {
                  'Content-Type': 'application/json'
                })
                res.end(JSON.stringify({
                  success: false,
                  error: 'Сервер временно недоступен. Пожалуйста, попробуйте позже.',
                  details: process.env.NODE_ENV === 'development' ? err.message : undefined
                }))
              }
            })
            proxy.on('proxyRes', (proxyRes, req, res) => {
              if (actualMode !== 'production' && proxyRes.statusCode >= 400) {
                console.warn(`[Proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode}`)
              }
            })
          }
        },
        '/health': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          family: 4,
          timeout: 5000,
          proxyTimeout: 5000
        },
        '/uploads': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          family: 4,
          timeout: 30000,
          proxyTimeout: 30000
        }
      }
    },
    // Поддержка переменных REACT_APP_ (как в Create React App)
    define: {
      // Пробрасываем REACT_APP_ переменные в код (используем railwayEnv, который включает значения из process.env)
      'process.env.REACT_APP_CLERK_PUBLISHABLE_KEY': JSON.stringify(railwayEnv.REACT_APP_CLERK_PUBLISHABLE_KEY || railwayEnv.VITE_CLERK_PUBLISHABLE_KEY || ''),
      'process.env.REACT_APP_GOOGLE_CLIENT_ID': JSON.stringify(railwayEnv.REACT_APP_GOOGLE_CLIENT_ID || railwayEnv.VITE_GOOGLE_CLIENT_ID || ''),
      'process.env.REACT_APP_EMAILJS_SERVICE_ID': JSON.stringify(railwayEnv.REACT_APP_EMAILJS_SERVICE_ID || railwayEnv.VITE_EMAILJS_SERVICE_ID || ''),
      'process.env.REACT_APP_EMAILJS_TEMPLATE_ID': JSON.stringify(railwayEnv.REACT_APP_EMAILJS_TEMPLATE_ID || railwayEnv.VITE_EMAILJS_TEMPLATE_ID || ''),
      'process.env.REACT_APP_EMAILJS_PUBLIC_KEY': JSON.stringify(railwayEnv.REACT_APP_EMAILJS_PUBLIC_KEY || railwayEnv.VITE_EMAILJS_PUBLIC_KEY || ''),
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(railwayEnv.REACT_APP_API_BASE_URL || railwayEnv.VITE_API_BASE_URL || '/api'),
      'process.env.NODE_ENV': JSON.stringify(actualMode === 'production' ? 'production' : 'development'),
    },
  }
})





