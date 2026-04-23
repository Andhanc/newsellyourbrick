import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { useTranslation } from 'react-i18next'
import { FiSearch } from 'react-icons/fi'
import { ShieldQuestionMark, ShieldAlert, ShieldCheck } from 'lucide-react'
import Header from '../components/Header'
import DepositButton from '../components/DepositButton'
import FlipCard from '../components/ui/FlipCard'
import { useLazyLoad } from '../hooks/useLazyLoad'
import PropertyTimer from '../components/PropertyTimer'
import CircularTimer from '../components/CircularTimer'
import AuctionMobileLayout from '../components/ui/AuctionMobileLayout'
import { hasBuyNowOption } from '../utils/hasBuyNowOption'
import { getPropertyCardImage } from '../utils/propertyImage'
import { fetchUserDeposit } from '../utils/depositApi'
import { fetchNumericDbUserIdForApi, getStoredNumericUserId } from '../services/authService'
import './Shares.css'
import '../components/PropertyList.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const MOBILE_BREAKPOINT = 768

const Debts = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [openRiskCard, setOpenRiskCard] = useState(null)
  const [apiDebts, setApiDebts] = useState([])
  const [loadingDebts, setLoadingDebts] = useState(true)
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const [userDeposit, setUserDeposit] = useState(0)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
      if (!cancelled && id) setDbUserId(id)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!dbUserId) return
    let cancelled = false
    ;(async () => {
      try {
        const deposit = await fetchUserDeposit(API_BASE, dbUserId, { ttlMs: 15000 })
        if (!cancelled && deposit && typeof deposit.depositAmount === 'number') {
          setUserDeposit(deposit.depositAmount || 0)
        }
      } catch {
        if (!cancelled) setUserDeposit(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dbUserId])

  const loadDebts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/properties/debts`)
      const json = await (res.ok ? res.json() : { success: false, data: [] })
      if (json.success && Array.isArray(json.data)) {
        const isDebtRecord = (p) => {
          if (!p) return false
          if (p.sale_type === 'debt') return true
          if (p.is_debt === 1 || p.is_debt === true) return true
          if (p.has_debt === 1 || p.has_debt === true) return true
          if (p.debt_amount != null && p.debt_amount !== '' && !Number.isNaN(Number(p.debt_amount))) return true
          if (typeof p.debt_severity === 'string' && ['red', 'yellow', 'green'].includes(p.debt_severity)) return true
          return false
        }

        const mapped = json.data.filter(isDebtRecord).map((p) => {
          const image = getPropertyCardImage(
            p,
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
          )
          const location = p.location || [p.city, p.country].filter(Boolean).join(', ') || ''
          const priceNumber = p.price != null && p.price !== '' ? Number(p.price) : 0
          const debtAmount = p.debt_amount != null && p.debt_amount !== '' ? Number(p.debt_amount) : null
          const currentBidRaw =
            p.currentBid ??
            p.auction_current_bid ??
            p.auctionCurrentBid ??
            p.auction_starting_price ??
            p.auctionStartingPrice ??
            null
          const currentBid = currentBidRaw != null && currentBidRaw !== '' ? Number(currentBidRaw) : null

          const endTime =
            p.endTime ??
            p.auction_end_time ??
            p.auctionEndTime ??
            p.auction_end_date ??
            p.auctionEndDate ??
            null

          return {
            ...p,
            id: p.id,
            title: p.title || p.name || '',
            location,
            image,
            images: image ? [image] : [],
            price: priceNumber,
            debt_amount: debtAmount,
            currentBid,
            area: p.area || p.sqft || 0,
            rooms: p.rooms || p.bedrooms || 0,
            endTime,
            isAuction:
              p.isAuction === true ||
              p.is_auction === 1 ||
              p.is_auction === true ||
              (endTime != null && endTime !== '') ||
              (p.test_timer_end_date != null && p.test_timer_end_date !== ''),
            sale_type: p.sale_type || 'debt',
            is_debt: p.is_debt ?? 1,
            has_debt: p.has_debt ?? 1,
          }
        })
        setApiDebts(mapped)
      } else {
        setApiDebts([])
      }
    } catch (_) {
      setApiDebts([])
    } finally {
      setLoadingDebts(false)
    }
  }, [])

  const [debtsSectionRef] = useLazyLoad(loadDebts, { rootMargin: '200px' })

  const filtered = apiDebts.filter(
    (obj) =>
      !searchQuery ||
      (obj.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (obj.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatPrice = (n) => {
    if (!n || Number.isNaN(Number(n))) return '—'
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    return `$${Number(n).toLocaleString('en-US')}`
  }

  return (
    <div className="shares-page">
      <Header />
      <div className="shares-page__bg" />
      <main ref={debtsSectionRef} className="shares-container">
        <div className="shares-flip-cards shares-flip-cards--debts">
          <FlipCard
            color="#DC2626"
            icon={ShieldQuestionMark}
            title={t('debtsHighRisk')}
            subtitle={t('debtsHighRiskSubtitle')}
            description={t('debtsHighRiskDescription')}
            features={[
              t('debtsHighRiskFeature1'),
              t('debtsHighRiskFeature2'),
              t('debtsHighRiskFeature3'),
              t('debtsHighRiskFeature4'),
            ]}
            ctaText={t('debtsHighRiskCta')}
            clickToFlip
            isFlipped={openRiskCard === 'high'}
            onFlipChange={(next) => setOpenRiskCard(next ? 'high' : null)}
          />
          <FlipCard
            color="#CA8A04"
            icon={ShieldAlert}
            title={t('debtsMediumRisk')}
            subtitle={t('debtsMediumRiskSubtitle')}
            description={t('debtsMediumRiskDescription')}
            features={[
              t('debtsMediumRiskFeature1'),
              t('debtsMediumRiskFeature2'),
              t('debtsMediumRiskFeature3'),
              t('debtsMediumRiskFeature4'),
            ]}
            ctaText={t('debtsMediumRiskCta')}
            clickToFlip
            isFlipped={openRiskCard === 'medium'}
            onFlipChange={(next) => setOpenRiskCard(next ? 'medium' : null)}
          />
          <FlipCard
            color="#16A34A"
            icon={ShieldCheck}
            title={t('debtsLowRisk')}
            subtitle={t('debtsLowRiskSubtitle')}
            description={t('debtsLowRiskDescription')}
            features={[
              t('debtsLowRiskFeature1'),
              t('debtsLowRiskFeature2'),
              t('debtsLowRiskFeature3'),
              t('debtsLowRiskFeature4'),
            ]}
            ctaText={t('debtsLowRiskCta')}
            clickToFlip
            isFlipped={openRiskCard === 'low'}
            onFlipChange={(next) => setOpenRiskCard(next ? 'low' : null)}
          />
        </div>

        <div className="shares-search-bar">
          <FiSearch className="shares-search-bar__icon" size={20} />
          <input
            type="text"
            className="shares-search-bar__input"
            placeholder={t('searchPlaceholderLong')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="shares-search-bar__clear"
              onClick={() => setSearchQuery('')}
              aria-label={t('clearSearch')}
            >
              ×
            </button>
          )}
        </div>

        <div className="shares-grid">
          {loadingDebts && (
            <div className="shares-no-results">
              <p>{t('debtsLoading')}</p>
            </div>
          )}

          {!loadingDebts && filtered.length === 0 && (
            <div className="shares-no-results">
              <p>{t('debtsEmpty')}</p>
            </div>
          )}

          {!loadingDebts && filtered.length > 0 && (
            <>
              {isMobile ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="properties-grid properties-grid--mobile-auction">
                    <AuctionMobileLayout
                      properties={filtered}
                      formatPrice={formatPrice}
                      isFavorite={() => false}
                      onFavoriteToggle={() => false}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div id="properties-grid" className="properties-grid">
                    {filtered.map((property) => {
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
                      const isReserved = property.is_reserved === true || property.is_reserved === 1
                      const showBuyNow = hasBuyNowOption(property)

                      const greenTimerBlock =
                        hasTimer && !isReserved && !hasTestTimer && property.endTime ? (
                          <div className="property-timer-wrapper">
                            <PropertyTimer endTime={property.endTime} compact={true} />
                          </div>
                        ) : null

                      const redTimerBlock =
                        hasTimer && !isReserved && hasTestTimer ? (
                          <div className="property-timer-wrapper">
                            <CircularTimer
                              endTime={property.test_timer_end_date}
                              size={120}
                              strokeWidth={6}
                            />
                          </div>
                        ) : null

                      const hasDebtAmount =
                        property.debt_amount != null &&
                        property.debt_amount !== '' &&
                        !Number.isNaN(Number(property.debt_amount))

                      return (
                        <div
                          key={property.id}
                          className="property-card"
                          onClick={(e) => {
                            if (e.target.closest('button') || e.target.closest('a')) return
                            if (!ensureCanOpenProperty()) return
                            navigate(`/property/${property.id}`, { state: { property } })
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="property-link">
                            <div className="property-image-container">
                              <img src={propertyImage} alt={propertyTitle} className="property-image" />
                              {isReserved && (
                                <div className="property-reserved-overlay">
                                  <div className="reserved-overlay-icon">🔒</div>
                                  <div className="reserved-overlay-text">{t('reserved')}</div>
                                </div>
                              )}
                              {!isReserved && showBuyNow && (
                                <div className="property-badges-center">
                                  <div className="property-buy-badge">
                                    <span>{t('buyNowSectionTitle')}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="property-content">
                              {greenTimerBlock}
                              {redTimerBlock}
                              <h3 className="property-title">{propertyTitle}</h3>
                              <p className="property-location">{property.location || ''}</p>

                              <div className="property-content-bottom">
                                <div className="property-bid-info" style={{ display: 'grid', gap: 6 }}>
                                  {hasDebtAmount && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                      <span className="bid-label">{t('debtsDebtAmount')}</span>
                                      <span className="bid-value">{formatPrice(property.debt_amount)}</span>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                    <span className="bid-label">{t('currentBid')}</span>
                                    <span className="bid-value">
                                      {formatPrice(property.currentBid || property.price || 0)}
                                    </span>
                                  </div>
                                </div>

                                <div className="property-actions" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-liquid-glass"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      if (!ensureCanOpenProperty()) return
                                      navigate(`/property/${property.id}`, { state: { property } })
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
                                        if (!ensureCanOpenProperty()) return
                                        navigate(`/property/${property.id}`, { state: { property } })
                                      }}
                                      disabled={isReserved}
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
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <div className="shares-floats">
        {dbUserId ? <DepositButton amount={userDeposit} /> : null}
        <button
          type="button"
          className="ai-button"
          onClick={() => navigate('/chat')}
          aria-label="AI Assistant"
        >
          AI
        </button>
      </div>
    </div>
  )
}

export default Debts

