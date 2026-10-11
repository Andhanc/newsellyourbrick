/**
 * Архив сессий умного помощника в localStorage:
 * очистка чата не уничтожает переписку — её можно открыть снова из списка историй.
 */

export const ASSISTANT_CHAT_SESSIONS_MAX = 20

function storageKey(userId) {
  return `aiChatSessions_${String(userId || 'guest')}`
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function serializeMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((msg) => msg && typeof msg === 'object')
    .map((msg) => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date
        ? msg.timestamp.toISOString()
        : msg.timestamp || new Date().toISOString(),
    }))
}

function firstUserPreview(messages = []) {
  const userMsg = (Array.isArray(messages) ? messages : []).find(
    (msg) => msg?.sender === 'user' && String(msg.text || '').trim(),
  )
  const text = String(userMsg?.text || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > 72 ? `${text.slice(0, 71)}…` : text
}

function hasUserMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).some(
    (msg) => msg?.sender === 'user' && String(msg.text || '').trim(),
  )
}

export function readAssistantChatSessions(userId) {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = safeParse(localStorage.getItem(storageKey(userId)))
    const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : []
    return sessions
      .filter((session) => session && typeof session === 'object' && session.id)
      .map((session) => ({
        id: String(session.id),
        title: String(session.title || '').trim() || 'Chat',
        preview: String(session.preview || session.title || '').trim(),
        createdAt: session.createdAt || session.updatedAt || null,
        updatedAt: session.updatedAt || session.createdAt || null,
        messageCount: Number(session.messageCount) || (Array.isArray(session.messages) ? session.messages.length : 0),
        messages: Array.isArray(session.messages) ? session.messages : [],
        preferences: session.preferences && typeof session.preferences === 'object'
          ? session.preferences
          : null,
      }))
      .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))
  } catch {
    return []
  }
}

function writeSessions(userId, sessions) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(
    storageKey(userId),
    JSON.stringify({
      version: 1,
      sessions: sessions.slice(0, ASSISTANT_CHAT_SESSIONS_MAX),
    }),
  )
}

export function archiveAssistantChatSession(userId, messages = [], preferences = null) {
  if (!hasUserMessages(messages)) return null
  const serialized = serializeMessages(messages)
  const preview = firstUserPreview(serialized)
  const now = new Date().toISOString()
  const session = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: preview || 'Chat',
    preview,
    createdAt: now,
    updatedAt: now,
    messageCount: serialized.length,
    messages: serialized,
    preferences: preferences && typeof preferences === 'object' ? { ...preferences } : null,
  }
  const next = [session, ...readAssistantChatSessions(userId).filter((item) => item.id !== session.id)]
  writeSessions(userId, next)
  return session
}

export function getAssistantChatSession(userId, sessionId) {
  const id = String(sessionId || '')
  if (!id) return null
  return readAssistantChatSessions(userId).find((session) => session.id === id) || null
}

export function deleteAssistantChatSession(userId, sessionId) {
  const id = String(sessionId || '')
  if (!id) return readAssistantChatSessions(userId)
  const next = readAssistantChatSessions(userId).filter((session) => session.id !== id)
  writeSessions(userId, next)
  return next
}

export function clearAssistantChatSessions(userId) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    /* ignore */
  }
}
