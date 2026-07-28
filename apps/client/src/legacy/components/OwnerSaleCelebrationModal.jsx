import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Confetti from 'react-confetti'
import { FiX } from 'react-icons/fi'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './OwnerSaleCelebrationModal.css'
import { getCurrencySymbol } from '../utils/currency'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'

const FALLBACK_IMG =
  '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

function formatSaleAmount(amount, currency, locale) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  const cur = (currency || 'USD').toUpperCase()
  const sym = getCurrencySymbol(cur)
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

  const isVipClubFeatured = celebration?.sale_channel === 'vip_club_featured'
  const { visible: vipDrawerVisible, isClosing: vipDrawerClosing, requestClose: requestVipDrawerClose } =
    useDrawerDismiss(Boolean(celebration && isVipClubFeatured), onClose)

  if (!celebration && !vipDrawerVisible) return null

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
  const headlineKey = isVipClubFeatured
    ? 'ownerSaleCelebrationHeadline_vip_club_featured'
    : 'ownerSaleCelebrationHeadline'
  const subheadKey = isVipClubFeatured
    ? 'ownerSaleCelebrationSubhead_vip_club_featured'
    : 'ownerSaleCelebrationSubhead'
  const vipFeeAmountStr = formatSaleAmount(
    celebration.vip_fee_amount,
    celebration.vip_fee_currency || celebration.currency || 'EUR',
    i18n.language
  )

  const detailParams =
    channel === 'share_purchase'
      ? {
          amount: amountStr,
          count: celebration.shares_count ?? 0,
        }
      : isVipClubFeatured
        ? { fee: vipFeeAmountStr }
        : { amount: amountStr }
  const detailText = t(detailKey, detailParams)
  const vipDetailParts =
    isVipClubFeatured && detailText.includes(vipFeeAmountStr)
      ? detailText.split(vipFeeAmountStr)
      : null

  if (isVipClubFeatured) {
    if (!vipDrawerVisible) return null
    return createPortal(
      <>
        <div
          role="presentation"
          className={`owner-sale-vip-drawer__backdrop${
            vipDrawerClosing ? ' drawer-dismiss-backdrop--closing' : ''
          }`}
          onClick={() => requestVipDrawerClose()}
        />
        <div
          className={`owner-sale-vip-drawer${vipDrawerClosing ? ' drawer-dismiss-from-top--closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-sale-vip-drawer-headline"
        >
          <div className="owner-sale-celebration-confetti" aria-hidden>
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle
              numberOfPieces={280}
              gravity={0.12}
              wind={0.02}
              colors={['#0099a9', '#f59e0b', '#3b82f6', '#33adbb', '#fbbf24', '#8b5cf6', '#ec4899']}
              confettiSource={{
                x: 0,
                y: 0,
                w: windowSize.width,
                h: 0,
              }}
            />
          </div>
          <div className="owner-sale-vip-drawer__content">
            <div className="owner-sale-vip-drawer__sheet-handle" aria-hidden="true">
              <span className="owner-sale-vip-drawer__sheet-pill" />
            </div>
            <div className="owner-sale-celebration-modal__inner">
              <h2
                id="owner-sale-vip-drawer-headline"
                className="owner-sale-celebration-modal__headline owner-sale-celebration-modal__headline--vip"
              >
                {t(headlineKey)}
              </h2>

              <div className="owner-sale-celebration-modal__thumb">
                <img {...imageProps} alt="" />
              </div>

              {celebration.title ? (
                <h3 className="owner-sale-celebration-modal__title">{celebration.title}</h3>
              ) : null}
              {celebration.location ? (
                <p className="owner-sale-celebration-modal__location">{celebration.location}</p>
              ) : null}

              <p className="owner-sale-celebration-modal__detail">
                {vipDetailParts ? (
                  <>
                    {vipDetailParts[0]}
                    <span className="owner-sale-celebration-modal__detail-fee">{vipFeeAmountStr}</span>
                    {vipDetailParts.slice(1).join(vipFeeAmountStr)}
                  </>
                ) : (
                  detailText
                )}
              </p>

              <div className="owner-sale-celebration-modal__actions">
                <button
                  type="button"
                  className="owner-sale-celebration-modal__btn-primary owner-sale-celebration-modal__btn-primary--vip"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    requestVipDrawerClose()
                  }}
                >
                  {t('ownerSaleCelebrationCtaVip')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>,
      document.body
    )
  }

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
            colors={['#0099a9', '#f59e0b', '#3b82f6', '#33adbb', '#fbbf24', '#8b5cf6', '#ec4899']}
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
          {!isVipClubFeatured ? (
            <button
              type="button"
              className="owner-sale-celebration-modal__close"
              onClick={onClose}
              aria-label={t('ownerSaleCelebrationCloseAria')}
            >
              <FiX size={22} />
            </button>
          ) : null}
          <div className="owner-sale-celebration-modal__inner">
            <h2
              id="owner-sale-celebration-headline"
              className={`owner-sale-celebration-modal__headline${
                isVipClubFeatured ? ' owner-sale-celebration-modal__headline--vip' : ''
              }`}
            >
              {t(headlineKey)}
            </h2>
            {!isVipClubFeatured ? (
              <p className="owner-sale-celebration-modal__subhead">{t(subheadKey)}</p>
            ) : null}

            <div className="owner-sale-celebration-modal__thumb">
              <img {...imageProps} alt="" />
            </div>

            {celebration.title ? (
              <h3 className="owner-sale-celebration-modal__title">{celebration.title}</h3>
            ) : null}
            {celebration.location ? (
              <p className="owner-sale-celebration-modal__location">{celebration.location}</p>
            ) : null}

            <p className="owner-sale-celebration-modal__detail">
              {vipDetailParts ? (
                <>
                  {vipDetailParts[0]}
                  <span className="owner-sale-celebration-modal__detail-fee">{vipFeeAmountStr}</span>
                  {vipDetailParts.slice(1).join(vipFeeAmountStr)}
                </>
              ) : (
                detailText
              )}
            </p>
            {!isVipClubFeatured ? (
              <p className="owner-sale-celebration-modal__sum">
                {t('ownerSaleCelebrationSumLabel')}: {amountStr}
              </p>
            ) : null}

            <div className="owner-sale-celebration-modal__actions">
              <button
                type="button"
                className={`owner-sale-celebration-modal__btn-primary${
                  isVipClubFeatured ? ' owner-sale-celebration-modal__btn-primary--vip' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (isVipClubFeatured) {
                    onClose?.()
                    return
                  }
                  onGoToSales?.()
                }}
              >
                {isVipClubFeatured ? t('ownerSaleCelebrationCtaVip') : t('ownerSaleCelebrationCtaSales')}
              </button>
              {!isVipClubFeatured ? (
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
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
