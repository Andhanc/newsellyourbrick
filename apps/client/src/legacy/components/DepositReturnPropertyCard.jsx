import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMapPin } from 'react-icons/fi'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { validateBuyerReturnPath } from '../utils/buyerReturnContext'
import { appendViewerUserIdToPropertyApiUrl } from '../utils/propertyDetailUrl'
import { applyPropertyImageFallback, getPropertyCardImage, PROPERTY_CARD_IMAGE_FALLBACK } from '../utils/propertyImage'
import { formatPropertyPrice } from '../utils/currency'

export default function DepositReturnPropertyCard({ path }) {
  const { t, i18n } = useTranslation()
  const [result, setResult] = useState(null)
  const language = i18n.language || 'ru'

  useEffect(() => {
    const controller = new AbortController()
    const normalizedPath = validateBuyerReturnPath(path, { fallback: null })
    if (!normalizedPath?.startsWith('/property/')) return undefined
    const url = new URL(normalizedPath, window.location.origin)
    const propertyKey = decodeURIComponent(url.pathname.slice('/property/'.length))
    const params = new URLSearchParams({ lang: language.split('-')[0] })
    const propertyType = url.searchParams.get('property_type')
    if (propertyType) params.set('property_type', propertyType)
    const endpoint = appendViewerUserIdToPropertyApiUrl(
      `${getApiBaseUrlSync()}/properties/${encodeURIComponent(propertyKey)}?${params}`,
    )

    const load = async () => {
      try {
        const response = await fetch(endpoint, { signal: controller.signal })
        if (!response.ok) throw new Error('Property unavailable')
        const payload = await response.json()
        if (!controller.signal.aborted) {
          setResult({ path, language, property: payload.success ? payload.data : null })
        }
      } catch {
        if (!controller.signal.aborted) setResult({ path, language, property: null })
      }
    }
    void load()
    return () => controller.abort()
  }, [path, language])

  if (result?.path !== path || result?.language !== language) {
    return <div className="deposit-return-property deposit-return-property--loading" aria-busy="true" aria-label={t('loading')}>
      <div className="deposit-return-property__skeleton-photo" />
      <div className="deposit-return-property__skeleton-copy"><span /><span /></div>
    </div>
  }

  const property = result.property
  if (!property) return null
  const title = property.title || property.name || t('walletPage_strategyReturnCta')
  const location = property.location || property.address || [property.city, property.country].filter(Boolean).join(', ')
  const isAuction = [true, 1, '1'].includes(property.is_auction) || property.isAuction === true || property.sale_type === 'auction'
  const amount = isAuction
    ? [property.currentBid, property.current_bid, property.auction_starting_price].find((value) => Number(value) > 0)
    : property.price
  const price = Number(amount) > 0 ? formatPropertyPrice(amount, property.currency || 'EUR', { locale: language }) : null
  const area = Number(property.area || property.total_area || property.sqft)

  return (
    <article className="deposit-return-property">
      <div className="deposit-return-property__media">
        <img
          src={getPropertyCardImage(property, PROPERTY_CARD_IMAGE_FALLBACK)}
          alt=""
          decoding="async"
          onError={applyPropertyImageFallback}
        />
        <span className="deposit-return-property__badge">{t('walletPage_strategySelectedProperty')}</span>
        {Number.isFinite(area) && area > 0 ? (
          <span className="deposit-return-property__area">{area.toLocaleString(language)} {t('squareMeters')}</span>
        ) : null}
      </div>
      <div className="deposit-return-property__content">
        <h3>{title}</h3>
        {location ? <div className="deposit-return-property__location"><FiMapPin aria-hidden="true" /><span>{location}</span></div> : null}
        {price ? (
          <div className="deposit-return-property__price">
            <span>{t(isAuction ? 'currentBid' : 'propertyDetailObjectPrice')}</span>
            <strong>{price}</strong>
          </div>
        ) : null}
      </div>
    </article>
  )
}
