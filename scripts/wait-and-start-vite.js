/**
 * Скрипт для ожидания готовности сервера перед запуском Vite
 * Проверяет доступность /health endpoint каждые 500ms
 */

import { spawn } from 'child_process';
import http from 'http';
import { setTimeout } from 'timers/promises';

const SERVER_PORT = process.env.SERVER_PORT || 3000;
const MAX_RETRIES = 30; // 30 попыток = 15 секунд максимум
const RETRY_DELAY = 500; // 500ms между попытками

console.log('[FRONTEND] ⏳ Ожидание готовности сервера на порту', SERVER_PORT);

function checkServerHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${SERVER_PORT}/health`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Health check returned status ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(1000, () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
}

async function waitForServer() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await checkServerHealth();
      console.log(`[FRONTEND] ✅ Сервер готов! Запускаем Vite...`);
      return true;
    } catch (error) {
      if (i < MAX_RETRIES - 1) {
        // Не логируем каждую попытку, чтобы не засорять логи
        if (i % 5 === 0) {
          console.log(`[FRONTEND] ⏳ Ожидание сервера... (попытка ${i + 1}/${MAX_RETRIES})`);
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.warn(`[FRONTEND] ⚠️ Сервер не отвечает после ${MAX_RETRIES} попыток. Запускаем Vite anyway...`);
        return false;
      }
    }
  }
  return false;
}

// Ждем сервер и запускаем Vite
waitForServer().then(() => {
  console.log('[FRONTEND] 🚀 Запуск Vite dev server...');
  const viteProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  viteProcess.on('error', (error) => {
    console.error('[FRONTEND] ❌ Ошибка при запуске Vite:', error);
    process.exit(1);
  });

  viteProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[FRONTEND] ❌ Vite завершился с кодом ${code}`);
      process.exit(code);
    }
  });
}).catch((error) => {
  console.error('[FRONTEND] ❌ Критическая ошибка:', error);
  process.exit(1);
});
