import { useTranslation } from 'react-i18next'
import { List, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AUCTION_MOBILE_VIEW_STORAGE_KEY } from '../constants/auctionMobileViewStorage'
import './ui/AuctionMobileLayout.css'

/**
 * Скелетон списка мобильного аукциона: повторяет разметку list vs card (`auction-mobile-stack` / `--grid`),
 * чтобы при загрузке не показывать «режим список», когда в памяти выбраны карточки.
 */
export function AuctionMobileListingSkeleton({ viewMode = 'list' }) {
  const { t } = useTranslation()
  const isCard = viewMode === 'card'
  const itemCount = isCard ? 6 : 4

  return (
    <div className="auction-mobile-layout w-full max-w-none px-3 pb-2 sm:px-4" aria-busy="true">
      <div className="auction-mobile-tabs">
        <button
          type="button"
          className={cn('auction-mobile-tab', !isCard && 'auction-mobile-tab--active')}
          disabled
          aria-current={!isCard ? 'true' : undefined}
        >
          <span>
            <List size={16} strokeWidth={2.2} />
            {t('auctionViewList')}
          </span>
        </button>
        <button
          type="button"
          className={cn('auction-mobile-tab', isCard && 'auction-mobile-tab--active')}
          disabled
          aria-current={isCard ? 'true' : undefined}
        >
          <span>
            <LayoutGrid size={16} strokeWidth={2.2} />
            {t('auctionViewCard')}
          </span>
        </button>
      </div>

      <div
        className={cn(
          'auction-mobile-stack',
          isCard && 'auction-mobile-stack--grid',
        )}
      >
        {Array.from({ length: itemCount }, (_, i) => (
          <AuctionMobileSkeletonItem key={`am-sk-${i}`} variant={isCard ? 'card' : 'list'} />
        ))}
      </div>
    </div>
  )
}

export function readAuctionMobileViewMode() {
  if (typeof window === 'undefined') return 'list'
  try {
    const v = localStorage.getItem(AUCTION_MOBILE_VIEW_STORAGE_KEY)
    if (v === 'card' || v === 'list') return v
  } catch (_) {}
  return 'list'
}

function AuctionMobileSkeletonItem({ variant }) {
  const isCard = variant === 'card'
  return (
    <div className="auction-mobile-item-wrap">
      <div
        className={cn(
          'auction-mobile-item auction-mobile-item--skeleton',
          isCard ? 'auction-mobile-item--card auction-mobile--card' : 'auction-mobile-item--list auction-mobile--list',
        )}
      >
        <div className="auction-mobile-item__media">
          <div className="auction-mobile-image-wrap">
            <div className="auction-mobile-skeleton__media-fill" aria-hidden />
            <span className="auction-mobile-skeleton__fav" aria-hidden />
          </div>
        </div>
        <div className="auction-mobile-item__body">
          <div className="auction-mobile-head">
            <div className="auction-mobile-skeleton__title-line" />
          </div>
          <div className="auction-mobile-skeleton__loc" />
          {!isCard ? <div className="auction-mobile-skeleton__timer-slot" aria-hidden /> : null}
          <div className="auction-mobile-skeleton__price-block">
            <div className="auction-mobile-skeleton__price-label" />
            <div className="auction-mobile-skeleton__price-value" />
          </div>
          <div className="auction-mobile-skeleton__meta-row">
            <span className="auction-mobile-skeleton__pill" />
            <span className="auction-mobile-skeleton__pill" />
            <span className="auction-mobile-skeleton__pill auction-mobile-skeleton__pill--grow" />
          </div>
          <div className="property-actions auction-mobile-actions auction-mobile-skeleton__actions">
            <div className="auction-mobile-skeleton__btn" aria-hidden />
            <div className="auction-mobile-skeleton__btn auction-mobile-skeleton__btn--accent" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  )
}
