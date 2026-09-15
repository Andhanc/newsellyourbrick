/** Открыть AI-чат в кабинете продавца (слушает SiteChatDock / useSiteAiChatDock). */
export function openOwnerAiChat() {
  window.dispatchEvent(new CustomEvent('openAIChat'))
}

/** Открыть поддержку в кабинете продавца. */
export function openOwnerManagerChat() {
  window.dispatchEvent(new CustomEvent('openManagerChat'))
}
