-- Удаление логина пользователя из таблицы users.
-- ВАЖНО: выполнить на production/staging вручную после бэкапа.

DROP INDEX IF EXISTS idx_users_username;
ALTER TABLE users DROP COLUMN IF EXISTS username;
