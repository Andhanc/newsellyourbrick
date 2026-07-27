export const CO_INVESTMENT_PATH = '/co-investment'
export const TEST_DRIVE_PATH = '/test-drive'

export const SALE_CARDS = [
  {
    id: 'auction',
    title: 'Аукцион',
    description: 'Участвуйте в торгах и приобретайте объекты по лучшей цене',
    imageKey: 'cardAuction' as const,
    to: '/auction?filter=auction',
    theme: 'auction' as const,
  },
  {
    id: 'buy_now',
    title: 'Купить сейчас',
    description: 'Покупайте недвижимость по фиксированной цене без ожидания',
    imageKey: 'cardBuyNow' as const,
    to: '/auction?filter=buy_now',
    theme: 'buy' as const,
  },
  {
    id: 'debts',
    title: 'Долги',
    description: 'Инвестируйте в объекты с задолженностью и получайте высокую доходность',
    imageKey: 'cardDebts' as const,
    to: '/debts',
    theme: 'debts' as const,
  },
  {
    id: 'shares',
    title: 'Доли',
    description: 'Покупайте доли в премиальных объектах и инвестируйте с умом',
    imageKey: 'cardShares' as const,
    to: CO_INVESTMENT_PATH,
    theme: 'shares' as const,
  },
] as const

export const MENU_ITEMS = [
  { id: 'auction', label: 'Аукцион', to: '/auction?filter=auction' },
  { id: 'buy', label: 'Купить', to: '/auction?filter=buy_now' },
  { id: 'shares', label: 'Доли', to: CO_INVESTMENT_PATH },
  { id: 'debts', label: 'Долги', to: '/debts' },
  { id: 'ai', label: 'AI', to: '/chat' },
] as const
