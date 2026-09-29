import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiChevronLeft, FiChevronRight, FiXCircle } from 'react-icons/fi'
import { useHorizontalSwipe } from '../../hooks/useHorizontalSwipe'
import { publicAsset } from '../../utils/publicAsset'
import './DevelopmentGallery.css'

export default function DevelopmentGallery({ images = [], title, stage }) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(0)
  const [index, setIndex] = useState(null)
  const close = useRef(null), trigger = useRef(null), dialog = useRef(null), strip = useRef(null)
  const step = (n) => setIndex((i) => (i + n + images.length) % images.length)
  const select = (n) => setCurrent((i) => (i + n + images.length) % images.length)
  const swipe = useHorizontalSwipe({ enabled: index !== null && images.length > 1, onSwipeLeft: () => step(1), onSwipeRight: () => step(-1) })
  const coverSwipe = useHorizontalSwipe({ enabled: images.length > 1, onSwipeLeft: () => select(1), onSwipeRight: () => select(-1) })
  const open = (event) => { trigger.current = event.currentTarget; setIndex(current) }
  useEffect(() => {
    strip.current?.children[current]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [current])
  useEffect(() => {
    if (index === null) return
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    close.current?.focus()
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setIndex(null) }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
      if (e.key === 'Tab') {
        const controls = Array.from(dialog.current?.querySelectorAll('button') || [])
        const at = controls.indexOf(document.activeElement)
        e.preventDefault()
        controls[(at + (e.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus()
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = old
      document.removeEventListener('keydown', key)
      trigger.current?.focus({ preventScroll: true })
    }
  }, [index !== null, images.length])
  if (!images.length) return <p>{t('propertyDetailGalleryEmpty')}</p>
  const photoLabel = (n) => t('propertyDetailGalleryOpenItem', { n: n + 1, total: images.length })
  return (
    <>
      <section className="pd-v3-gallery dev-auction-gallery" aria-label={t('gallery')}>
        <div className="pd-v3-gallery__stage" {...coverSwipe}>
          <button type="button" className="pd-v3-gallery__image-button property-detail-gallery__open-photo" onClick={open} aria-label={photoLabel(current)}>
            <img className="pd-v3-gallery__image" src={images[current]} alt={title} />
          </button>
          {stage && <span className={`dev-badge dev-auction-gallery__status${stage === 'fundraising' ? ' dev-badge--live' : ''}`}>
            {stage === 'fundraising' && <img src={publicAsset('images/property-detail/auction-live-badge-3d.png')} alt="" width="12" height="12" />}
            {t(`develop.stage_${stage}`)}
          </span>}
          <span className="pd-v3-gallery__counter">{current + 1} / {images.length}</span>
          {images.length > 1 && <div className="property-detail-gallery__thumb-strip dev-auction-gallery__mobile-strip">
            {images.slice(0, 5).map((src, i) => <button key={`${src}-${i}`} type="button" className={`property-detail-gallery__thumb-strip-item${current === i ? ' property-detail-gallery__thumb-strip-item--active' : ''}`} onClick={() => setCurrent(i)} aria-label={photoLabel(i)} aria-current={current === i ? 'true' : undefined}><img src={src} alt="" />{i === 4 && images.length > 5 && <span className="property-detail-gallery__thumb-strip-more">+{images.length - 5}</span>}</button>)}
          </div>}
        </div>
        {images.length > 1 && <div className="pd-v3-gallery__thumbs-row">
          <button type="button" className="pd-v3-gallery__thumbs-nav" onClick={() => select(-1)} aria-label={t('previousImage')}><FiChevronLeft size={18} /></button>
          <div className="pd-v3-gallery__thumbs" ref={strip}>
            {images.map((src, i) => <button type="button" key={`${src}-${i}`} className={`pd-v3-gallery__thumb${current === i ? ' pd-v3-gallery__thumb--active' : ''}`} onClick={() => setCurrent(i)} aria-label={photoLabel(i)} aria-current={current === i ? 'true' : undefined}><img src={src} alt="" loading="lazy" /></button>)}
          </div>
          <button type="button" className="pd-v3-gallery__thumbs-nav" onClick={() => select(1)} aria-label={t('nextImage')}><FiChevronRight size={18} /></button>
        </div>}
      </section>
      {index !== null && createPortal(
        <div ref={dialog} className="property-detail-desktop-gallery-lightbox" role="dialog" aria-modal="true" aria-label={t('propertyDetailGalleryLightboxLabel')} onClick={() => setIndex(null)} {...swipe}>
          <div className="property-detail-desktop-gallery-lightbox__panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" ref={close} className="property-detail-desktop-gallery-lightbox__close" onClick={() => setIndex(null)} aria-label={t('close')}><FiXCircle size={28} /></button>
            <span className="property-detail-desktop-gallery-lightbox__counter" aria-live="polite">{index + 1} / {images.length}</span>
            {images.length > 1 && <>
              <button type="button" className="property-detail-desktop-gallery-lightbox__nav property-detail-desktop-gallery-lightbox__nav--prev" onClick={() => step(-1)} aria-label={t('previousImage')}><FiChevronLeft size={28} /></button>
              <button type="button" className="property-detail-desktop-gallery-lightbox__nav property-detail-desktop-gallery-lightbox__nav--next" onClick={() => step(1)} aria-label={t('nextImage')}><FiChevronRight size={28} /></button>
            </>}
            <div className="property-detail-desktop-gallery-lightbox__stage"><img className="property-detail-desktop-gallery-lightbox__img" src={images[index]} alt={title} /></div>
          </div>
        </div>, document.body)}
    </>
  )
}
