# PostgreSQL + Prisma migration status

## Текущий статус

Миграция завершена: сервер работает с PostgreSQL через Prisma.

## Что внедрено

- Удалены runtime-зависимости от SQLite и `better-sqlite3` в серверном коде.
- `server/database/database.js` переведен на Prisma-only точку входа.
- Серверные query-модули (`module1...module9`) работают через Prisma.
- Удалены скрипты, привязанные к SQLite-переносу/аудиту.
- В `prismaClient` подключен Postgres adapter (`@prisma/adapter-pg`) для текущего Prisma runtime.
- Проверен запуск сервера с успешной инициализацией PostgreSQL.

## Обязательная конфигурация

- В `.env` должен быть корректный `DATABASE_URL`:
  `postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public`

## Признаки корректного старта

- В логах сервера есть сообщение:
  `✅ PostgreSQL: подключение OK, таблицы недвижимости: ...`
- Команда `npm run db:status` показывает актуальное состояние миграций.

## Примечание

В `prisma/schema.prisma` могут оставаться исторические имена map/constraint из старой схемы. Это не мешает работе с PostgreSQL и не означает наличие SQLite в рантайме.
