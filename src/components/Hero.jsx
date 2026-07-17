import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown } from 'lucide-react'
import heroFeatureCoinMoneta from '../assets/moneta.jpg'
import './Hero.css'

function measureCopyHeight(element) {
  if (!element || typeof window === 'undefined') return 0

  const clone = element.cloneNode(true)
  const width = element.getBoundingClientRect().width
  clone.style.cssText = [
    'position:absolute',
    'left:-9999px',
    'top:0',
    'visibility:hidden',
    'pointer-events:none',
    'max-height:none',
    'height:auto',
    'overflow:visible',
    `width:${width}px`,
  ].join(';')

  clone.querySelectorAll('p').forEach((node) => {
    node.style.display = 'block'
    node.style.overflow = 'visible'
    node.style.webkitLineClamp = 'unset'
    node.style.lineClamp = 'unset'
  })

  element.parentElement?.appendChild(clone)
  const height = Math.ceil(clone.getBoundingClientRect().height)
  clone.remove()
  return height
}

const MOBILE_BREAKPOINT_PX = 768

const AUCTION_HERO_BG = '/images/sellyourbrick/about/about-category-auction.jpg'

const Hero = ({ staticMobileCards = false, auctionScene = false }) => {
  const { t } = useTranslation()
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches,
  )
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [collapsingIndex, setCollapsingIndex] = useState(null)
  const [expandedHeights, setExpandedHeights] = useState({})
  const copyRefs = useRef([])

  const isStaticMobile = staticMobileCards && isMobile
  const isStaticCards = isStaticMobile

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const FEATURES = [
    {
      titleKey: 'heroFeature1Title',
      textKey: 'heroFeature1Text',
      img: '/images/external/icon-1-17dab2f77576179c-14e3e1ef79.png',
      altKey: 'heroFeature1Alt'
    },
    {
      titleKey: 'heroFeature2Title',
      textKey: 'heroFeature2Text',
      img: heroFeatureCoinMoneta,
      altKey: 'heroFeature2Alt'
    },
    {
      titleKey: 'heroFeature3Title',
      textKey: 'heroFeature3Text',
      img: '/images/external/icon-3-be34334d56e4527b-7e5b2f6844.svg',
      altKey: 'heroFeature3Alt'
    }
  ]

  const closeCard = (index) => {
    setCollapsingIndex(index)
    setExpandedIndex(null)
  }

  const openCard = (index) => {
    const copyEl = copyRefs.current[index]
    const measuredHeight = copyEl ? measureCopyHeight(copyEl) : 0
    if (measuredHeight > 0) {
      setExpandedHeights((prev) => ({ ...prev, [index]: measuredHeight }))
    }
    setCollapsingIndex(null)
    setExpandedIndex(index)
  }

  const handleToggle = (index) => {
    if (expandedIndex === index) {
      closeCard(index)
      return
    }

    if (collapsingIndex === index) {
      openCard(index)
      return
    }

    openCard(index)
  }

  useEffect(() => {
    if (isStaticCards) return undefined
    if (expandedIndex === null || typeof window === 'undefined') return undefined

    const remeasure = () => {
      const copyEl = copyRefs.current[expandedIndex]
      if (!copyEl) return
      const measuredHeight = measureCopyHeight(copyEl)
      if (measuredHeight > 0) {
        setExpandedHeights((prev) => ({ ...prev, [expandedIndex]: measuredHeight }))
      }
    }

    window.addEventListener('resize', remeasure, { passive: true })
    return () => window.removeEventListener('resize', remeasure)
  }, [expandedIndex, isStaticCards, t])

  const handleCopyTransitionEnd = (index) => (event) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'max-height') return
    setCollapsingIndex((prev) => (prev === index ? null : prev))
  }

  return (
    <section
      className={['hero', auctionScene && 'hero--auction-scene'].filter(Boolean).join(' ')}
    >
      {auctionScene ? (
        <>
          <img className="hero--auction-scene__bg" src={AUCTION_HERO_BG} alt="" aria-hidden />
          <div className="hero--auction-scene__overlay" aria-hidden />
        </>
      ) : null}
      <div className="hero-container">
        {auctionScene ? (
          <div className="hero-auction-mobile">
            <span className="hero-auction-mobile__eyebrow">{t('auctionListingSaleAll')}</span>
            <h1>{t('auctionSectionTitle')}</h1>
            <p>{t('auctionSectionSubtitle')}</p>
            <button
              type="button"
              className="hero-auction-mobile__cta"
              onClick={() => {
                document.getElementById('properties-grid')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }}
            >
              <span>{t('auctionSectionCta')}</span>
              <ArrowDown size={18} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        ) : null}
        {auctionScene ? (
          <header className="hero-auction-header">
            <h1 className="hero-auction-header__title">{t('auctionSectionTitle')}</h1>
            <p className="hero-auction-header__lead">{t('auctionSectionSubtitle')}</p>
          </header>
        ) : null}
        <div
          className={[
            'hero-features',
            isStaticCards && 'hero-features--static-mobile',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {FEATURES.map((feature, index) => {
            const isExpanded = expandedIndex === index
            const isCollapsing = collapsingIndex === index
            const isOpen = isExpanded || isCollapsing
            return (
            <div
              key={feature.titleKey}
              className={[
                'hero-feature-card',
                isStaticCards && 'hero-feature-card--static',
                !isStaticCards && isExpanded && 'hero-feature-card--expanded',
                !isStaticCards && isCollapsing && 'hero-feature-card--collapsing',
              ]
                .filter(Boolean)
                .join(' ')}
              {...(!isStaticCards
                ? {
                    onClick: () => handleToggle(index),
                    role: 'button',
                    tabIndex: 0,
                    'aria-expanded': isOpen,
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleToggle(index)
                      }
                    },
                  }
                : {})}
            >
              <div className="hero-feature-image">
                <img
                  src={feature.img}
                  alt={t(feature.altKey)}
                  className={`hero-feature-image__img${index === 1 ? ' hero-feature-image__img--euro-coin' : ''}`}
                />
              </div>
              <div className="hero-feature-content">
                <h3>{t(feature.titleKey)}</h3>
                {!isStaticCards ? (
                  <div
                    ref={(el) => {
                      copyRefs.current[index] = el
                    }}
                    className="hero-feature-copy"
                    style={
                      (isExpanded || isCollapsing) && expandedHeights[index]
                        ? { '--hero-copy-expanded-max': `${expandedHeights[index]}px` }
                        : undefined
                    }
                    onTransitionEnd={handleCopyTransitionEnd(index)}
                  >
                    <p>{t(feature.textKey)}</p>
                  </div>
                ) : null}
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Hero
