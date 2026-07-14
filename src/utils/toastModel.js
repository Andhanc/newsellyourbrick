const TOAST_TYPES = new Set(['success', 'error', 'warning', 'info'])
const DEFAULT_TITLES = Object.freeze({
  success: 'Готово',
  error: 'Нужно исправить',
  warning: 'Обратите внимание',
  info: 'Подсказка',
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

export function normalizeToastEvent(messageOrEvent, legacyType = 'info', legacyDuration = 5000) {
  if (!isStructuredToastEvent(messageOrEvent)) {
    const type = TOAST_TYPES.has(legacyType) ? legacyType : 'info'
    return {
      type,
      title: DEFAULT_TITLES[type],
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
    title:
      typeof messageOrEvent.title === 'string' && messageOrEvent.title.trim()
        ? messageOrEvent.title.trim()
        : DEFAULT_TITLES[type],
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
