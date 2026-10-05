import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatBuyerNotificationMessage,
  getNotificationOutbidAmountLabel,
  stripPropertyNameEcho,
} from './formatBuyerNotificationMessage.js'

const t = (key, opts = {}) => {
  if (key === 'notificationsOutbidNewMaxBid') {
    return `Новая максимальная ставка: ${opts.amount}`
  }
  if (key === 'notificationsOutbidShort') return opts.defaultValue
  return opts.defaultValue || key
}

test('outbid with property card shows only the new max bid', () => {
  const message = formatBuyerNotificationMessage({
    notification: {
      type: 'bid_outbid',
      message:
        'Ваша ставка на объект "Квартира в центре Мадрида" была перебита. Новая максимальная ставка: 12 500 €. Вы можете сделать новую ставку!',
    },
    data: { new_bid_amount: 12500, currency: 'EUR' },
    propertyName: 'Квартира в центре Мадрида',
    hasPropertyCard: true,
    locale: 'ru-RU',
    t,
  })
  assert.equal(message, 'Новая максимальная ставка: 12 500 €')
  assert.doesNotMatch(message, /Мадрида/)
  assert.doesNotMatch(message, /сделать новую ставку/i)
})

test('outbid without structured amount still strips property name echo', () => {
  const message = formatBuyerNotificationMessage({
    notification: {
      type: 'bid_outbid',
      message:
        'Ваша ставка на объект "Villa Sol" была перебита. Новая максимальная ставка: 9 000 €.',
    },
    data: {},
    propertyName: 'Villa Sol',
    hasPropertyCard: true,
    t,
  })
  assert.match(message, /Новая максимальная ставка:\s*9 000 €/)
  assert.doesNotMatch(message, /Villa Sol/)
})

test('stripPropertyNameEcho removes quoted property title', () => {
  const cleaned = stripPropertyNameEcho(
    'Ставка на объект «Дом у моря» перебита. Новая ставка выше.',
    'Дом у моря',
  )
  assert.doesNotMatch(cleaned, /Дом у моря/)
  assert.match(cleaned, /перебита/i)
})

test('auction_lost and payment_deadline use i18n instead of Russian DB text', () => {
  const tEs = (key, opts = {}) => {
    const map = {
      notificationMessage_auctionLostShort: 'La subasta ha finalizado. Ganó otro participante.',
      notificationMessage_paymentDeadlineShort: `Pague el depósito antes del ${opts.deadline} para conservar el derecho de compra.`,
      notificationMessage_auctionWonShort: '¡Enhorabuena! Ha ganado la subasta.',
      listingDefault: 'Anuncio',
    }
    return map[key] || opts.defaultValue || key
  }

  const lost = formatBuyerNotificationMessage({
    notification: {
      type: 'auction_lost',
      message: 'Аукцион по объекту "Villa" завершен. Победил другой участник.',
    },
    data: { property_id: 1 },
    propertyName: 'Villa',
    hasPropertyCard: true,
    locale: 'es',
    t: tEs,
  })
  assert.equal(lost, 'La subasta ha finalizado. Ganó otro participante.')
  assert.doesNotMatch(lost, /Аукцион|завершен/)

  const deadline = formatBuyerNotificationMessage({
    notification: {
      type: 'payment_deadline',
      message: 'Оплатите депозит до 13.09.2026, чтобы сохранить право на покупку.',
    },
    data: { deposit_due_date: '2026-09-13T17:30:00.000Z' },
    propertyName: 'Casa',
    hasPropertyCard: true,
    locale: 'es-ES',
    t: tEs,
  })
  assert.match(deadline, /Pague el depósito/)
  assert.doesNotMatch(deadline, /Оплатите|депозит/)

  const won = formatBuyerNotificationMessage({
    notification: { type: 'auction_won', message: 'Поздравляем! Вы победили…' },
    data: { property_id: 2 },
    propertyName: 'Casa',
    hasPropertyCard: true,
    locale: 'es',
    t: tEs,
  })
  assert.equal(won, '¡Enhorabuena! Ha ganado la subasta.')
})

test('getNotificationOutbidAmountLabel prefers structured data', () => {
  assert.equal(
    getNotificationOutbidAmountLabel({
      data: { new_bid_amount: 1000, currency: 'EUR' },
      message: '',
      locale: 'en-US',
    }),
    '€1,000',
  )
})

test('formatNotificationDeadline uses the UI locale', async () => {
  const { formatNotificationDeadline } = await import('./formatBuyerNotificationMessage.js')
  const formatted = formatNotificationDeadline('2026-09-13T17:30:00.000Z', 'es-ES')
  assert.ok(formatted)
  assert.doesNotMatch(formatted, /сент/)
})

test('seller no_bids and property_approved use i18n instead of Russian DB text', () => {
  const tEs = (key, opts = {}) => {
    const map = {
      notificationMessage_noBids45DaysShort:
        'Durante 45 días desde la publicación no ha habido pujas ni interacción.',
      notificationMessage_propertyApprovedShort:
        'Su inmueble ha pasado la verificación y se ha publicado.',
      notificationMessage_propertyEditApprovedShort:
        'Los cambios se han aprobado y aplicado al anuncio publicado.',
    }
    return map[key] || opts.defaultValue || key
  }

  const noBids = formatBuyerNotificationMessage({
    notification: {
      type: 'no_bids_45_days',
      title: 'Рекомендация по снижению цены',
      message: 'За 45 дней с момента выставления вашего объекта "Villa" не произошло ставок...',
    },
    data: { property_id: 1, property_title: 'Villa' },
    propertyName: 'Villa',
    hasPropertyCard: true,
    locale: 'es',
    t: tEs,
  })
  assert.equal(noBids, 'Durante 45 días desde la publicación no ha habido pujas ni interacción.')
  assert.doesNotMatch(noBids, /За 45 дней|Рекомендация/)

  const approved = formatBuyerNotificationMessage({
    notification: {
      type: 'property_approved',
      title: 'Ваш объект прошел верификацию',
      message: 'Ваш объект "Villa" прошел верификацию...',
    },
    data: { property_id: 2, approval_kind: 'publish' },
    propertyName: 'Villa',
    hasPropertyCard: true,
    locale: 'es',
    t: tEs,
  })
  assert.equal(approved, 'Su inmueble ha pasado la verificación y se ha publicado.')
  assert.doesNotMatch(approved, /прошел верификацию/)

  const edited = formatBuyerNotificationMessage({
    notification: {
      type: 'property_approved',
      title: 'Изменения в объекте одобрены',
      message: 'Изменения в объекте "Villa" одобрены...',
    },
    data: { property_id: 3, approval_kind: 'edit' },
    propertyName: 'Villa',
    hasPropertyCard: true,
    locale: 'es',
    t: tEs,
  })
  assert.equal(edited, 'Los cambios se han aprobado y aplicado al anuncio publicado.')
})

