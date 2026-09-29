import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowUpRight } from 'react-icons/fi'
import { publicAsset } from '../utils/publicAsset'
import { CO_INVESTMENT_PATH } from '../utils/sectionRoutes'

const BANNERS = [
  { id: 'intro', key: 'brandIntro', image: 'brand-intro-summer', to: '/about' },
  { id: 'buy', key: 'bannerBuy', image: 'brand-banner-buy', to: '/auction/buy-now' },
  { id: 'auction', key: 'bannerAuction', image: 'brand-banner-auction', to: '/auction?filter=auction' },
  { id: 'shares', key: 'bannerShares', image: 'brand-banner-shares', to: CO_INVESTMENT_PATH },
]

export default function DiscoverIntroBanners() {
  const { t } = useTranslation()
  const rootRef = useRef(null)
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => setReducedMotion(motion.matches)
    const syncVisibility = () => setPageVisible(!document.hidden)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25), { threshold: 0.25 })
    observer.observe(rootRef.current)
    motion.addEventListener('change', syncMotion)
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', syncMotion)
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [])

  useEffect(() => {
    if (hovered || focused || !visible || !pageVisible || reducedMotion) return
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % BANNERS.length), 8000)
    return () => window.clearTimeout(timer)
  }, [active, hovered, focused, visible, pageVisible, reducedMotion])

  return (
    <section
      ref={rootRef}
      className="md-brand-carousel"
      aria-label={t('discoverPage_bannersAria')}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}
    >
      <div className="md-brand-intro">
        {BANNERS.map((banner, index) => (
          <article
            key={banner.id}
            className={`md-brand-intro__slide md-brand-intro__slide--${banner.id}${active === index ? ' is-active' : ''}`}
            aria-labelledby={`md-brand-title-${banner.id}`}
            aria-hidden={active !== index}
            inert={active !== index}
          >
            <h2 id={`md-brand-title-${banner.id}`} className="md-brand-intro__title">
              {t(`discoverPage_${banner.key}Title`)}
            </h2>
            <div className="md-brand-intro__copy">
              <p className="md-brand-intro__description">{t(`discoverPage_${banner.key}Description`)}</p>
              <Link className="md-brand-intro__cta" to={banner.to}>
                {t(`discoverPage_${banner.key}Cta`)}
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>
            <div className="md-brand-intro__art" aria-hidden="true">
              <img
                className="md-brand-intro__image"
                src={publicAsset(`images/mobile-discover/${banner.image}.webp`)}
                alt=""
                aria-hidden="true"
                width={1200}
                height={800}
                decoding="async"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
