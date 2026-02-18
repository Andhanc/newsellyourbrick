import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Определяем режим: если NODE_ENV=production или запущено на Railway (есть PORT), то production
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.PORT
  const actualMode = isProduction ? 'production' : (mode || 'development')
  
  // Загружаем переменные окружения
  const env = loadEnv(actualMode, process.cwd(), '')
  
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
  
  // Порт сервера (бэкенд) - всегда 3000 (локально и на Railway)
  const serverPort = process.env.SERVER_PORT || '3000'
  
  // URL API для проксирования
  // Используем 127.0.0.1 вместо localhost для избежания проблем с IPv6/DNS на Railway
  const apiUrl = process.env.API_URL || `http://127.0.0.1:${serverPort}`
  
  // Порт для Vite (фронтенд)
  // Локально: 5173, на Railway: PORT (устанавливает Railway автоматически)
  const vitePort = process.env.PORT ? parseInt(process.env.PORT) : 5173
  
  // Логирование для диагностики (важно для Railway - видим, что Vite запускается)
  console.log('═══════════════════════════════════════════════════════');
  console.log('[FRONTEND] 🚀 Инициализация Vite...');
  console.log('[FRONTEND] 📋 Переменные окружения:');
  console.log('[FRONTEND]    - PORT:', process.env.PORT || 'не установлен');
  console.log('[FRONTEND]    - SERVER_PORT:', process.env.SERVER_PORT || 'не установлен');
  console.log('[FRONTEND]    - NODE_ENV:', process.env.NODE_ENV || 'не установлен');
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
      // Предварительно обрабатываем зависимости
      include: ['react', 'react-dom', 'react-router-dom'],
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
    },
    server: {
      port: vitePort,
      host: '0.0.0.0', // Слушаем на всех интерфейсах для Railway
      strictPort: false, // НЕ строгий порт - если порт занят, попробуем другой (для диагностики)
      // ВАЖНО: Railway устанавливает PORT, приложение должно слушать на этом порту
      // Если порт занят, Vite попробует другой порт, но это вызовет проблемы с Railway
      // ВАЖНО: Railway устанавливает PORT, но если порт занят, лучше увидеть ошибку, чем молча падать
      // Разрешаем все Railway хосты
      allowedHosts: [
        '.railway.app',
        '.up.railway.app',
        'web-production-5f1e0.up.railway.app' // Конкретный хост из ошибки
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
          // Это решает ошибки NO_SOCKET и IPV6_NDISC_BAD_CODE
          family: 4, // Принудительно используем IPv4
          // Таймауты для избежания зависаний
          timeout: 30000, // 30 секунд
          // Retry при ошибках подключения
          proxyTimeout: 30000,
          // Для локальной разработки
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[Proxy] ${req.method} ${req.url} -> ${apiUrl}${req.url}`)
            })
            proxy.on('error', (err, req, res) => {
              console.error(`[Proxy Error] ${err.message} для ${req.url}`)
              console.error(`[Proxy Error] Код ошибки: ${err.code}`)
              console.error(`[Proxy Error] Целевой URL: ${apiUrl}`)
              // Отправляем понятную ошибку клиенту
              if (!res.headersSent) {
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
              // Логируем успешные ответы в dev режиме
              if (actualMode !== 'production') {
                console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode}`)
              }
            })
          }
        },
        '/health': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          // Используем IPv4 для избежания проблем с IPv6 на Railway
          family: 4, // Принудительно используем IPv4
          timeout: 5000, // 5 секунд для health check
          proxyTimeout: 5000
        }
      }
    },
    // Поддержка переменных REACT_APP_ (как в Create React App)
    define: {
      // Пробрасываем REACT_APP_ переменные в код
      'process.env.REACT_APP_CLERK_PUBLISHABLE_KEY': JSON.stringify(env.REACT_APP_CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY || ''),
      'process.env.REACT_APP_GOOGLE_CLIENT_ID': JSON.stringify(env.REACT_APP_GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || ''),
      'process.env.REACT_APP_EMAILJS_SERVICE_ID': JSON.stringify(env.REACT_APP_EMAILJS_SERVICE_ID || env.VITE_EMAILJS_SERVICE_ID || ''),
      'process.env.REACT_APP_EMAILJS_TEMPLATE_ID': JSON.stringify(env.REACT_APP_EMAILJS_TEMPLATE_ID || env.VITE_EMAILJS_TEMPLATE_ID || ''),
      'process.env.REACT_APP_EMAILJS_PUBLIC_KEY': JSON.stringify(env.REACT_APP_EMAILJS_PUBLIC_KEY || env.VITE_EMAILJS_PUBLIC_KEY || ''),
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(env.REACT_APP_API_BASE_URL || env.VITE_API_BASE_URL || '/api'),
      'process.env.NODE_ENV': JSON.stringify(actualMode === 'production' ? 'production' : 'development'),
    },
  }
})





