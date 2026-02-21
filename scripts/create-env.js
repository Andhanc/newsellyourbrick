// Скрипт для создания .env.production из переменных окружения Railway
// Этот скрипт запускается перед сборкой в Dockerfile

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envContent = `# Этот файл создан автоматически из переменных окружения Railway
# Не редактируйте вручную - он будет пересоздан при каждой сборке

REACT_APP_CLERK_PUBLISHABLE_KEY=${process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || ''}
VITE_CLERK_PUBLISHABLE_KEY=${process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || ''}
REACT_APP_GOOGLE_CLIENT_ID=${process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || ''}
VITE_GOOGLE_CLIENT_ID=${process.env.VITE_GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}
REACT_APP_EMAILJS_SERVICE_ID=${process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || ''}
VITE_EMAILJS_SERVICE_ID=${process.env.VITE_EMAILJS_SERVICE_ID || process.env.REACT_APP_EMAILJS_SERVICE_ID || ''}
REACT_APP_EMAILJS_TEMPLATE_ID=${process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || ''}
VITE_EMAILJS_TEMPLATE_ID=${process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.REACT_APP_EMAILJS_TEMPLATE_ID || ''}
REACT_APP_EMAILJS_PUBLIC_KEY=${process.env.REACT_APP_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || ''}
VITE_EMAILJS_PUBLIC_KEY=${process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.REACT_APP_EMAILJS_PUBLIC_KEY || ''}
REACT_APP_API_BASE_URL=${process.env.REACT_APP_API_BASE_URL || process.env.VITE_API_BASE_URL || '/api'}
VITE_API_BASE_URL=${process.env.VITE_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || '/api'}
`;

const envPath = join(__dirname, '..', '.env.production');

try {
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ .env.production создан успешно');
  console.log('📋 Переменные окружения:');
  console.log(`   REACT_APP_CLERK_PUBLISHABLE_KEY: ${process.env.REACT_APP_CLERK_PUBLISHABLE_KEY ? '✅ установлен' : '❌ не установлен'}`);
  console.log(`   REACT_APP_GOOGLE_CLIENT_ID: ${process.env.REACT_APP_GOOGLE_CLIENT_ID ? '✅ установлен' : '❌ не установлен'}`);
} catch (error) {
  console.error('❌ Ошибка при создании .env.production:', error);
  process.exit(1);
}
