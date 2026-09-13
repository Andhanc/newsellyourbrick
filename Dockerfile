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
RUN npm ci --legacy-peer-deps --ignore-scripts

# whatsapp-web.js: Chromium для Puppeteer (npm ci --ignore-scripts пропускает скачивание браузеров).
RUN npx puppeteer browsers install chrome

# Затем исходники.
COPY . .

# Prisma Client (node_modules/.prisma/client) не попадает в git — генерируем при сборке образа.
# Prisma 7 читает url из prisma.config.ts; для generate достаточно валидной строки (БД не нужна).
RUN DATABASE_URL="${DATABASE_URL:-postgresql://dummy:dummy@127.0.0.1:5432/dummy?schema=public}" \
  npx prisma generate

# Railway: Variables доступны в Docker-build только через ARG (не через process.env автоматически).
# Vite вшивает VITE_*/REACT_APP_* на этапе build — без ARG ключ карты будет пустым в бандле.
ARG REACT_APP_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_CLIENT_ID
ARG REACT_APP_EMAILJS_SERVICE_ID
ARG VITE_EMAILJS_SERVICE_ID
ARG REACT_APP_EMAILJS_TEMPLATE_ID
ARG VITE_EMAILJS_TEMPLATE_ID
ARG REACT_APP_EMAILJS_PUBLIC_KEY
ARG VITE_EMAILJS_PUBLIC_KEY
ARG REACT_APP_API_BASE_URL
ARG VITE_API_BASE_URL
ARG VITE_YANDEX_MAPS_API_KEY
ARG VITE_INTELLIGENCE_IO_API_KEY

ENV REACT_APP_CLERK_PUBLISHABLE_KEY=$REACT_APP_CLERK_PUBLISHABLE_KEY \
    VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
    REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    REACT_APP_EMAILJS_SERVICE_ID=$REACT_APP_EMAILJS_SERVICE_ID \
    VITE_EMAILJS_SERVICE_ID=$VITE_EMAILJS_SERVICE_ID \
    REACT_APP_EMAILJS_TEMPLATE_ID=$REACT_APP_EMAILJS_TEMPLATE_ID \
    VITE_EMAILJS_TEMPLATE_ID=$VITE_EMAILJS_TEMPLATE_ID \
    REACT_APP_EMAILJS_PUBLIC_KEY=$REACT_APP_EMAILJS_PUBLIC_KEY \
    VITE_EMAILJS_PUBLIC_KEY=$VITE_EMAILJS_PUBLIC_KEY \
    REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_YANDEX_MAPS_API_KEY=$VITE_YANDEX_MAPS_API_KEY \
    VITE_INTELLIGENCE_IO_API_KEY=$VITE_INTELLIGENCE_IO_API_KEY

# Генерируем env для Vite-сборки (если переменные уже проброшены на этапе build).
RUN node scripts/create-env.js || echo "⚠️ Не удалось создать .env.production, продолжаем сборку..."

# Собираем фронтенд.
RUN npm run build

ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first

EXPOSE 8080

# Единая точка запуска: prestart (prisma generate + retry migrate), затем server.
CMD ["npm", "start"]
