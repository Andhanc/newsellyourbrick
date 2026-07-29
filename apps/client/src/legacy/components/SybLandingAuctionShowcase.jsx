import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiChevronLeft, FiChevronRight, FiMapPin, FiStar } from 'react-icons/fi'
import { formatPropertyPrice } from '@/utils/currency'
import { getPropertyCardImage } from '@/utils/propertyImage'
import { buildSybShowcasePadCard } from '@/utils/sybLandingShowcaseImages'
import { resolveAuctionCurrentBidValue } from '@/services/auctionListCache'
import { scrollMainTo } from '@/utils/mainScroll'

export const SHOWCASE_CARD_COUNT = 8

const FALLBACK_CARD_IMAGE = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

const SHOWCASE_KIND_CONFIG = {
  auction: {
    titleKey: 'auction',
    subtitleKey: 'sybLandingAuctionSubtitle',
    allKey: 'sybLandingAuctionAll',
    emptyKey: 'sybLandingAuctionEmpty',
    allHref: '/auction',
    badgeKey: 'auction',
  },
  buy_now: {
    titleKey: 'buyNowSectionTitle',
    subtitleKey: 'buyNowSectionSubtitle',
    allKey: 'buyNowSectionCta',
    emptyKey: 'sybLandingBuyNowEmpty',
    allHref: '/auction?filter=buy_now',
    badgeKey: 'buyNowSectionTitle',
  },
  shares: {
    titleKey: 'fractionalSaleTitle',
    subtitleKey: 'fractionalSectionSubtitle',
    allKey: 'fractionalSectionCta',
    emptyKey: 'sybLandingSharesEmpty',
    allHref: '/shares',
    badgeKey: 'shares',
  },
  debts: {
    titleKey: 'debtsTitle',
    subtitleKey: 'debtsSectionSubtitle',
    allKey: 'debtsSectionCta',
    emptyKey: 'sybLandingDebtsEmpty',
    allHref: '/debts',
    badgeKey: 'debtsTitle',
  },
}

const PROPERTY_TYPE_LABEL_KEYS = {
  apartment: 'apartment',
  flat: 'propertyTypeFlat',
  villa: 'villa',
  house: 'propertyTypeHouse',
  townhouse: 'propertyTypeTownhouse',
  land: 'propertyTypeLand',
  commercial: 'propertyTypeCommercial',
}

function getPropertyTypeLabel(property, t) {
  const raw = String(property.property_type || property.type || '').toLowerCase()
  const labelKey = PROPERTY_TYPE_LABEL_KEYS[raw]
  if (labelKey) return t(labelKey)
  return t('propertyWord')
}

function getPriceBadge(property, kind, t) {
  const currency = property.currency || property.price_currency || 'EUR'

  if (kind === 'debts') {
    const debtRaw = property.debt_amount
    const debtVal = debtRaw != null && debtRaw !== '' ? Number(debtRaw) : null
    const amount =
      debtVal != null && Number.isFinite(debtVal)
        ? debtVal
        : resolveAuctionCurrentBidValue(property) || property.price || 0
    return t('sybLandingAuctionStartsAt', {
      price: formatPropertyPrice(amount, currency, { compact: true }),
    })
  }

  if (kind === 'buy_now') {
    const price = property.price ?? property.buy_now_price ?? 0
    return t('sybLandingAuctionStartsAt', {
      price: formatPropertyPrice(price, currency, { compact: true }),
    })
  }

  if (kind === 'shares') {
    const perShare = property.share_price ?? property.price_per_share ?? property.price ?? 0
    return t('sybLandingAuctionStartsAt', {
      price: formatPropertyPrice(perShare, currency, { compact: true }),
    })
  }

  const priceValue =
    resolveAuctionCurrentBidValue(property) ||
    property.price ||
    property.auction_starting_price ||
    0
  return t('sybLandingAuctionStartsAt', {
    price: formatPropertyPrice(priceValue, currency, { compact: true }),
  })
}

function SybAuctionCardSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="syb-auction-card syb-auction-card--skeleton" aria-hidden>
          <div className="syb-auction-card__media syb-auction-card__shimmer" />
        </div>
      ))}
    </>
  )
}

function SybAuctionCardItem({ property, kind, config, t, onOpen, onSectionOpen }) {
  const initialSrc = getPropertyCardImage(property, FALLBACK_CARD_IMAGE)
  const [src, setSrc] = useState(initialSrc)
  const isPadCard = Boolean(property._isPadCard)

  useEffect(() => {
    setSrc(initialSrc)
  }, [initialSrc])

  const title = property.title || property.name || t('breadcrumbFallback')
  const location = property.location || property.city || property.country || '—'
  const typeLabel = getPropertyTypeLabel(property, t)

  const handleImageError = () => {
    if (src !== FALLBACK_CARD_IMAGE) {
      setSrc(FALLBACK_CARD_IMAGE)
    }
  }

  const handleClick = () => {
    if (isPadCard) {
      onSectionOpen()
      return
    }
    onOpen(property)
  }

  return (
    <button type="button" className="syb-auction-card" onClick={handleClick}>
      <img
        className="syb-auction-card__media"
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={handleImageError}
      />
      {!isPadCard ? (
        <span className="syb-auction-card__price">{getPriceBadge(property, kind, t)}</span>
      ) : null}
      <div className="syb-auction-card__overlay">
        <h3 className="syb-auction-card__name">{title}</h3>
        <p className="syb-auction-card__meta">
          <span>{typeLabel}</span>
          <span className="syb-auction-card__meta-sep" aria-hidden>
            |
          </span>
          <span className="syb-auction-card__rating">
            <FiStar size={14} aria-hidden />
            <span>{t(config.badgeKey)}</span>
          </span>
        </p>
        <p className="syb-auction-card__location">
          <FiMapPin size={14} aria-hidden />
          <span>{location}</span>
        </p>
      </div>
    </button>
  )
}

export default function SybLandingAuctionShowcase({
  kind = 'auction',
  tone = 'white',
  properties = [],
  loading = false,
  onOpen,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const trackRef = useRef(null)
  const [activePage, setActivePage] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const config = SHOWCASE_KIND_CONFIG[kind] || SHOWCASE_KIND_CONFIG.auction
  const titleId = `syb-auction-title-${kind}`

  const displayCards = useMemo(() => {
    if (loading) return []

    const cards = properties.slice(0, SHOWCASE_CARD_COUNT).map((property) => ({ ...property }))
    while (cards.length < SHOWCASE_CARD_COUNT) {
      cards.push(buildSybShowcasePadCard(kind, cards.length, t, config))
    }
    return cards
  }, [config, kind, loading, properties, t])

  const openSection = useCallback(() => {
    scrollMainTo(0, 0, 'instant')
    navigate(config.allHref)
  }, [config.allHref, navigate])

  const updatePagination = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const card = track.querySelector('.syb-auction-card')
    if (!card) {
      setPageCount(1)
      setActivePage(0)
      return
    }

    const gap = 16
    const cardWidth = card.getBoundingClientRect().width + gap
    const visible = Math.max(1, Math.floor((track.clientWidth + gap) / cardWidth))
    const total = loading ? SHOWCASE_CARD_COUNT : displayCards.length
    const pages = Math.max(1, Math.ceil(total / visible))
    setPageCount(pages)

    const maxScroll = track.scrollWidth - track.clientWidth
    if (maxScroll <= 0 || pages <= 1) {
      setActivePage(0)
      return
    }

    const ratio = track.scrollLeft / maxScroll
    setActivePage(Math.min(pages - 1, Math.round(ratio * (pages - 1))))
  }, [displayCards.length, loading])

  useEffect(() => {
    updatePagination()
    const track = trackRef.current
    if (!track) return undefined

    const onScroll = () => updatePagination()
    track.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updatePagination())
      : null
    resizeObserver?.observe(track)

    window.addEventListener('resize', updatePagination)

    return () => {
      track.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updatePagination)
    }
  }, [updatePagination])

  const scrollTrack = useCallback((direction) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector('.syb-auction-card')
    const gap = 16
    const delta = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8
    track.scrollBy({ left: direction * delta, behavior: 'smooth' })
  }, [])

  const goToPage = useCallback(
    (pageIndex) => {
      const track = trackRef.current
      if (!track || pageCount <= 1) return
      const maxScroll = track.scrollWidth - track.clientWidth
      const target = (pageIndex / (pageCount - 1)) * maxScroll
      track.scrollTo({ left: target, behavior: 'smooth' })
    },
    [pageCount],
  )

  return (
    <section
      className={`syb-auction syb-auction--${kind} syb-auction--tone-${tone}`}
      aria-labelledby={titleId}
    >
      <div className="syb-auction__inner">
        <div className="syb-auction__intro">
          <h2 id={titleId} className="syb-auction__title">
            {t(config.titleKey)}
          </h2>
          <p className="syb-auction__subtitle">{t(config.subtitleKey)}</p>
        </div>

        <div className="syb-auction__track-wrap">
          <div className="syb-auction__track" ref={trackRef}>
            {loading ? (
              <SybAuctionCardSkeleton count={SHOWCASE_CARD_COUNT} />
            ) : (
              displayCards.map((property) => (
                <SybAuctionCardItem
                  key={property.id ?? property.property_id}
                  property={property}
                  kind={kind}
                  config={config}
                  t={t}
                  onOpen={onOpen}
                  onSectionOpen={openSection}
                />
              ))
            )}
          </div>
        </div>

        <div className="syb-auction__footer">
              <div className="syb-auction__nav" role="group" aria-label={t('showcaseCarouselNav')}>
                <button
                  type="button"
                  className="syb-auction__nav-btn"
                  onClick={() => scrollTrack(-1)}
                  aria-label={t('showcaseCarouselPrev')}
                  disabled={loading || displayCards.length === 0}
                >
                  <FiChevronLeft size={18} aria-hidden />
                </button>
                <button
                  type="button"
                  className="syb-auction__nav-btn"
                  onClick={() => scrollTrack(1)}
                  aria-label={t('showcaseCarouselNext')}
                  disabled={loading || displayCards.length === 0}
                >
                  <FiChevronRight size={18} aria-hidden />
                </button>
              </div>

              {!loading && displayCards.length > 0 && pageCount > 1 ? (
                <div className="syb-auction__dots" role="tablist" aria-label={t('showcaseCarouselNav')}>
                  {Array.from({ length: pageCount }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      role="tab"
                      className={`syb-auction__dot${index === activePage ? ' syb-auction__dot--active' : ''}`}
                      aria-selected={index === activePage}
                      aria-label={`${index + 1} / ${pageCount}`}
                      onClick={() => goToPage(index)}
                    />
                  ))}
                </div>
              ) : null}

          <Link
            to={config.allHref}
            className="syb-auction__all"
            onClick={() => scrollMainTo(0, 0, 'instant')}
          >
            {t(config.allKey)}
          </Link>
        </div>
      </div>
    </section>
  )
}
