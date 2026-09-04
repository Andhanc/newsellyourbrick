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
