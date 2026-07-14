import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readOrEmpty(url) {
  try {
    return await readFile(url, 'utf8')
  } catch {
    return ''
  }
}

const source = await readFile(new URL('./SiteNotificationsPanel.jsx', import.meta.url), 'utf8')
const css = await readOrEmpty(new URL('./SiteNotificationsPanel.css', import.meta.url))
const context = await readFile(new URL('./SiteNotificationsContext.jsx', import.meta.url), 'utf8')
const legacyMainCss = await readFile(new URL('../pages/MainPage.css', import.meta.url), 'utf8')

test('notification center is an accessible grouped inbox', () => {
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby="notification-panel-title"/)
  assert.match(source, /groupBuyerNotifications/)
  assert.match(source, /notification-panel__group/)
  assert.match(source, /notification-panel__unread/)
  assert.match(source, /markAllNotificationsRead/)
})

test('notification center has explicit loading, empty and item states', () => {
  assert.match(source, /notification-panel__skeleton/)
  assert.match(source, /notification-panel__empty/)
  assert.match(source, /Важные шаги по сделке появятся здесь/)
  assert.match(source, /notification-item--unread/)
  assert.match(source, /notification-item__time/)
})

test('notification center is a mobile bottom sheet and desktop side panel', () => {
  assert.match(css, /align-items:\s*flex-end/)
  assert.match(css, /border-radius:\s*var\(--buyer-radius-sheet\)\s+var\(--buyer-radius-sheet\)\s+0\s+0/)
  assert.match(css, /min-height:\s*var\(--buyer-touch\)/)
  assert.match(css, /env\(safe-area-inset-bottom/)
  assert.match(css, /@media\s*\(min-width:\s*768px\)[\s\S]*right:\s*0/)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.doesNotMatch(legacyMainCss, /\.notification-(?:panel|backdrop|item)(?:\s|\{|__|--)/)
})

test('live outbid and booking updates use structured actionable toasts', () => {
  assert.match(context, /dedupeKey:/)
  assert.match(context, /action:\s*\{/)
  assert.match(context, /title:/)
  assert.match(context, /markAllNotificationsRead/)
})

test('read state is only committed after every server update succeeds', () => {
  assert.match(context, /if \(!response\.ok\) throw new Error/)
  assert.match(context, /const responses = await Promise\.all/)
  assert.match(context, /responses\.forEach\(ensureSuccessfulNotificationResponse\)/)
})

test('panel close handlers never pass a click event as an after-close callback', () => {
  assert.doesNotMatch(context, /const closePanel = requestClose/)
  assert.match(context, /const closePanel = useCallback\(\(\) => requestClose\(\)/)
  assert.match(source, /notification-panel--closing/)
})
