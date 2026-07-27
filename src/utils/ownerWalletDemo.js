/** Demo wallet data for owner-test cabinet. */

import { OWL_IMAGES } from '../pages/ownerWalletImages'
import { getOwnerTestIntlLocale } from './ownerTestI18n'

export const OWNER_WALLET_TX_TYPE_KEYS = {
  income: {
    id: 'income',
    labelKey: 'ownerTest_walletTxIncome',
    tone: 'positive',
    icon: 'income',
  },
  deal_completed: {
    id: 'deal_completed',
    labelKey: 'ownerTest_walletTxDealCompleted',
    tone: 'positive',
    icon: 'deal',
  },
  platform_commission: {
    id: 'platform_commission',
    labelKey: 'ownerTest_walletTxCommission',
    hintKey: 'ownerTest_walletTxCommissionHint',
    tone: 'negative',
    icon: 'commission',
  },
  withdrawal: {
    id: 'withdrawal',
    labelKey: 'ownerTest_walletTxWithdrawal',
    tone: 'negative',
    icon: 'withdrawal',
  },
}

/** @deprecated Use getWalletTxTypeMeta(typeId, t) */
export const OWNER_WALLET_TX_TYPES = Object.fromEntries(
  Object.entries(OWNER_WALLET_TX_TYPE_KEYS).map(([id, meta]) => [
    id,
    { ...meta, label: meta.labelKey, hint: meta.hintKey },
  ])
)

export function getWalletTxTypeMeta(typeId, t) {
  const meta = OWNER_WALLET_TX_TYPE_KEYS[typeId]
  if (!meta) return { label: typeId, icon: 'income' }
  return {
    ...meta,
    label: t(meta.labelKey),
    hint: meta.hintKey ? t(meta.hintKey) : undefined,
  }
}

export function getWalletFilterOptions(t) {
  return [
    { id: 'all', label: t('ownerTest_walletFilterAll') },
    { id: 'income', label: t('ownerTest_walletFilterIncome') },
    { id: 'withdrawal', label: t('ownerTest_walletFilterWithdrawal') },
    { id: 'commission', label: t('ownerTest_walletFilterCommission') },
  ]
}

export const DEMO_STRIPE_PAYOUT = {
  brand: 'Visa',
  last4: '4242',
  expMonth: '12',
  expYear: '26',
}

export const DEMO_WALLET_BALANCES = {
  available: 1250000,
  processing: 850000,
  withdrawnTotal: 4750000,
}

export const DEMO_WALLET_TRANSACTIONS = [
  {
    id: 'tx-1',
    date: '2024-05-28T14:30:00',
    propertyTitle: 'Эко-усадьба «Лесной край»',
    propertyId: '58941',
    propertyImage: OWL_IMAGES.thumbForest,
    type: 'income',
    amount: 1200000,
    status: 'completed',
    isShare: false,
  },
  {
    id: 'tx-2',
    date: '2024-05-28T14:30:00',
    propertyTitle: 'Эко-усадьба «Лесной край»',
    propertyId: '58941',
    propertyImage: OWL_IMAGES.thumbForest,
    type: 'deal_completed',
    amount: 1200000,
    status: 'completed',
    isShare: false,
  },
  {
    id: 'tx-3',
    date: '2024-05-28T14:30:00',
    propertyTitle: 'Эко-усадьба «Лесной край»',
    propertyId: '58941',
    propertyImage: OWL_IMAGES.thumbForest,
    type: 'platform_commission',
    amount: -9800,
    status: 'completed',
    isShare: false,
  },
  {
    id: 'tx-4',
    date: '2024-05-24T11:15:00',
    propertyTitle: 'Апартаменты в центре',
    propertyId: '47218',
    propertyImage: OWL_IMAGES.thumbApartment,
    type: 'deal_completed',
    amount: 850000,
    status: 'completed',
    isShare: false,
  },
  {
    id: 'tx-5',
    date: '2024-05-24T11:15:00',
    propertyTitle: 'Апартаменты в центре',
    propertyId: '47218',
    propertyImage: OWL_IMAGES.thumbApartment,
    type: 'platform_commission',
    amount: -8500,
    status: 'completed',
    isShare: false,
  },
  {
    id: 'tx-6',
    date: '2024-05-20T09:00:00',
    propertyTitle: '—',
    propertyId: null,
    propertyImage: null,
    type: 'withdrawal',
    amount: -500000,
    status: 'done',
    isShare: false,
  },
  {
    id: 'tx-7',
    date: '2024-05-14T16:45:00',
    propertyTitle: 'Лофт на набережной',
    propertyId: '33102',
    propertyImage: OWL_IMAGES.thumbLoft,
    type: 'income',
    amount: 620000,
    status: 'processing',
    isShare: false,
  },
  {
    id: 'tx-8',
    date: '2024-05-10T10:20:00',
    propertyTitle: 'Пентхаус с видом на море',
    propertyId: '29877',
    propertyImage: OWL_IMAGES.thumbPenthouse,
    type: 'deal_completed',
    amount: 2450000,
    status: 'completed',
    isShare: false,
  },
]

/** @deprecated Use getWalletFilterOptions(t) */
export const WALLET_FILTER_OPTIONS = []

export function formatWalletAmount(value, { signed = false, locale } = {}) {
  const intlLocale = locale || getOwnerTestIntlLocale()
  const num = Number(value) || 0
  const abs = Math.abs(num)
  const formatted = abs.toLocaleString(intlLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  if (!signed) return `${formatted} ₽`
  if (num > 0) return `+ ${formatted} ₽`
  if (num < 0) return `− ${formatted} ₽`
  return `${formatted} ₽`
}

export function formatWalletDate(iso, locale) {
  const intlLocale = locale || getOwnerTestIntlLocale()
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  const datePart = d.toLocaleDateString(intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timePart = d.toLocaleTimeString(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart}, ${timePart}`
}

export function formatWalletDateParts(iso, locale) {
  const intlLocale = locale || getOwnerTestIntlLocale()
  if (!iso) return { date: '—', time: '' }
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return { date: '—', time: '' }
  return {
    date: d.toLocaleDateString(intlLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString(intlLocale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

export function formatWalletDateShort(iso, locale) {
  const intlLocale = locale || getOwnerTestIntlLocale()
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString(intlLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatWalletDateMobile(iso, locale) {
  return formatWalletDate(iso, locale)
}

export function getWalletTxStatusLabel(status, t) {
  const keyByStatus = {
    processing: 'ownerTest_walletTxStatusProcessing',
    done: 'ownerTest_walletTxStatusCompleted',
    pending: 'ownerTest_walletTxStatusPending',
    failed: 'ownerTest_walletTxStatusFailed',
    completed: 'ownerTest_walletTxStatusCompleted',
  }
  const key = keyByStatus[status]
  return key ? t(key) : t('ownerTest_walletTxStatusCompleted')
}

export function shouldShowWalletTxStatus(status) {
  return Boolean(status)
}

export function getWalletTxStatusTone(status) {
  if (status === 'processing') return 'processing'
  if (status === 'done') return 'done'
  return 'completed'
}

export function filterWalletTransactions(rows, filterId) {
  if (filterId === 'all') return rows
  if (filterId === 'income') {
    return rows.filter((row) => row.type === 'income' || row.type === 'deal_completed')
  }
  if (filterId === 'withdrawal') return rows.filter((row) => row.type === 'withdrawal')
  if (filterId === 'commission') return rows.filter((row) => row.type === 'platform_commission')
  return rows
}
