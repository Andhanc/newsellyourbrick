/** @param {unknown} v */
export function parseDateMs(v) {
  if (v == null || v === '') return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * Сделка «купить сейчас» завершена (в т.ч. менеджером в запросах на покупку) — аукцион для UI считается закрытым,
 * даже если auction_end_date / test_timer_end_date ещё в будущем в БД.
 * @param {Record<string, unknown> | null | undefined} property
 */
export function isBuyNowPurchaseCompleted(property) {
  return (
    property?.buy_now_winner_user_id != null &&
    property?.buy_now_completed_at != null &&
    String(property.buy_now_completed_at).trim() !== ''
  )
}

/**
 * В БД задано поле test_timer_end_date (может быть запланировано заранее на фазу после преаукциона).
 */
export function hasTestTimerDateString(property) {
  const v = property?.test_timer_end_date
  if (v == null || v === '') return false
  if (typeof v === 'string') return v.trim() !== ''
  return true
}

/**
 * Идёт преаукцион: дата окончания линейного этапа (auction_end_date) ещё в будущем.
 * @param {Record<string, unknown> | null | undefined} property
 */
export function isPreAuctionPhaseActive(property) {
  if (isBuyNowPurchaseCompleted(property)) return false
  const endMs = parseDateMs(property?.auction_end_date)
  return endMs != null && endMs > Date.now()
}

/**
 * Показывать круговой таймер: test_timer задан и преаукцион уже закончился (или auction_end_date не задан).
 * Если оба срока заданы одновременно, до конца преаукциона остаётся линейный `PropertyTimer`.
 * @param {Record<string, unknown> | null | undefined} property
 */
export function shouldShowCircularAuctionTimer(property) {
  if (isBuyNowPurchaseCompleted(property)) return false
  if (!hasTestTimerDateString(property)) return false
  // Тестовый режим: если задана исходная длительность кругового таймера,
  // сразу показываем круговой сценарий даже при активном pre-auction.
  if (property?.test_timer_duration != null && Number(property.test_timer_duration) > 0) return true
  if (isPreAuctionPhaseActive(property)) return false
  return true
}

/**
 * На карточке объекта включён круговой тестовый таймер (`CircularTimer`, поле test_timer_end_date).
 * Напоминание об аукционе доступно только в преаукционе с линейным таймером (`PropertyTimer`), не в этой фазе.
 * @param {Record<string, unknown> | null | undefined} property
 */
export function hasActiveCircularTestTimer(property) {
  return shouldShowCircularAuctionTimer(property)
}

/**
 * Единая дата окончания текущей фазы аукциона для отсчёта и PropertyTimer.
 * Преаукцион: только auction_end_date; после него — test_timer_end_date, иначе fallback.
 * @param {Record<string, unknown> | null | undefined} property
 */
export function getEffectiveAuctionEndTime(property) {
  if (!property) return null
  if (isBuyNowPurchaseCompleted(property)) return null
  // Для тестового режима приоритет у кругового таймера.
  if (property?.test_timer_duration != null && Number(property.test_timer_duration) > 0 && hasTestTimerDateString(property)) {
    return property.test_timer_end_date ?? null
  }
  const preEndMs = parseDateMs(property.auction_end_date)
  const now = Date.now()
  if (preEndMs != null && preEndMs > now) {
    return property.auction_end_date ?? null
  }
  if (hasTestTimerDateString(property)) {
    return property.test_timer_end_date ?? null
  }
  const fallback = property.endTime ?? property.auction_end_date ?? null
  return fallback != null && fallback !== '' ? fallback : null
}

/**
 * Истёк ли таймер текущей фазы (с учётом преаукциона vs кругового этапа).
 * @param {Record<string, unknown> | null | undefined} property
 */
export function isEffectiveAuctionTimerExpired(property) {
  if (isBuyNowPurchaseCompleted(property)) return true
  const end = getEffectiveAuctionEndTime(property)
  if (end == null || end === '') return false
  const t = new Date(end).getTime()
  return Number.isFinite(t) && t <= Date.now()
}

/**
 * Завершённый аукцион в списках (таймер истёк или сделка «купить сейчас» закрыта).
 * @param {Record<string, unknown> | null | undefined} property
 */
export function isAuctionListingEnded(property) {
  return isEffectiveAuctionTimerExpired(property)
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
