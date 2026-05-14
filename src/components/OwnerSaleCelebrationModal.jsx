import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Confetti from 'react-confetti'
import { FiX } from 'react-icons/fi'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './OwnerSaleCelebrationModal.css'

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'

function formatSaleAmount(amount, currency, locale) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  const cur = (currency || 'USD').toUpperCase()
  const sym = cur === 'EUR' ? '€' : cur === 'BYN' ? 'Br' : '$'
  const loc = locale && locale.startsWith('en') ? 'en-US' : 'ru-RU'
  return `${sym}${n.toLocaleString(loc)}`
}

export default function OwnerSaleCelebrationModal({ celebration, onClose, onGoToSales }) {
  const { t, i18n } = useTranslation()
  const [windowSize, setWindowSize] = useState(() =>
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 800, height: 600 }
  )

  useEffect(() => {
    const onResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!celebration) return null

  const img = getPropertyCardImage(
    {
      photos: celebration.photos,
      image: celebration.cover_url,
      image_url: celebration.cover_url,
    },
    FALLBACK_IMG
  )
  const imageProps = buildResponsiveImageProps(img, {
    widths: [300, 450, 600],
    sizes: '(max-width: 768px) 70vw, 320px',
    fit: 'cover',
    quality: 72,
    format: 'webp',
  })

  const amountStr = formatSaleAmount(celebration.sale_amount, celebration.currency, i18n.language)
  const channel = celebration.sale_channel || 'buy_now'
  const detailKey = `ownerSaleCelebrationDetail_${channel}`

  const detailParams =
    channel === 'share_purchase'
      ? {
          amount: amountStr,
          count: celebration.shares_count ?? 0,
        }
      : { amount: amountStr }

  return createPortal(
    <>
      <div
        className="owner-sale-celebration-overlay"
        role="presentation"
        onClick={onClose}
      >
        <div className="owner-sale-celebration-confetti" aria-hidden>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle
            numberOfPieces={280}
            gravity={0.12}
            wind={0.02}
            colors={['#10b981', '#f59e0b', '#3b82f6', '#14b8a6', '#fbbf24', '#8b5cf6', '#ec4899']}
            confettiSource={{
              x: 0,
              y: 0,
              w: windowSize.width,
              h: 0,
            }}
          />
        </div>
        <div
          className="owner-sale-celebration-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-sale-celebration-headline"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="owner-sale-celebration-modal__close"
            onClick={onClose}
            aria-label={t('ownerSaleCelebrationCloseAria')}
          >
            <FiX size={22} />
          </button>
          <div className="owner-sale-celebration-modal__inner">
            <h2 id="owner-sale-celebration-headline" className="owner-sale-celebration-modal__headline">
              {t('ownerSaleCelebrationHeadline')}
            </h2>
            <p className="owner-sale-celebration-modal__subhead">{t('ownerSaleCelebrationSubhead')}</p>

            <div className="owner-sale-celebration-modal__thumb">
              <img {...imageProps} alt="" />
            </div>

            {celebration.title ? (
              <h3 className="owner-sale-celebration-modal__title">{celebration.title}</h3>
            ) : null}
            {celebration.location ? (
              <p className="owner-sale-celebration-modal__location">{celebration.location}</p>
            ) : null}

            <p className="owner-sale-celebration-modal__detail">{t(detailKey, detailParams)}</p>
            <p className="owner-sale-celebration-modal__sum">
              {t('ownerSaleCelebrationSumLabel')}: {amountStr}
            </p>

            <div className="owner-sale-celebration-modal__actions">
              <button
                type="button"
                className="owner-sale-celebration-modal__btn-primary"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onGoToSales?.()
                }}
              >
                {t('ownerSaleCelebrationCtaSales')}
              </button>
              <button
                type="button"
                className="owner-sale-celebration-modal__btn-secondary"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onClose?.()
                }}
              >
                {t('ownerSaleCelebrationClose')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
