const TOAST_TYPES = new Set(['success', 'error', 'warning', 'info'])

export const TOAST_TITLE_I18N_KEYS = Object.freeze({
  success: 'toastTitleSuccess',
  error: 'toastTitleError',
  warning: 'toastTitleWarning',
  info: 'toastTitleInfo',
})

/** English fallbacks; live UI resolves via i18n in ToastContainer. */
export const DEFAULT_TITLES = Object.freeze({
  success: 'Done',
  error: 'Needs attention',
  warning: 'Please note',
  info: 'Tip',
})

function validDuration(value, fallback = 5000) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function validAction(action) {
  return Boolean(
    action &&
      typeof action === 'object' &&
      typeof action.label === 'string' &&
      action.label.trim() &&
      typeof action.onClick === 'function',
  )
}

export function isStructuredToastEvent(value) {
  if (!value || typeof value !== 'object') return false
  return ['message', 'title', 'action', 'duration', 'persistent', 'dedupeKey', 'announcement'].some(
    (key) => Object.prototype.hasOwnProperty.call(value, key),
  )
}

export function resolveToastTitle(type, explicitTitle, translate) {
  if (typeof explicitTitle === 'string' && explicitTitle.trim()) {
    return explicitTitle.trim()
  }
  const safeType = TOAST_TYPES.has(type) ? type : 'info'
  const key = TOAST_TITLE_I18N_KEYS[safeType]
  const fallback = DEFAULT_TITLES[safeType]
  if (typeof translate === 'function') {
    try {
      const translated = translate(key, fallback)
      if (typeof translated === 'string' && translated.trim() && translated !== key) {
        return translated.trim()
      }
    } catch {
      // ignore
    }
  }
  return fallback
}

export function normalizeToastEvent(
  messageOrEvent,
  legacyType = 'info',
  legacyDuration = 5000,
  { translate } = {},
) {
  if (!isStructuredToastEvent(messageOrEvent)) {
    const type = TOAST_TYPES.has(legacyType) ? legacyType : 'info'
    return {
      type,
      title: resolveToastTitle(type, null, translate),
      message: messageOrEvent ?? '',
      action: null,
      duration: validDuration(legacyDuration),
      persistent: false,
      dedupeKey: null,
      announcement: type === 'error' ? 'assertive' : 'polite',
    }
  }

  const type = TOAST_TYPES.has(messageOrEvent.type) ? messageOrEvent.type : 'info'
  const persistent = messageOrEvent.persistent === true
  const dedupeKey =
    typeof messageOrEvent.dedupeKey === 'string' && messageOrEvent.dedupeKey.trim()
      ? messageOrEvent.dedupeKey.trim().slice(0, 160)
      : null

  return {
    type,
    title: resolveToastTitle(type, messageOrEvent.title, translate),
    message: String(messageOrEvent.message ?? ''),
    action: validAction(messageOrEvent.action) ? messageOrEvent.action : null,
    duration: persistent ? 0 : validDuration(messageOrEvent.duration),
    persistent,
    dedupeKey,
    announcement:
      messageOrEvent.announcement === 'assertive' || type === 'error' ? 'assertive' : 'polite',
  }
}

function updateDuplicate(events, incoming) {
  if (!incoming.dedupeKey) return { found: false, events }
  const index = events.findIndex((event) => event.dedupeKey === incoming.dedupeKey)
  if (index < 0) return { found: false, events }

  const next = [...events]
  next[index] = { ...next[index], ...incoming, id: next[index].id }
  return { found: true, events: next }
}

export function enqueueToast(state, incoming, { maxVisible = 3, maxQueued = 20 } = {}) {
  const visible = Array.isArray(state?.visible) ? state.visible : []
  const queued = Array.isArray(state?.queued) ? state.queued : []

  const activeUpdate = updateDuplicate(visible, incoming)
  if (activeUpdate.found) return { visible: activeUpdate.events, queued: [...queued] }

  const queuedUpdate = updateDuplicate(queued, incoming)
  if (queuedUpdate.found) return { visible: [...visible], queued: queuedUpdate.events }

  if (visible.length < maxVisible) {
    return { visible: [...visible, incoming], queued: [...queued] }
  }

  return {
    visible: [...visible],
    queued: [...queued, incoming].slice(-maxQueued),
  }
}

export function removeToast(state, id, { maxVisible = 3 } = {}) {
  const visible = (state?.visible || []).filter((event) => event.id !== id)
  const queued = [...(state?.queued || [])]

  if (visible.length === state?.visible?.length) {
    return { visible, queued: queued.filter((event) => event.id !== id) }
  }

  while (visible.length < maxVisible && queued.length > 0) {
    visible.push(queued.shift())
  }
  return { visible, queued }
}
