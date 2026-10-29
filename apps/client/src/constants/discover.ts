export const CO_INVESTMENT_PATH = '/co-investment'
export const TEST_DRIVE_PATH = '/test-drive'

export const SALE_CARDS = [
  {
    id: 'auction',
    titleKey: 'discoverSale_auctionTitle',
    descriptionKey: 'discoverSale_auctionDesc',
    /** English fallback when i18n is unavailable (native shell). */
    title: 'Auction',
    description: 'Join the bidding and buy properties at the best price',
    imageKey: 'cardAuction' as const,
    to: '/auction?filter=auction',
    theme: 'auction' as const,
  },
  {
    id: 'buy_now',
    titleKey: 'discoverSale_buyNowTitle',
    descriptionKey: 'discoverSale_buyNowDesc',
    title: 'Buy now',
    description: 'Buy property at a fixed price without waiting',
    imageKey: 'cardBuyNow' as const,
    to: '/auction?filter=buy_now',
    theme: 'buy' as const,
  },
  {
    id: 'debts',
    titleKey: 'discoverSale_debtsTitle',
    descriptionKey: 'discoverSale_debtsDesc',
    title: 'Debts',
    description: 'Invest in distressed properties for higher potential yield',
    imageKey: 'cardDebts' as const,
    to: '/debts',
    theme: 'debts' as const,
  },
  {
    id: 'shares',
    titleKey: 'discoverSale_sharesTitle',
    descriptionKey: 'discoverSale_sharesDesc',
    title: 'Shares',
    description: 'Buy shares in premium properties and invest wisely',
    imageKey: 'cardShares' as const,
    to: CO_INVESTMENT_PATH,
    theme: 'shares' as const,
  },
] as const

export const MENU_ITEMS = [
  { id: 'auction', labelKey: 'discoverMenu_auction', label: 'Auction', to: '/auction?filter=auction' },
  { id: 'buy', labelKey: 'discoverMenu_buy', label: 'Buy', to: '/auction?filter=buy_now' },
  { id: 'shares', labelKey: 'discoverMenu_shares', label: 'Shares', to: CO_INVESTMENT_PATH },
  { id: 'debts', labelKey: 'discoverMenu_debts', label: 'Debts', to: '/debts' },
  { id: 'ai', labelKey: null, label: 'AI', to: '/chat' },
] as const
