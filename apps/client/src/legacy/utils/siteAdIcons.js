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
  { id: 'megaphone', labelKey: 'siteAdIcon_megaphone' },
  { id: 'gift', labelKey: 'siteAdIcon_gift' },
  { id: 'percent', labelKey: 'siteAdIcon_percent' },
  { id: 'star', labelKey: 'siteAdIcon_star' },
  { id: 'home', labelKey: 'siteAdIcon_home' },
  { id: 'trending', labelKey: 'siteAdIcon_trending' },
  { id: 'zap', labelKey: 'siteAdIcon_zap' },
  { id: 'heart', labelKey: 'siteAdIcon_heart' },
  { id: 'tag', labelKey: 'siteAdIcon_tag' },
  { id: 'building', labelKey: 'siteAdIcon_building' },
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

export function getSiteAdIconLabel(icon, t) {
  if (!icon) return ''
  if (icon.labelKey && typeof t === 'function') return t(icon.labelKey)
  return icon.label || icon.id || ''
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
