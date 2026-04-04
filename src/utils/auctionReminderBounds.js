/** @param {unknown} v */
export function parseDateMs(v) {
  if (v == null || v === '') return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * На карточке объекта включён круговой тестовый таймер (`CircularTimer`, поле test_timer_end_date).
 * Напоминание об аукционе доступно только в преаукционе с линейным таймером (`PropertyTimer`), не в этой фазе.
 * @param {Record<string, unknown> | null | undefined} property
 */
export function hasActiveCircularTestTimer(property) {
  const v = property?.test_timer_end_date
  if (v == null || v === '') return false
  if (typeof v === 'string') return v.trim() !== ''
  return true
}

const STEP_MS = 30 * 60 * 1000

/**
 * Диапазон для барабана напоминания (согласован с POST /auction-reminders).
 * Линейный преаукцион: верхняя граница — дата окончания аукциона (как у PropertyTimer без круглого таймера).
 * Ограничение «до даты старта» только если старт ещё в будущем и нет иной логики.
 * Круговой тест-таймер обрабатывается отдельно (кнопка/API).
 * @param {Record<string, unknown> | null | undefined} property
 */
export function getAuctionReminderWheelBounds(property) {
  const now = Date.now()
  const minMs = now + 60_000
  const startMs = parseDateMs(property?.auction_start_date)
  const endMs = parseDateMs(property?.auction_end_date) ?? parseDateMs(property?.endTime)

  let maxMs
  /** @type {'before_start' | 'before_end_inclusive'} */
  let compareMode

  if (endMs != null) {
    maxMs = endMs
    compareMode = 'before_end_inclusive'
  } else if (startMs != null) {
    if (startMs > now) {
      maxMs = startMs
      compareMode = 'before_start'
    } else {
      maxMs = now + 365 * 86400000
      compareMode = 'before_end_inclusive'
    }
  } else {
    maxMs = now + 365 * 86400000
    compareMode = 'before_end_inclusive'
  }

  if (maxMs <= minMs) {
    /** @type {'auction_started' | 'starts_too_soon' | 'auction_ended' | 'unknown'} */
    let badReason = 'unknown'
    if (endMs != null && endMs <= now) {
      badReason = 'auction_ended'
    } else if (compareMode === 'before_start' && startMs != null && startMs > now && startMs <= minMs) {
      badReason = 'starts_too_soon'
    } else if (compareMode === 'before_start' && startMs != null && startMs <= now) {
      badReason = 'auction_started'
    }
    return { ok: false, minMs, maxMs, compareMode, badReason }
  }
  return { ok: true, minMs, maxMs, compareMode }
}

/**
 * Первый допустимый слот (шаг 30 мин) в диапазоне.
 * @param {{ minMs: number, maxMs: number, compareMode: 'before_start' | 'before_end_inclusive' }} b
 */
export function firstScheduledSlot(b) {
  let t = Math.ceil(b.minMs / STEP_MS) * STEP_MS
  const limit = b.maxMs + STEP_MS * 500
  while (t <= limit) {
    if (b.compareMode === 'before_start') {
      if (t < b.maxMs) return new Date(t)
    } else if (t <= b.maxMs) {
      return new Date(t)
    }
    t += STEP_MS
  }
  return new Date(b.minMs)
}
