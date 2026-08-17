ALTER TABLE "live_chat_sessions"
ADD COLUMN IF NOT EXISTS "admin_last_read_message_id" INTEGER DEFAULT 0;

-- Считать непрочитанными только сообщения посетителя после последнего ответа менеджера/системы.
UPDATE "live_chat_sessions" s
SET "admin_last_read_message_id" = COALESCE(
  (
    SELECT MAX(m.id)
    FROM "live_chat_messages" m
    WHERE m.session_id = s.id
      AND LOWER(m.sender_role) NOT IN ('user', 'client', 'visitor')
  ),
  0
);
