import {
  Megaphone,
  Gift,
  Percent,
  Star,
  Home,
  TrendingUp,
  Zap,
  Heart,
  Tag,
  Building2,
} from 'lucide-react'

export const SITE_AD_ICONS = [
  { id: 'megaphone', label: 'Мегафон' },
  { id: 'gift', label: 'Подарок' },
  { id: 'percent', label: 'Скидка' },
  { id: 'star', label: 'Звезда' },
  { id: 'home', label: 'Дом' },
  { id: 'trending', label: 'Рост' },
  { id: 'zap', label: 'Молния' },
  { id: 'heart', label: 'Сердце' },
  { id: 'tag', label: 'Тег' },
  { id: 'building', label: 'Здание' },
]

const ICON_MAP = {
  megaphone: Megaphone,
  gift: Gift,
  percent: Percent,
  star: Star,
  home: Home,
  trending: TrendingUp,
  zap: Zap,
  heart: Heart,
  tag: Tag,
  building: Building2,
}

export const SITE_AD_ICON_IDS = new Set(SITE_AD_ICONS.map((i) => i.id))

export const DEFAULT_SITE_AD_ICON = 'megaphone'

export function getSiteAdIconComponent(iconId) {
  return ICON_MAP[iconId] || Megaphone
}

export function isExternalAdUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim())
}

export function normalizeAdButtonUrl(raw) {
  const url = String(raw || '').trim()
  if (!url) return ''
  if (url.startsWith('/')) return url
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}
