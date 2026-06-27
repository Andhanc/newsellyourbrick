import { Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiShoppingBag } from 'react-icons/fi'
import i18n from '../i18n/config'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import ImageWithSkeleton from './ImageWithSkeleton'
import './OwnerPurchasedAssets.css'
import { getCurrencySymbol } from '../utils/currency'
import { getCoInvestmentDetailPath } from '../utils/sectionRoutes'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const SHARE_PURCHASE_IMAGE_PLACEHOLDER =
  '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

function sharePurchaseImageSrc(raw) {
  if (!raw || typeof raw !== 'string') return SHARE_PURCHASE_IMAGE_PLACEHOLDER
  const t = raw.trim()
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:') || t.startsWith('/')) {
    return t
  }
  return `/${t.replace(/^\/+/, '')}`
}

function intlLocale() {
  const code = (i18n.language || 'ru').split('-')[0]
  const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
  return map[code] || 'en-US'
}

/**
 * Кабинет продавца: аукционы и доли как у покупателя; «Купить сейчас» / резерв — только после того,
 * как админ перевёл запрос на покупку в статус «Завершён» (полная сделка).
 */
export default function OwnerPurchasedAssets({ userId }) {
  const { t, i18n: i18nApi } = useTranslation()
  const billingLocale = (() => {
    const code = (i18nApi.language || 'ru').split('-')[0]
    const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
    return map[code] || 'en-US'
  })()

  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [loadingPurchases, setLoadingPurchases] = useState(true)
  const [reservationPurchases, setReservationPurchases] = useState([])
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [completedPurchaseRequestIds, setCompletedPurchaseRequestIds] = useState(() => new Set())
  const [sharePurchases, setSharePurchases] = useState([])
  const [loadingShares, setLoadingShares] = useState(true)

  const numericUserId = useMemo(() => {
    if (userId == null) return null
    const n = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [userId])

  useEffect(() => {
    if (!numericUserId) {
      setPurchaseHistory([])
      setReservationPurchases([])
      setSharePurchases([])
      setCompletedPurchaseRequestIds(new Set())
      setLoadingPurchases(false)
      setLoadingReservations(false)
      setLoadingShares(false)
      return
    }

    let cancelled = false

    const loadWins = async () => {
      setLoadingPurchases(true)
      try {
        const response = await fetch(`${API_BASE_URL}/auction-winners/user/${numericUserId}`)
        if (!response.ok || cancelled) {
          if (!cancelled) setPurchaseHistory([])
          return
        }
        const result = await response.json()
        if (!result.success || !result.data || cancelled) {
          if (!cancelled) setPurchaseHistory([])
          return
        }
        const formatted = result.data.map((winner) => {
          const property = winner.property || {}
          const firstPhoto = getPropertyCardImage(
            property,
            '/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg'
          )
          return {
            id: winner.id,
            propertyId: winner.property_id,
            propertyTitle: property.title || '',
            location: property.location || property.address || '',
            purchasePrice: winner.winning_bid_amount,
            purchaseDate: winner.won_at || winner.auction_end_date,
            image:
              firstPhoto,
            currency: winner.currency || 'USD',
            winnerData: winner,
          }
        })
        if (!cancelled) setPurchaseHistory(formatted)
      } catch {
        if (!cancelled) setPurchaseHistory([])
      } finally {
        if (!cancelled) setLoadingPurchases(false)
      }
    }

    const loadRes = async () => {
      setLoadingReservations(true)
      try {
        const response = await fetch(`${API_BASE_URL}/users/${numericUserId}/reservation-purchases`)
        if (!response.ok || cancelled) {
          if (!cancelled) setReservationPurchases([])
          return
        }
        const result = await response.json()
        if (result.success && Array.isArray(result.data) && !cancelled) {
          setReservationPurchases(result.data)
        } else if (!cancelled) setReservationPurchases([])
      } catch {
        if (!cancelled) setReservationPurchases([])
      } finally {
        if (!cancelled) setLoadingReservations(false)
      }
    }

    const loadCompletedPr = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/purchase-requests/buyer/${numericUserId}?limit=200`
        )
        if (!response.ok || cancelled) return
        const result = await response.json()
        if (!result.success || !Array.isArray(result.data) || cancelled) return
        const ids = new Set()
        for (const row of result.data) {
          if (row.status === 'completed' && row.id != null) ids.add(Number(row.id))
        }
        if (!cancelled) setCompletedPurchaseRequestIds(ids)
      } catch {
        /* ignore */
      }
    }

    const loadShares = async () => {
      setLoadingShares(true)
      try {
        const response = await fetch(`${API_BASE_URL}/users/${numericUserId}/share-purchases`)
        if (!response.ok || cancelled) {
          if (!cancelled) setSharePurchases([])
          return
        }
        const result = await response.json()
        if (result.success && Array.isArray(result.data) && !cancelled) {
          setSharePurchases(result.data)
        } else if (!cancelled) setSharePurchases([])
      } catch {
        if (!cancelled) setSharePurchases([])
      } finally {
        if (!cancelled) setLoadingShares(false)
      }
    }

    loadWins()
    loadRes()
    loadCompletedPr()
    loadShares()

    return () => {
      cancelled = true
    }
  }, [numericUserId, i18nApi.language])

  const completedBuyNowReservations = useMemo(() => {
    const completed = []
    for (const row of reservationPurchases) {
      const b = row.billing || {}
      const prId = b.purchase_request_id != null ? Number(b.purchase_request_id) : null
      const isDone = prId != null && !Number.isNaN(prId) && completedPurchaseRequestIds.has(prId)
      if (isDone) completed.push(row)
    }
    return completed
  }, [reservationPurchases, completedPurchaseRequestIds])

  const formatPrice = (price, currency = 'USD') => {
    const symbol =
      getCurrencySymbol(currency)
    const n = Number(price)
    if (!Number.isFinite(n)) return '—'
    if (n >= 1000000) {
      return `${symbol}${(n / 1000000).toFixed(1)}M`
    }
    return `${symbol}${n.toLocaleString(billingLocale)}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(intlLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const loading = loadingPurchases || loadingReservations || loadingShares
  const hasAnything =
    purchaseHistory.length > 0 ||
    sharePurchases.length > 0 ||
    completedBuyNowReservations.length > 0

  if (!numericUserId) return null
  if (!loading && !hasAnything) return null

  return (
    <section className="owner-purchased" aria-label={t('ownerPurchasedTitle')}>
      <div className="owner-purchased__head">
        <h2 className="owner-purchased__title">
          <FiShoppingBag size={22} aria-hidden />
          {t('ownerPurchasedTitle')}
        </h2>
        <p className="owner-purchased__subtitle">{t('ownerPurchasedSubtitle')}</p>
      </div>

      {loading ? (
        <p className="owner-purchased__loading">{t('ownerPurchasedLoading')}</p>
      ) : (
        <div className="owner-purchased__body">
          {purchaseHistory.length > 0 && (
            <div className="owner-purchased__block">
              <h3 className="owner-purchased__block-title">{t('ownerPurchasedSectionAuctions')}</h3>
              <div className="owner-purchased__grid">
                {purchaseHistory.map((purchase) => {
                  const imageProps = buildResponsiveImageProps(purchase.image, {
                    widths: [240, 360, 540],
                    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
                    fit: 'cover',
                    quality: 72,
                    format: 'webp',
                  })
                  return (
                  <article key={purchase.id} className="owner-purchased-card">
                    <div className="owner-purchased-card__image">
                      <ImageWithSkeleton imgProps={imageProps} alt="" />
                    </div>
                    <div className="owner-purchased-card__content">
                      <h4 className="owner-purchased-card__title">
                        {purchase.propertyTitle || t('buyerHistory_fallbackProperty')}
                      </h4>
                      {purchase.location ? (
                        <p className="owner-purchased-card__meta">{purchase.location}</p>
                      ) : null}
                      <dl className="owner-purchased-card__dl">
                        <div>
                          <dt>{t('buyerWon_winningBid')}</dt>
                          <dd>{formatPrice(purchase.purchasePrice, purchase.currency)}</dd>
                        </div>
                        <div>
                          <dt>{t('buyerHistory_date')}</dt>
                          <dd>{formatDate(purchase.purchaseDate)}</dd>
                        </div>
                      </dl>
                      {purchase.propertyId != null && (
                        <Link
                          to={`/property/${purchase.propertyId}`}
                          className="owner-purchased-card__link"
                          onClick={(e) => {
                            if (ensureCanOpenProperty()) return
                            e.preventDefault()
                          }}
                        >
                          {t('buyerWon_viewProperty')}
                        </Link>
                      )}
                    </div>
                  </article>
                  )
                })}
              </div>
            </div>
          )}

          {completedBuyNowReservations.length > 0 && (
            <div className="owner-purchased__block">
              <h3 className="owner-purchased__block-title">{t('ownerPurchasedSectionBuyNowCompleted')}</h3>
              <div className="owner-purchased__grid">
                {completedBuyNowReservations.map((row) => {
                  const b = row.billing || {}
                  const pid = b.property_id
                  const minSale = b.minimum_sale_price
                  const paidStripe = (row.amount_cents || 0) / 100
                  const walletEur = b.wallet_eur_applied || 0
                  const totalPaid = b.total_paid_toward_price ?? paidStripe + walletEur
                  const remaining =
                    b.remaining_to_full_purchase ??
                    (minSale != null ? Math.max(0, minSale - totalPaid) : null)
                  const cur = (row.currency || 'eur').toUpperCase()
                  const title =
                    row.property_title ||
                    (pid != null
                      ? t('buyerHistory_propertyTitle', { id: pid })
                      : t('buyerHistory_propertyTitle', { id: '—' }))
                  const imgSrc = sharePurchaseImageSrc(row.property_image)
                  const imageProps = buildResponsiveImageProps(imgSrc, {
                    widths: [240, 360, 540],
                    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
                    fit: 'cover',
                    quality: 72,
                    format: 'webp',
                  })
                  return (
                    <article key={row.id || row.dedupe_key} className="owner-purchased-card">
                      <div className="owner-purchased-card__image">
                        <ImageWithSkeleton
                          imgProps={imageProps}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = SHARE_PURCHASE_IMAGE_PLACEHOLDER
                          }}
                        />
                      </div>
                      <div className="owner-purchased-card__content">
                        <h4 className="owner-purchased-card__title">{title}</h4>
                        <p className="owner-purchased-card__meta">{t('buyerHistory_reserveBuyNowChannel')}</p>
                        <dl className="owner-purchased-card__dl">
                          <div>
                            <dt>{t('buyerHistory_minSale')}</dt>
                            <dd>{minSale != null ? formatPrice(minSale, cur) : '—'}</dd>
                          </div>
                          <div>
                            <dt>{t('buyerHistory_totalPaid')}</dt>
                            <dd>
                              {typeof totalPaid === 'number' ? formatPrice(totalPaid, cur) : '—'}
                            </dd>
                          </div>
                          {remaining != null && (
                            <div>
                              <dt>{t('buyerHistory_remaining')}</dt>
                              <dd>{formatPrice(remaining, cur)}</dd>
                            </div>
                          )}
                          {walletEur > 0 && (
                            <div>
                              <dt>{t('buyerHistory_fromWallet')}</dt>
                              <dd>€{walletEur.toLocaleString(billingLocale)}</dd>
                            </div>
                          )}
                          <div>
                            <dt>{t('buyerHistory_date')}</dt>
                            <dd>{formatDate(row.paid_at)}</dd>
                          </div>
                        </dl>
                        {pid != null && (
                          <Link
                            to={`/property/${pid}`}
                            className="owner-purchased-card__link"
                            onClick={(e) => {
                              if (ensureCanOpenProperty()) return
                              e.preventDefault()
                            }}
                          >
                            {t('buyerHistory_openProperty')}
                          </Link>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}

          {sharePurchases.length > 0 && (
            <div className="owner-purchased__block">
              <h3 className="owner-purchased__block-title">{t('ownerPurchasedSectionShares')}</h3>
              <div className="owner-purchased__grid">
                {sharePurchases.map((row) => {
                  const cur = (row.currency || 'USD').toUpperCase()
                  const shareTo = getCoInvestmentDetailPath({
                    id: row.property_id,
                    property_type: row.property_type,
                  })
                  const title =
                    row.property_title || t('buyerHistory_propertyTitle', { id: row.property_id })
                  const imgSrc = sharePurchaseImageSrc(row.property_image)
                  const imageProps = buildResponsiveImageProps(imgSrc, {
                    widths: [240, 360, 540],
                    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
                    fit: 'cover',
                    quality: 72,
                    format: 'webp',
                  })
                  return (
                    <article key={row.id} className="owner-purchased-card owner-purchased-card--share">
                      <div className="owner-purchased-card__image">
                        <ImageWithSkeleton
                          imgProps={imageProps}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = SHARE_PURCHASE_IMAGE_PLACEHOLDER
                          }}
                        />
                        <span className="owner-purchased-card__share-tag">{t('buyerHistory_shareBadge')}</span>
                      </div>
                      <div className="owner-purchased-card__content">
                        <h4 className="owner-purchased-card__title">{title}</h4>
                        {(row.property_location || row.property_type) && (
                          <p className="owner-purchased-card__meta">
                            {[row.property_location, row.property_type].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <dl className="owner-purchased-card__dl">
                          <div>
                            <dt>{t('buyerHistory_sharesBought')}</dt>
                            <dd>{row.shares_count}</dd>
                          </div>
                          <div>
                            <dt>{t('buyerHistory_pricePerShare')}</dt>
                            <dd>{formatPrice(row.price_per_share, cur)}</dd>
                          </div>
                          <div>
                            <dt>{t('buyerHistory_totalPaidShares')}</dt>
                            <dd>{formatPrice(row.total_price, cur)}</dd>
                          </div>
                          <div>
                            <dt>{t('buyerHistory_date')}</dt>
                            <dd>{formatDate(row.purchase_date)}</dd>
                          </div>
                        </dl>
                        <Link to={shareTo} className="owner-purchased-card__link">
                          {t('buyerHistory_shareOpenObject')}
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
