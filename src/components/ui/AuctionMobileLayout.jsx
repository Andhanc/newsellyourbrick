import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion'
import { List, LayoutGrid, MapPin, ShoppingBag, Car } from 'lucide-react'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { cn } from '@/lib/utils'
import PropertyTimer from '../PropertyTimer'
import CircularTimer from '../CircularTimer'
import { showNotification } from '@/utils/toastHelper'
import { hasBuyNowOption } from '@/utils/hasBuyNowOption'
import '../PropertyList.css'
import './AuctionMobileLayout.css'

const STORAGE_KEY = 'auction-mobile-view-mode'

const snappySpring = {
  type: 'spring',
  stiffness: 350,
  damping: 30,
  mass: 1,
}

export default function AuctionMobileLayout({
  properties,
  formatPrice,
  isFavorite,
  onFavoriteToggle,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [view, setView] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === 'list' || v === 'card') return v
    } catch (_) {}
    return 'list'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, view)
    } catch (_) {}
  }, [view])

  return (
    <div className="auction-mobile-layout w-full max-w-xl mx-auto px-3 pb-2 sm:px-4">
      <div className="auction-mobile-tabs">
        <ViewTab
          active={view === 'list'}
          onClick={() => setView('list')}
          icon={List}
          label={t('auctionViewList')}
        />
        <ViewTab
          active={view === 'card'}
          onClick={() => setView('card')}
          icon={LayoutGrid}
          label={t('auctionViewCard')}
        />
      </div>

      <div className="relative min-h-[120px] flex flex-col">
        <LayoutGroup>
          <motion.div
            layout
            transition={snappySpring}
            className={cn(
              'w-full',
              view === 'list' && 'auction-mobile-stack',
              view === 'card' && 'auction-mobile-stack auction-mobile-stack--grid',
            )}
          >
            {properties.map((property) => (
              <AuctionMobileItem
                key={property.id}
                property={property}
                view={view}
                formatPrice={formatPrice}
                t={t}
                navigate={navigate}
                isFavorite={isFavorite}
                onFavoriteToggle={onFavoriteToggle}
              />
            ))}
          </motion.div>
        </LayoutGroup>
      </div>
    </div>
  )
}

function ViewTab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('auction-mobile-tab', active && 'auction-mobile-tab--active')}
    >
      {active && (
        <motion.div
          layoutId="auction-mobile-active-tab"
          className="auction-mobile-tab-pill"
          transition={snappySpring}
        />
      )}
      <span>
        <Icon size={16} strokeWidth={2.2} />
        {label}
      </span>
    </button>
  )
}

/** Летающие сердечки при лайке (мобильный аукцион) */
function AuctionLikeHeartsBurst({ origin, burstKey, onDone }) {
  const reduceMotion = useReducedMotion()
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const hearts = useMemo(() => {
    if (reduceMotion) return []
    return Array.from({ length: 11 }, (_, i) => {
      const seed = burstKey + i * 9973
      const rnd = (n) => {
        const x = Math.sin(seed * 0.001 + n * 12.9898) * 43758.5453
        return x - Math.floor(x)
      }
      const angle = (rnd(1) - 0.5) * 1.15
      const dist = 140 + rnd(2) * 200
      const dx = Math.sin(angle) * dist + (rnd(3) - 0.5) * 28
      const dy = -Math.cos(Math.abs(angle) * 0.85 + 0.35) * dist - rnd(4) * 55
      const rot = (rnd(5) - 0.5) * 55
      const delay = i * 0.035
      const size = 18 + rnd(6) * 14
      return { id: i, dx, dy, rot, delay, size, midScale: 0.95 + rnd(7) * 0.35 }
    })
  }, [burstKey, reduceMotion])

  useEffect(() => {
    if (reduceMotion) {
      onDoneRef.current?.()
      return
    }
    const t = window.setTimeout(() => onDoneRef.current?.(), 1850)
    return () => window.clearTimeout(t)
  }, [burstKey, reduceMotion])

  if (reduceMotion || typeof document === 'undefined') return null

  return createPortal(
    <div className="auction-like-hearts-layer" aria-hidden>
      {hearts.map((h) => (
        <motion.svg
          key={`${burstKey}-${h.id}`}
          className="auction-like-heart-fly"
          width={h.size}
          height={h.size}
          viewBox="0 0 24 24"
          style={{
            position: 'fixed',
            left: origin.x,
            top: origin.y,
            marginLeft: -h.size / 2,
            marginTop: -h.size / 2,
          }}
          initial={{ opacity: 0, scale: 0.35, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.35, 1.12, h.midScale, 0.75],
            x: [0, h.dx * 0.22, h.dx * 0.72, h.dx],
            y: [0, h.dy * 0.35, h.dy * 0.78, h.dy],
            rotate: [0, h.rot * 0.4, h.rot * 0.85, h.rot],
          }}
          transition={{
            duration: 1.35,
            delay: h.delay,
            times: [0, 0.12, 0.55, 1],
            ease: [0.22, 0.61, 0.36, 1],
          }}
        >
          <defs>
            <linearGradient id={`ahg-${burstKey}-${h.id}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="55%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#ahg-${burstKey}-${h.id})`}
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </motion.svg>
      ))}
    </div>,
    document.body,
  )
}

/** Иконка на фото + подсказка в портале (не обрезается узкой карточкой в сетке) */

function AuctionPhotoHint({ type, tooltipKey, onGo }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const bubbleRef = useRef(null)
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 12, width: 300 })

  const syncBubblePosition = () => {
    const el = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const margin = 12
    const maxW = Math.min(320, window.innerWidth - margin * 2)
    let left = rect.left + rect.width / 2 - maxW / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - maxW))
    setBubblePos({ top: rect.bottom + 8, left, width: maxW })
  }

  useLayoutEffect(() => {
    if (!open) return
    syncBubblePosition()
    const onResize = () => syncBubblePosition()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const node = e.target
      if (wrapRef.current?.contains(node)) return
      if (bubbleRef.current?.contains(node)) return
      setOpen(false)
    }
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('touchstart', handler, { passive: true })
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const Icon = type === 'buy' ? ShoppingBag : Car

  const bubbleEl =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={bubbleRef}
        className="auction-photo-hint__bubble auction-photo-hint__bubble--portal"
        role="tooltip"
        style={{
          position: 'fixed',
          top: bubblePos.top,
          left: bubblePos.left,
          width: bubblePos.width,
          zIndex: 10050,
        }}
      >
        <p className="auction-photo-hint__text">{t(tooltipKey)}</p>
        <button
          type="button"
          className="auction-photo-hint__link"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
            onGo()
          }}
        >
          {t('goTo')}
        </button>
      </div>,
      document.body,
    )

  return (
    <>
      <div className="auction-photo-hint" ref={wrapRef}>
        <button
          ref={btnRef}
          type="button"
          className={cn('auction-photo-hint__btn', type === 'buy' && 'auction-photo-hint__btn--buy')}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          aria-expanded={open}
          aria-label={type === 'buy' ? 'Buy now' : 'Test drive'}
        >
          <span className="auction-photo-hint__btn-glass" aria-hidden />
          <Icon className="auction-photo-hint__icon" size={18} strokeWidth={2.25} />
        </button>
      </div>
      {bubbleEl}
    </>
  )
}

function AuctionMobileItem({
  property,
  view,
  formatPrice,
  t,
  navigate,
  isFavorite,
  onFavoriteToggle,
}) {
  const reduceMotion = useReducedMotion()
  const favoriteBtnRef = useRef(null)
  const [likeBurst, setLikeBurst] = useState(null)
  const propertyTitle = property.title || property.name || ''
  const propertyImages = property.images || (property.image ? [property.image] : [])
  const propertyImage =
    propertyImages[0] ||
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'

  const hasTestTimer =
    property.test_timer_end_date != null && property.test_timer_end_date !== ''
  const hasTimer =
    (property.isAuction === true &&
      property.endTime != null &&
      property.endTime !== '') ||
    hasTestTimer

  const isDebtProperty =
    property.sale_type === 'debt' ||
    property.is_debt === 1 ||
    property.is_debt === true ||
    property.has_debt === 1 ||
    property.has_debt === true
  const hasTestDrive =
    !isDebtProperty &&
    (property.test_drive === 1 ||
      property.testDrive === true ||
      property.test_drive === true)
  const isReserved = property.is_reserved === true || property.is_reserved === 1
  const showBuyNow = hasBuyNowOption(property)

  const checkTimerExpired = () => {
    if (hasTestTimer && property.test_timer_end_date) {
      return new Date(property.test_timer_end_date).getTime() <= Date.now()
    }
    if (property.endTime) {
      return new Date(property.endTime).getTime() <= Date.now()
    }
    return false
  }
  const isTimerExpired = checkTimerExpired()

  const greenOnImage =
    hasTimer && !isReserved && !hasTestTimer && property.endTime
  const redOnImage =
    hasTimer && !isReserved && hasTestTimer && property.test_timer_end_date

  const displayPriceValue = hasTimer
    ? property.currentBid || property.price || 0
    : property.price || 0

  const goDetail = () => {
    navigate(`/property/${property.id}`, { state: { property } })
  }

  const openProperty = (e) => {
    if (e?.target?.closest?.('button') || e?.target?.closest?.('a')) return
    goDetail()
  }

  const isFav = typeof isFavorite === 'function' ? isFavorite(property) : false

  const metaRow =
    hasTimer && (property.area || property.sqft || property.rooms || property.bathrooms) ? (
      <div className="auction-mobile-meta">
        {(property.area || property.sqft) && (
          <span>
            <BiArea size={15} />
            {property.area || property.sqft} {t('squareMeters')}
          </span>
        )}
        {(property.rooms || property.beds || property.bedrooms) && (
          <span>
            <MdBed size={15} />
            {property.rooms || property.beds || property.bedrooms}
          </span>
        )}
        {property.bathrooms ? (
          <span>
            <MdOutlineBathtub size={15} />
            {property.bathrooms}
          </span>
        ) : null}
      </div>
    ) : null

  /** Две кнопки в один ряд и в списке, и в сетке карточек */
  const dualActionsRow = showBuyNow

  const handleFavoriteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const added = onFavoriteToggle(property, e)
    if (!added || reduceMotion) return
    const el = favoriteBtnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setLikeBurst({
      key: Date.now(),
      origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    })
  }

  return (
    <div className="auction-mobile-item-wrap">
      {likeBurst ? (
        <AuctionLikeHeartsBurst
          origin={likeBurst.origin}
          burstKey={likeBurst.key}
          onDone={() => setLikeBurst(null)}
        />
      ) : null}
      <motion.div
        layout
        transition={snappySpring}
        className={cn(
          'auction-mobile-item',
          view === 'list' && 'auction-mobile-item--list auction-mobile--list',
          view === 'card' && 'auction-mobile-item--card auction-mobile--card',
        )}
        onClick={openProperty}
        style={{ cursor: 'pointer' }}
        whileTap={reduceMotion ? undefined : { scale: 0.992 }}
      >
        <div className="auction-mobile-item__media">
          <div className="auction-mobile-image-wrap">
            <img src={propertyImage} alt={propertyTitle} className="rounded-[inherit]" />
            {isReserved && (
              <div className="auction-mobile-reserved">
                <span className="text-lg">🔒</span>
                <span>{t('reserved')}</span>
              </div>
            )}
            {!isReserved && (showBuyNow || hasTestDrive) && (
              <div
                className="auction-mobile-photo-icons"
                onClick={(e) => e.stopPropagation()}
              >
                {showBuyNow && (
                  <AuctionPhotoHint type="buy" tooltipKey="buyNowTooltip" onGo={goDetail} />
                )}
                {hasTestDrive && (
                  <AuctionPhotoHint type="test" tooltipKey="testDriveTooltip" onGo={goDetail} />
                )}
              </div>
            )}
            {redOnImage && (
              <div className="auction-mobile-circular-timer">
                <CircularTimer
                  endTime={property.test_timer_end_date}
                  size={view === 'list' ? 46 : 54}
                  strokeWidth={view === 'list' ? 3 : 4}
                />
              </div>
            )}
            {greenOnImage && (
              <div className="property-timer-overlay auction-mobile-timer-slot">
                <PropertyTimer
                  endTime={property.endTime}
                  compact
                  className="property-timer--auction-mobile"
                />
              </div>
            )}
          </div>
        </div>

        <div className="auction-mobile-item__body">
          <div className="auction-mobile-head">
            <h3 className="auction-mobile-card-title">{propertyTitle}</h3>
            <button
              ref={favoriteBtnRef}
              type="button"
              className={cn(
                'auction-mobile-favorite-btn',
                isFav && 'auction-mobile-favorite-btn--active',
              )}
              onClick={handleFavoriteClick}
              aria-label="favorite"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill={isFav ? 'currentColor' : 'none'}
                />
              </svg>
            </button>
          </div>

          {property.location ? (
            <p className="auction-mobile-loc">
              <MapPin size={14} strokeWidth={2} />
              <span>{property.location}</span>
            </p>
          ) : null}

          <div className="auction-mobile-price-row">
            <span className="auction-mobile-price-row__label">
              {hasTimer ? t('currentBid') : t('auctionAskingPrice')}
            </span>
            <span className="auction-mobile-price-row__value">{formatPrice(displayPriceValue)}</span>
          </div>

          {metaRow}

          <div
            className={cn(
              'property-actions auction-mobile-actions',
              dualActionsRow && 'auction-mobile-actions--list-row',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn-primary btn-liquid-glass"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goDetail()
              }}
              disabled={isReserved}
              style={{
                opacity: isReserved ? 0.5 : 1,
                cursor: isReserved ? 'not-allowed' : 'pointer',
              }}
            >
              {isReserved ? t('objectReserved') : t('placeBid')}
            </button>
            {showBuyNow && (
              <button
                type="button"
                className="btn btn-buy-now btn-liquid-glass-buy"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (isReserved) {
                    showNotification(t('objectReservedNotification'))
                    return
                  }
                  goDetail()
                }}
                disabled={isReserved || isTimerExpired}
                style={{
                  opacity: isReserved ? 0.5 : 1,
                  cursor: isReserved ? 'not-allowed' : 'pointer',
                }}
              >
                {isReserved ? t('objectReserved') : t('buyNowSectionTitle')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
