/** Футер в зоне видимости (мобильный скролл .app-layout). */
export function setSiteFooterNear(near) {
  document.documentElement.classList.toggle('site-footer-near', Boolean(near))
}

/** Открыт inline-чат, поддержка или глобальная модалка AI. */
export function setChatDockActive(active) {
  document.documentElement.classList.toggle('chat-dock-active', Boolean(active))
}
