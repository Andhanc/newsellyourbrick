import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import AuctionPropertyCard from './AuctionPropertyCard'
import DebtsPropertyCard, { DebtsPropertyCardSkeleton } from './DebtsPropertyCard'
import SharesPropertyCard, { SharesPropertyCardSkeleton } from './SharesPropertyCard'
import { mapShareFromApiResponse } from '../utils/sharesListing'
import { formatPropertyPrice } from '../utils/currency'
import { buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { getCoInvestmentDetailPath } from '../utils/sectionRoutes'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import '../components/PropertyList.css'
import '../components/AuctionPropertyCard.css'
import '../components/DebtsPropertyCard.css'
import '../components/SharesPropertyCard.css'

const SHARE_FALLBACK = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

function ShowcaseSlot({ children }) {
  return <div className="home-showcase__slot">{children}</div>
}

function AuctionCardSkeleton() {
  return (
    <div className="auction-card auction-card--skeleton" aria-hidden>
      <div className="auction-card__media auction-card-skeleton__media" />
      <div className="auction-card__body auction-card-skeleton__body">
        <div className="auction-card-skeleton__line auction-card-skeleton__line--short" />
        <div className="auction-card-skeleton__line auction-card-skeleton__line--title" />
        <div className="auction-card-skeleton__line auction-card-skeleton__line--specs" />
        <div className="auction-card-skeleton__price-panel" />
        <div className="auction-card-skeleton__btn" />
      </div>
    </div>
  )
}

export default function InvestorPropertyShowcaseSection({
  sectionId,
  title,
  subtitle,
  ctaLabel,
  onCtaClick,
  loading = false,
  items = [],
  variant = 'auction',
  navigate,
  isFavorite,
  toggleFavorite,
  ensureCanOpenProperty,
  showPropertyAuthRequiredToast,
}) {
  const scrollerRef = useRef(null)
  const [activePage, setActivePage] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  const favoriteCategory = (property) =>
    hasDbBackedProperty(property) ? undefined : 'property'

  const isPropertyLiked = (property) => isFavorite(property, favoriteCategory(property))

  const handleFavoriteToggle = (property, event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    toggleFavorite(property, favoriteCategory(property))
  }

  const openListing = (property, { auctionTab } = {}) => {
    if (!ensureCanOpenProperty()) {
      showPropertyAuthRequiredToast()
      return
    }
    const { pathname, state } = buildPropertyDetailNavigation(property, {
      auctionTab: auctionTab || undefined,
    })
    navigate(pathname, { state })
  }

  const formatPrice = (price, currency = 'USD') =>
    formatPropertyPrice(price ?? 0, currency, { compact: true })

  const skeletonCount = 4

  const renderSkeletons = () => {
    if (variant === 'debts') {
      return Array.from({ length: skeletonCount }, (_, index) => (
        <ShowcaseSlot key={`sk-debts-${index}`}>
          <DebtsPropertyCardSkeleton />
        </ShowcaseSlot>
      ))
    }
    if (variant === 'shares') {
      return Array.from({ length: skeletonCount }, (_, index) => (
        <ShowcaseSlot key={`sk-shares-${index}`}>
          <SharesPropertyCardSkeleton />
        </ShowcaseSlot>
      ))
    }
    return Array.from({ length: skeletonCount }, (_, index) => (
      <ShowcaseSlot key={`sk-auction-${index}`}>
        <AuctionCardSkeleton />
      </ShowcaseSlot>
    ))
  }

  const renderCards = () => {
    if (variant === 'debts') {
      return items.map((property) => (
        <ShowcaseSlot key={property.id}>
          <DebtsPropertyCard
            property={property}
            isFavorite={isPropertyLiked(property)}
            onFavoriteToggle={handleFavoriteToggle}
            onOpen={openListing}
          />
        </ShowcaseSlot>
      ))
    }

    if (variant === 'shares') {
      return items.map((property) => {
        const share = mapShareFromApiResponse(property, SHARE_FALLBACK)
        if (!share) return null
        return (
          <ShowcaseSlot key={share.shareId || property.id}>
            <SharesPropertyCard
              share={share}
              isFavorite={isPropertyLiked(property)}
              onFavoriteToggle={handleFavoriteToggle}
              onInvest={(obj) => {
                if (!ensureCanOpenProperty()) {
                  showPropertyAuthRequiredToast()
                  return
                }
                navigate(getCoInvestmentDetailPath(obj), { state: { shareObject: obj } })
              }}
              imageFallback={SHARE_FALLBACK}
            />
          </ShowcaseSlot>
        )
      })
    }

    return items.map((property) => (
      <ShowcaseSlot key={property.id}>
        <AuctionPropertyCard
          property={property}
          isFavorite={isPropertyLiked(property)}
          onFavoriteToggle={handleFavoriteToggle}
          onOpen={openListing}
          formatPrice={formatPrice}
          hideBuyNowAction={variant === 'auction'}
        />
      </ShowcaseSlot>
    ))
  }

  const updatePagination = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const slot = scroller.querySelector('.home-showcase__slot')
    if (!slot) {
      setPageCount(1)
      setActivePage(0)
      return
    }

    const gap = Number.parseFloat(getComputedStyle(scroller).columnGap) || 0
    const slotWidth = slot.getBoundingClientRect().width + gap
    const visible = Math.max(1, Math.floor((scroller.clientWidth + gap) / slotWidth))
    const total = loading ? skeletonCount : items.length
    const pages = Math.max(1, Math.ceil(total / visible))
    setPageCount(pages)

    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    if (maxScroll <= 0 || pages <= 1) {
      setActivePage(0)
      return
    }

    const ratio = scroller.scrollLeft / maxScroll
    setActivePage(Math.min(pages - 1, Math.round(ratio * (pages - 1))))
  }, [items.length, loading])

  useEffect(() => {
    updatePagination()
    const scroller = scrollerRef.current
    if (!scroller) return undefined

    const onScroll = () => updatePagination()
    scroller.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updatePagination()) : null
    resizeObserver?.observe(scroller)
    window.addEventListener('resize', updatePagination)

    return () => {
      scroller.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updatePagination)
    }
  }, [updatePagination])

  const scrollByDirection = useCallback((direction) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const slot = scroller.querySelector('.home-showcase__slot')
    const gap = Number.parseFloat(getComputedStyle(scroller).columnGap) || 0
    const delta = slot ? slot.getBoundingClientRect().width + gap : Math.max(scroller.clientWidth * 0.72, 300)
    scroller.scrollBy({ left: direction * delta, behavior: 'smooth' })
  }, [])

  const goToPage = useCallback(
    (pageIndex) => {
      const scroller = scrollerRef.current
      if (!scroller || pageCount <= 1) return
      const maxScroll = scroller.scrollWidth - scroller.clientWidth
      const target = (pageIndex / (pageCount - 1)) * maxScroll
      scroller.scrollTo({ left: target, behavior: 'smooth' })
    },
    [pageCount],
  )

  const hasContent = loading || items.length > 0
  const showDots = !loading && items.length > 0 && pageCount > 1

  const sectionClassName = useMemo(() => {
    if (variant === 'debts') return 'invest-showcase invest-showcase--debts'
    if (variant === 'shares') return 'invest-showcase invest-showcase--shares'
    if (variant === 'buyNow') return 'invest-showcase invest-showcase--buy-now'
    return 'invest-showcase invest-showcase--auction'
  }, [variant])

  if (!hasContent) return null

  return (
    <section id={sectionId} className={sectionClassName}>
      <div className="invest-shell">
        <header className="invest-showcase__header">
          <div className="invest-showcase__intro">
            <h2 className="invest-showcase__title">{title}</h2>
            <p className="invest-showcase__subtitle">{subtitle}</p>
          </div>
          <button type="button" className="invest-showcase__cta-pill" onClick={onCtaClick}>
            <span className="invest-showcase__cta-pill-text">Перейти</span>
            <span className="invest-showcase__cta-pill-icon" aria-hidden>
              <FiArrowRight size={18} />
            </span>
          </button>
        </header>

        <div className="invest-showcase__carousel">
          <div
            ref={scrollerRef}
            className="invest-showcase__scroller home-showcase__scroller"
            aria-busy={loading}
          >
            {loading ? renderSkeletons() : renderCards()}
          </div>

          <div className="invest-showcase__footer">
            <div className="invest-showcase__nav" role="group" aria-label="Навигация по карточкам">
              <button
                type="button"
                className="invest-showcase__nav-btn"
                aria-label="Предыдущие объекты"
                onClick={() => scrollByDirection(-1)}
                disabled={loading}
              >
                <FiChevronLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="invest-showcase__nav-btn"
                aria-label="Следующие объекты"
                onClick={() => scrollByDirection(1)}
                disabled={loading}
              >
                <FiChevronRight size={18} aria-hidden />
              </button>
            </div>

            {showDots ? (
              <div className="invest-showcase__dots" role="tablist" aria-label="Страницы карусели">
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    className={`invest-showcase__dot${index === activePage ? ' is-active' : ''}`}
                    aria-selected={index === activePage}
                    aria-label={`${index + 1} / ${pageCount}`}
                    onClick={() => goToPage(index)}
                  />
                ))}
              </div>
            ) : (
              <div className="invest-showcase__dots invest-showcase__dots--placeholder" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
