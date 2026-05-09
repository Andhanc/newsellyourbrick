/**
 * Открыто ли общее боковое меню (бургер в Header / MainPage).
 * По классу скрываем плавающую кнопку AI без подписки в каждом виджете.
 */
export function setSiteNavDrawerOpen(open) {
  document.documentElement.classList.toggle('site-nav-drawer-open', Boolean(open))
}
