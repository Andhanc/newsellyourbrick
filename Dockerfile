FROM node:20-slim

# Системные зависимости для нативных модулей и Puppeteer/WhatsApp Web.
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Сначала зависимости, чтобы использовать layer cache.
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Затем исходники.
COPY . .

# Prisma Client (node_modules/.prisma/client) не попадает в git — генерируем при сборке образа.
# Prisma 7 читает url из prisma.config.ts; для generate достаточно валидной строки (БД не нужна).
RUN DATABASE_URL="${DATABASE_URL:-postgresql://dummy:dummy@127.0.0.1:5432/dummy?schema=public}" \
  npx prisma generate

# Генерируем env для Vite-сборки (если переменные уже проброшены на этапе build).
RUN node scripts/create-env.js || echo "⚠️ Не удалось создать .env.production, продолжаем сборку..."

# Собираем фронтенд.
RUN npm run build

ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first

EXPOSE 8080

# Для надёжного деплоя сначала применяем миграции Prisma, затем запускаем сервер.
CMD ["sh", "-c", "npx prisma migrate deploy && node server/server.js"]
