import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiCheck, FiChevronDown, FiX } from 'react-icons/fi'
import { formatPropertyPrice } from '../../utils/currency'
import { triggerSelectionHaptic } from '../../utils/haptics'
import { getPropertyCardImage } from '../../utils/propertyImage'
import { resolvePositivePropertyPrice } from '../../utils/compareDecision'
import {
  formatCompareSaleTypeLabel,
  getCompareSaleTypeTone,
  getComparisonGroupKey,
} from '../../utils/propertyFavoriteKey'
import './CompareMobilePicker.css'

const FALLBACK_IMAGE = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

function propertyView(item, index, t) {
  const property = item?.property || {}
  const price = resolvePositivePropertyPrice(property)
  return {
    title: property.name || property.title || t('comparePage_objectN', { index: index + 1 }),
    saleTypeLabel: formatCompareSaleTypeLabel(property, t),
    saleTypeTone: getCompareSaleTypeTone(property),
    image: getPropertyCardImage(property, FALLBACK_IMAGE),
    price: price != null && price !== ''
      ? formatPropertyPrice(price, property.currency || 'EUR', { compact: true })
      : t('comparePage_priceOnRequest'),
  }
}

function PropertyImage({ src, title }) {
  return (
    <img
      src={src}
      alt={title}
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) event.currentTarget.src = FALLBACK_IMAGE
      }}
    />
  )
}

export default function CompareMobilePicker({
  items,
  selectedKeys,
  groupFilter,
  open,
  onOpen,
  onClose,
  onBack,
  onToggleSelect,
  loading,
}) {
  const { t } = useTranslation()
  const drumRef = useRef(null)
  const moveTimerRef = useRef(null)
  const reorderTimerRef = useRef(null)
  const reorderFrameRef = useRef(null)
  const activeIndexRef = useRef(0)
  const touchScrollingRef = useRef(false)
  const scrollStopTimerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [departingKey, setDepartingKey] = useState(null)
  const [movedKey, setMovedKey] = useState(null)
  const [drumScrolled, setDrumScrolled] = useState(false)
  const previewItems = useMemo(() => items.slice(0, 5), [items])
  const visibleCount = previewItems.length
  const hiddenCount = Math.max(0, items.length - previewItems.length)
  const drumItems = useMemo(() => {
    const tailKey = movedKey || (open && selectedKeys.length === 1 ? selectedKeys[0] : null)
    if (!tailKey) return items
    const movedItem = items.find((item) => item.key === tailKey)
    return movedItem ? [...items.filter((item) => item.key !== tailKey), movedItem] : items
  }, [items, movedKey, open, selectedKeys])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    const layout = document.querySelector('.app-layout')
    document.body.style.overflow = 'hidden'
    layout?.classList.add('compare-picker-open')
    setDrumScrolled(false)
    setDepartingKey(null)
    setMovedKey(selectedKeys.length === 1 ? selectedKeys[0] : null)
    const nextActiveIndex = 0
    activeIndexRef.current = nextActiveIndex
    touchScrollingRef.current = false
    setActiveIndex(nextActiveIndex)
    const positionTimer = window.requestAnimationFrame(() => {
      const viewport = drumRef.current
      const target = viewport?.querySelector(`[data-drum-index="${nextActiveIndex}"]`)
      if (!viewport || !target) return
      viewport.scrollTo({
        top: target.offsetTop - (viewport.clientHeight - target.offsetHeight) / 2,
        behavior: 'auto',
      })
    })
    return () => {
      window.cancelAnimationFrame(positionTimer)
      window.cancelAnimationFrame(reorderFrameRef.current)
      window.clearTimeout(moveTimerRef.current)
      window.clearTimeout(reorderTimerRef.current)
      window.clearTimeout(scrollStopTimerRef.current)
      document.body.style.overflow = previousOverflow
      layout?.classList.remove('compare-picker-open')
    }
  }, [open])

  const handleDrumTouchStart = () => {
    touchScrollingRef.current = true
    window.clearTimeout(scrollStopTimerRef.current)
  }

  const handleDrumTouchEnd = () => {
    window.clearTimeout(scrollStopTimerRef.current)
    scrollStopTimerRef.current = window.setTimeout(() => {
      touchScrollingRef.current = false
    }, 180)
  }

  const handleDrumScroll = (event) => {
    setDrumScrolled(event.currentTarget.scrollTop > 18)
    const viewport = event.currentTarget.getBoundingClientRect()
    const center = viewport.top + viewport.height / 2
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    event.currentTarget.querySelectorAll('[data-drum-index]').forEach((node) => {
      const rect = node.getBoundingClientRect()
      const distance = Math.abs(rect.top + rect.height / 2 - center)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = Number(node.dataset.drumIndex)
      }
    })

    if (nearestIndex !== activeIndexRef.current) {
      activeIndexRef.current = nearestIndex
      setActiveIndex(nearestIndex)
      if (touchScrollingRef.current) triggerSelectionHaptic()
    }

    if (touchScrollingRef.current) {
      window.clearTimeout(scrollStopTimerRef.current)
      scrollStopTimerRef.current = window.setTimeout(() => {
        touchScrollingRef.current = false
      }, 180)
    }
  }

  const handleDrumSelect = (item) => {
    if (departingKey) return
    const alreadySelected = selectedKeys.includes(item.key)
    if (alreadySelected || selectedKeys.length > 0) {
      onToggleSelect(item)
      return
    }

    const selectedPosition = drumItems.findIndex((entry) => entry.key === item.key)
    const nextIndex = Math.max(0, Math.min(selectedPosition, drumItems.length - 2))
    setDepartingKey(item.key)
    moveTimerRef.current = window.setTimeout(() => {
      const viewport = drumRef.current
      const positions = new Map()
      viewport?.querySelectorAll('[data-drum-key]').forEach((node) => {
        if (node.dataset.drumKey !== String(item.key)) {
          positions.set(node.dataset.drumKey, node.getBoundingClientRect().top)
        }
      })
      if (viewport) viewport.style.scrollSnapType = 'none'

      flushSync(() => {
        setMovedKey(item.key)
        setDepartingKey(null)
        activeIndexRef.current = nextIndex
        setActiveIndex(nextIndex)
        onToggleSelect(item)
      })

      const movingNodes = []
      viewport?.querySelectorAll('[data-drum-key]').forEach((node) => {
        const previousTop = positions.get(node.dataset.drumKey)
        if (previousTop == null) return
        const delta = previousTop - node.getBoundingClientRect().top
        if (Math.abs(delta) < 1) return
        node.style.transition = 'none'
        node.style.setProperty('--drum-reorder-y', `${delta}px`)
        movingNodes.push(node)
      })

      viewport?.getBoundingClientRect()
      reorderFrameRef.current = window.requestAnimationFrame(() => {
        movingNodes.forEach((node) => {
          node.style.transition = ''
          node.style.setProperty('--drum-reorder-y', '0px')
        })
      })
      reorderTimerRef.current = window.setTimeout(() => {
        movingNodes.forEach((node) => node.style.removeProperty('--drum-reorder-y'))
        if (viewport) viewport.style.scrollSnapType = ''
      }, 360)
    }, 260)
  }

  return (
    <div
      className={`compare-picker compare-picker--count-${Math.min(visibleCount, 5)}`}
      data-object-count={items.length}
    >
      <button type="button" className="compare-picker__back" onClick={onBack} aria-label={t('comparePage_backToFavorites')}>
        <FiArrowLeft aria-hidden="true" />
      </button>

      <h1 id="compare-hero-title" className="compare-picker__title">{t('comparePage_heroTitle')}</h1>

      <div
        className={`compare-picker__stack${loading ? ' compare-picker__stack--loading' : ''}`}
        data-preview-count={visibleCount}
      >
        <div className="compare-picker__objects-head">
          <span>{t('comparePage_yourObjects')}</span>
          <b>{items.length}</b>
        </div>

        <div className="compare-picker__cards">
          {loading ? Array.from({ length: 4 }, (_, index) => (
            <span className="compare-picker__preview compare-picker__preview--skeleton" key={index} />
          )) : items.length === 0 ? (
            <div className="compare-picker__empty">
              <strong>{t('comparePage_emptyTitle')}</strong>
              <span>{t('comparePage_emptyText')}</span>
            </div>
          ) : previewItems.map((item, index) => {
            const view = propertyView(item, index, t)
            return (
              <button
                type="button"
                className="compare-picker__preview"
                style={{ '--preview-shift': `${(index - 2) * 2}px` }}
                onClick={onOpen}
                key={item.key}
                aria-label={t('comparePage_openPicker')}
              >
                <span className="compare-picker__preview-number">{index + 1}</span>
                <PropertyImage src={view.image} title={view.title} />
                <span className="compare-picker__preview-copy">
                  <strong>{view.title}</strong>
                  <small className={`compare-picker__sale-tag compare-picker__sale-tag--${view.saleTypeTone}`}>
                    {view.saleTypeLabel}
                  </small>
                </span>
                <b className="compare-picker__preview-price">{view.price}</b>
              </button>
            )
          })}
          {hiddenCount > 0 ? (
            <button type="button" className="compare-picker__more" onClick={onOpen}>
              {t('comparePage_moreObjects', { count: hiddenCount })}
            </button>
          ) : null}
        </div>
      </div>

      {!loading && items.length > 0 && selectedKeys.length < 2 ? (
        <button type="button" className="compare-picker__open" onClick={onOpen}>
          {t('comparePage_openPicker')}
          <FiChevronDown aria-hidden="true" />
        </button>
      ) : null}

      {open ? (
        <section className="compare-picker-drum" role="dialog" aria-modal="true" aria-labelledby="compare-picker-drum-title">
          <header className="compare-picker-drum__header">
            <div>
              <span>{t('comparePage_pickerCount', { count: selectedKeys.length })}</span>
              <h2 id="compare-picker-drum-title">{t('comparePage_pickerTitle')}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label={t('comparePage_pickerClose')}>
              <FiX aria-hidden="true" />
            </button>
          </header>

          {!drumScrolled ? (
            <div className="compare-picker-drum__scroll-cue" aria-hidden="true">
              <FiChevronDown />
              <FiChevronDown />
            </div>
          ) : null}

          <div
            className="compare-picker-drum__viewport"
            ref={drumRef}
            onTouchStart={handleDrumTouchStart}
            onTouchEnd={handleDrumTouchEnd}
            onTouchCancel={handleDrumTouchEnd}
            onScroll={handleDrumScroll}
          >
            {drumItems.map((item, index) => {
              const view = propertyView(item, index, t)
              const selectedIndex = selectedKeys.indexOf(item.key)
              const selected = selectedIndex >= 0
              const itemGroup = getComparisonGroupKey(item.property, item.mockCategory)
              const disabled = selectedKeys.length === 1 && groupFilter && itemGroup !== groupFilter && !selected
              const distance = Math.min(Math.abs(index - activeIndex), 3)
              const direction = index < activeIndex ? -1 : 1
              return (
                <button
                  type="button"
                  className={`compare-picker-drum__card${selected ? ' compare-picker-drum__card--selected' : ''}${index === activeIndex ? ' compare-picker-drum__card--active' : ''}${item.key === departingKey ? ' compare-picker-drum__card--departing' : ''}`}
                  style={{
                    '--drum-scale': 1 - distance * 0.055,
                    '--drum-opacity': 1,
                    '--drum-rotate': `${direction * distance * 4}deg`,
                  }}
                  data-drum-index={index}
                  data-drum-key={item.key}
                  disabled={disabled}
                  onClick={() => handleDrumSelect(item)}
                  onFocus={() => {
                    activeIndexRef.current = index
                    setActiveIndex(index)
                  }}
                  key={item.key}
                  aria-pressed={selected}
                >
                  <PropertyImage src={view.image} title={view.title} />
                  <span className="compare-picker-drum__copy">
                    <strong>{view.title}</strong>
                    <small className={`compare-picker__sale-tag compare-picker__sale-tag--${view.saleTypeTone}`}>
                      {view.saleTypeLabel}
                    </small>
                    <b>{view.price}</b>
                  </span>
                  <span className="compare-picker-drum__select">
                    {selected ? (selectedIndex + 1) : <FiCheck aria-hidden="true" />}
                  </span>
                </button>
              )
            })}
          </div>

          <footer className="compare-picker-drum__footer">
            <div className="compare-picker-drum__footer-status">
              <span>{t('comparePage_pickerCount', { count: selectedKeys.length })}</span>
              <div className="compare-picker-drum__progress" aria-hidden="true">
                {[0, 1].map((step) => (
                  <i className={selectedKeys.length > step ? 'is-filled' : ''} key={step} />
                ))}
              </div>
            </div>
            <p>
              {selectedKeys.length === 0
                ? t('comparePage_hint0')
                : items.length < 2
                  ? t('comparePage_hint1Solo')
                  : t('comparePage_hint1')}
            </p>
          </footer>
        </section>
      ) : null}
    </div>
  )
}
