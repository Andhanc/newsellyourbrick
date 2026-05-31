import { getSiteAdIconComponent } from '@/utils/siteAdIcons'

export default function SiteAdIcon({ iconId, size = 22, strokeWidth = 2, className }) {
  const Icon = getSiteAdIconComponent(iconId)
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />
}
