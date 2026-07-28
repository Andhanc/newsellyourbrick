import { isAuctionRoute } from './auctionFilterUrl'

const INLINE_AI_CHAT_PATHS = new Set(['/', '/auction', '/main', '/co-investment', '/shares', '/debts', '/test-drive'])

export function isInlineAiChatRoute(pathname) {
  if (!pathname) return false
  if (isAuctionRoute(pathname)) return true
  return INLINE_AI_CHAT_PATHS.has(pathname)
}
