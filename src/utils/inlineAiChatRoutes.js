const INLINE_AI_CHAT_PATHS = new Set(['/', '/auction', '/main', '/shares', '/debts'])

export function isInlineAiChatRoute(pathname) {
  if (!pathname) return false
  return INLINE_AI_CHAT_PATHS.has(pathname)
}
