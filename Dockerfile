# Используем официальный образ Node.js
FROM node:20-slim

# Устанавливаем системные зависимости для better-sqlite3 и Puppeteer
# Отключаем IPv6 для избежания проблем с NO_SOCKET и IPV6_NDISC_BAD_CODE на Railway
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1 \
    libx11-6 \
    libxss1 \
    libxcb1 \
    libxau6 \
    libxdmcp6 \
    procps \
    && rm -rf /var/lib/apt/lists/* \
    && echo "net.ipv6.conf.all.disable_ipv6 = 1" >> /etc/sysctl.conf \
    && echo "net.ipv6.conf.default.disable_ipv6 = 1" >> /etc/sysctl.conf

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
# Используем npm install вместо npm ci для большей гибкости
RUN npm install --legacy-peer-deps

# Копируем остальные файлы
COPY . .

# Создаем .env.production из переменных окружения Railway перед сборкой
# Railway автоматически делает переменные окружения доступными через process.env
RUN node scripts/create-env.js || echo "⚠️ Не удалось создать .env.production, продолжаем сборку..."

# Собираем проект для продакшена
# Переменные окружения теперь доступны через .env.production и process.env
RUN npm run build

# Открываем порт для Express-сервера
# В production запускается ТОЛЬКО node server/server.js (не Vite dev-сервер!)
# Railway передаёт PORT=8080 (или другой) в process.env, Express слушает на нём
EXPOSE 8080

# Отключаем IPv6 для Node.js (избегаем проблем с NO_SOCKET и IPV6_NDISC_BAD_CODE)
# Используем переменную окружения для принудительного использования IPv4
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Устанавливаем NODE_ENV для production
ENV NODE_ENV=production

# Запускаем приложение в production режиме
CMD ["node", "server/server.js"]
