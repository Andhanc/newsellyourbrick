import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiArrowRight, FiChevronRight, FiClock, FiHeart, FiMapPin } from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { PiHandPointingDuotone } from 'react-icons/pi'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { getPropertyCardImage, applyPropertyImageFallback, PROPERTY_CARD_IMAGE_FALLBACK } from '../utils/propertyImage'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { formatPropertyPrice } from '../utils/currency'
import { resolveAuctionCurrentBidValue } from '../utils/auctionBidValue'
import { getEffectiveAuctionEndTime, isTimedAuctionProperty } from '../utils/auctionReminderBounds'
import { resolveBuyerListingState } from '../utils/resolveBuyerListingState'
import PropertyTimer from './PropertyTimer'
import './RelatedPropertyDeck.css'

export default function RelatedPropertyDeck({ items }) {
  const { t } = useTranslation()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const reduceMotion = useReducedMotion()
  const dragControls = useDragControls()
  const [position, setPosition] = useState({ index: 0, direction: 1 })
  const [, setTick] = useState(0)
  const dragging = useRef(false)
  const resetDrag = useRef(null)
  const stageRef = useRef(null)
  const hintShown = useRef(false)
  const hintTimeout = useRef(null)
  const [showSwipeHint, setShowSwipeHint] = useState(false)
  const index = position.index % Math.max(items.length, 1)
  const property = items[index]
  const datasetKey = items.map((item) => item.id).join('|')

  useEffect(() => {
    setPosition({ index: 0, direction: 1 })
  }, [datasetKey])

  // Refresh the auction phase and availability as its deadline passes.
  useEffect(() => {
    if (!items.some(isTimedAuctionProperty)) return undefined
    const timer = setInterval(() => setTick((tick) => tick + 1), 1000)
    return () => clearInterval(timer)
  }, [items])

  useEffect(() => () => clearTimeout(resetDrag.current), [])

  // Demonstrate the gesture once per visit, when the stack is actually in view.
  useEffect(() => {
    const stage = stageRef.current
    if (items.length < 2 || !stage || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.6) {
        clearTimeout(hintTimeout.current)
        setShowSwipeHint(false)
        return
      }
      if (hintShown.current) return
      hintShown.current = true
      setShowSwipeHint(true)
      hintTimeout.current = setTimeout(() => setShowSwipeHint(false), 4800)
    }, { threshold: [0, 0.6] })
    observer.observe(stage)
    return () => {
      observer.disconnect()
      clearTimeout(hintTimeout.current)
    }
  }, [items.length])

  const dismissSwipeHint = () => {
    hintShown.current = true
    clearTimeout(hintTimeout.current)
    setShowSwipeHint(false)
  }

  if (!property) return null

  const move = (direction) => {
    if (items.length < 2) return
    dismissSwipeHint()
    setPosition((current) => ({
      index: (current.index + direction + items.length) % items.length,
      direction,
    }))
  }
  const title = property.title || property.name || ''
  const href = getPropertyDetailPath(property)
  const timedAuction = isTimedAuctionProperty(property)
  const listingState = resolveBuyerListingState(property)
  const endTime = getEffectiveAuctionEndTime(property)
  const showTimer = timedAuction && !listingState.blocksBid && Number.isFinite(new Date(endTime).getTime()) && endTime
  const favoriteCategory = hasDbBackedProperty(property) ? undefined : 'property'
  const liked = isFavorite(property, favoriteCategory)
  const area = property.area ?? property.sqft ?? property.living_area
  const beds = property.rooms ?? property.beds ?? property.bedrooms
  const baths = property.bathrooms ?? property.baths
  const price = timedAuction ? resolveAuctionCurrentBidValue(property) : property.price

  return (
    <div className="related-deck" onPointerDownCapture={dismissSwipeHint} onKeyDownCapture={dismissSwipeHint} role="region" aria-roledescription={t('relatedDeckCarousel')} aria-label={t('seoSimilarPropertiesTitle')}>
      <div
        ref={stageRef}
        className={`related-deck__stage related-deck__stage--${items.length > 2 ? 'many' : items.length > 1 ? 'two' : 'single'}`}
        tabIndex={items.length > 1 ? 0 : undefined}
        aria-label={t('relatedDeckSwipeHint')}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            move(event.key === 'ArrowLeft' ? -1 : 1)
          }
        }}
        onPointerDown={(event) => {
          if (items.length < 2 || event.button !== 0 || event.target.closest('button')) return
          dragControls.start(event)
        }}
        onDragStartCapture={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (dragging.current) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
      >
        {[2, 1].filter((depth) => depth < items.length).map((depth) => {
          const preview = items[(index + depth) % items.length]
          return (
            <div key={depth} className={`related-deck__back related-deck__back--${depth === 2 ? 'far' : 'near'}`} aria-hidden="true">
              <img src={getPropertyCardImage(preview, PROPERTY_CARD_IMAGE_FALLBACK)} alt="" loading="lazy" draggable="false" onError={applyPropertyImageFallback} />
              <span className="related-deck__back-title">{preview.title || preview.name || ''}</span>
            </div>
          )
        })}
        <AnimatePresence>
          {showSwipeHint && (
            <motion.div className="related-deck__swipe-coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} aria-hidden="true">
              <div className="related-deck__swipe-gesture">
                <FiArrowLeft size={18} />
                <motion.span animate={reduceMotion ? { x: 0 } : { x: [-22, 22, -22], rotate: [-12, 12, -12] }} transition={{ duration: 2, repeat: 1, ease: 'easeInOut' }}>
                  <PiHandPointingDuotone size={54} />
                </motion.span>
                <FiArrowRight size={18} />
              </div>
              <span>{t('relatedDeckSwipeHint')}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false} custom={position.direction} mode="popLayout">
          <motion.article
            key={property.id}
            className="related-deck__card"
            custom={position.direction}
            variants={{
              enter: (direction) => ({ x: reduceMotion ? 0 : direction * 70, opacity: 0, rotate: reduceMotion ? 0 : direction * 3 }),
              center: { x: 0, opacity: 1, rotate: 0 },
              exit: (direction) => ({ x: reduceMotion ? 0 : direction * -160, opacity: 0, rotate: reduceMotion ? 0 : direction * -8 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0 : 0.24 }}
            drag={items.length > 1 ? 'x' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.65}
            dragMomentum={false}
            onDragStart={() => { clearTimeout(resetDrag.current); dragging.current = true }}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 55 || (Math.abs(info.offset.x) > 12 && Math.abs(info.velocity.x) > 450)) {
                move(info.offset.x < 0 ? 1 : -1)
              }
              resetDrag.current = setTimeout(() => { dragging.current = false }, 100)
            }}
          >
            <div className="related-deck__photo">
              <img src={getPropertyCardImage(property, PROPERTY_CARD_IMAGE_FALLBACK)} alt={title} loading="lazy" draggable="false" onError={applyPropertyImageFallback} />
              <span className="related-deck__badge">{t(listingState.labelKey)}</span>
              {listingState.state !== 'sold' && listingState.state !== 'auction-ended' && (
                <button type="button" className={`related-deck__favorite${liked ? ' is-active' : ''}`} aria-label={t('favorites')} aria-pressed={liked} onPointerDown={(event) => event.stopPropagation()} onClick={() => toggleFavorite(property, favoriteCategory ?? 'property')}>
                  <FiHeart size={20} aria-hidden="true" />
                </button>
              )}
              <a href={href} className="related-deck__photo-link" tabIndex={-1} aria-label={title} draggable="false" />
            </div>
            <div className="related-deck__body">
              {showTimer && (
                <div className="related-deck__countdown">
                  <FiClock size={20} aria-hidden="true" />
                  <div className="related-deck__countdown-content">
                    <span className="related-deck__countdown-label">{t('propertyDetail_auctionEndsIn')}</span>
                    <PropertyTimer endTime={endTime} compact auctionEndedLabel={t('propertyDetailAuctionCompleted')} />
                  </div>
                </div>
              )}
              <h3 className="related-deck__title"><a href={href} draggable="false">{title}</a></h3>
              {property.location && <p className="related-deck__location"><FiMapPin size={14} aria-hidden="true" /><span>{property.location}</span></p>}
              <div className="related-deck__specs">
                {area != null && <span><BiArea size={17} aria-hidden="true" />{area} {t('squareMeters')}</span>}
                {beds != null && <span><MdBed size={18} aria-hidden="true" />{beds}</span>}
                {baths != null && <span><MdOutlineBathtub size={17} aria-hidden="true" />{baths}</span>}
              </div>
              <div className="related-deck__footer">
                <div><span className="related-deck__price-label">{t(timedAuction ? 'currentBid' : 'buyNowShowcasePriceLabel')}</span><p className="related-deck__price">{formatPropertyPrice(price || 0, property.currency, { compact: true })}</p></div>
                <a href={href} className="related-deck__open btn-tiffany-shine" aria-label={`${t('purchasedGuide_viewProperty')}: ${title}`} draggable="false">
                  <span className="related-deck__open-icon" aria-hidden="true"><FiArrowRight size={22} /></span>
                  <span className="related-deck__open-label">{t('goTo')}</span>
                  <span className="related-deck__open-chevrons" aria-hidden="true">
                    <FiChevronRight size={22} />
                    <FiChevronRight size={22} />
                    <FiChevronRight size={22} />
                  </span>
                </a>
              </div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
      <div className="related-deck__navigation">
        <button type="button" onClick={() => move(-1)} disabled={items.length < 2} aria-label={t('relatedDeckPrevious')}><FiArrowLeft size={19} aria-hidden="true" /></button>
        <div className="related-deck__progress">
          {items.length > 1 && <span className="related-deck__hint">{t('relatedDeckSwipeHint')}</span>}
          <span className="related-deck__counter" role="status" aria-live="polite" aria-atomic="true">{t('relatedDeckPosition', { current: index + 1, total: items.length })}</span>
        </div>
        <button type="button" onClick={() => move(1)} disabled={items.length < 2} aria-label={t('relatedDeckNext')}><FiArrowRight size={19} aria-hidden="true" /></button>
      </div>
    </div>
  )
}
