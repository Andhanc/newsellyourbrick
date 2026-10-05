import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiArrowUp, FiLock, FiPlus, FiX } from 'react-icons/fi'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'
import { getAuctionMinBidStep } from '../utils/auctionBidStep'
import { normalizePropertyMediaFields } from '../utils/propertyImage'
import AuctionBidCeilingModal from './AuctionBidCeilingModal'
import PropertyCurrencySelector, {
  PropertyCurrencyInputTrigger,
} from './PropertyCurrencySelector'
import './AuctionBidDrawer.css'

const FALLBACK_BID_PHOTO = '/images/external/photo-1505691938895-1758d7feb511-f43679f6a1.jpg'
const AUCTION_BID_MISSION_ART = '/images/auction-bid-drawer/auction-bid-mission.png'
const AUCTION_BID_COIN_ART = '/images/auction-bid-drawer/syb-coin-a.png'
const AUCTION_BID_TROPHY_ART = '/images/auction-bid-drawer/syb-trophy.png'
const BID_CELEBRATE_MS = 5200
const BID_SUCCESS_COINS = [
  { id: 'c1', left: '5%', top: '-14%', size: '92px', delay: '0s', duration: '4.8s', rot: '210deg', rotStart: '-32deg', x: '-18px', fall: '108vh' },
  { id: 'c2', left: '74%', top: '16%', size: '76px', delay: '0.12s', duration: '4.2s', rot: '-180deg', rotStart: '18deg', x: '16px', fall: '86vh' },
  { id: 'c3', left: '20%', top: '3%', size: '84px', delay: '0.28s', duration: '4.5s', rot: '165deg', rotStart: '-12deg', x: '22px', fall: '96vh' },
  { id: 'c4', left: '86%', top: '-22%', size: '98px', delay: '0.06s', duration: '5s', rot: '-200deg', rotStart: '26deg', x: '-14px', fall: '118vh' },
  { id: 'c5', left: '7%', top: '34%', size: '70px', delay: '0.2s', duration: '3.8s', rot: '190deg', rotStart: '-20deg', x: '18px', fall: '72vh' },
  { id: 'c6', left: '58%', top: '11%', size: '88px', delay: '0.36s', duration: '4.6s', rot: '-150deg', rotStart: '10deg', x: '-10px', fall: '90vh' },
  { id: 'c7', left: '39%', top: '44%', size: '68px', delay: '0.16s', duration: '3.6s', rot: '140deg', rotStart: '-8deg', x: '8px', fall: '64vh' },
]

function toListingPhotoUrl(value) {
  const raw = typeof value === 'string' ? value : value?.url
  if (!raw) return ''
  try {
    if (raw.startsWith('/uploads/') || raw.startsWith('/images/')) return raw
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw)
      if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/images/')) {
        return `${parsed.pathname}${parsed.search}`
      }
    }
  } catch {
    return raw
  }
  return raw
}

function listingPhotoUrls(displayProperty) {
  const normalized = normalizePropertyMediaFields(displayProperty || {}).images
  const raw = Array.isArray(displayProperty?.images) ? displayProperty.images : []
  const fromListing = raw.map(toListingPhotoUrl).filter(Boolean)
  const images = fromListing.length ? fromListing : normalized.map(toListingPhotoUrl).filter(Boolean)
  const withoutMarks = images.filter((url) => {
    const name = String(url).toLowerCase()
    return !/(?:^|\/)[^/?]*logo[^/?]*\.(?:png|svg|webp|jpe?g)(?:$|\?)/i.test(name)
  })
  const list = withoutMarks.length ? withoutMarks : images
  return list.length ? list : [FALLBACK_BID_PHOTO]
}

export default function PropertyDetailAuctionBiddingForm({
  isAuctionProperty,
  displayProperty,
  currentBid,
  priceAnimation,
  fmtBidPrice,
  isReservedActive,
  kycBidBlocked,
  isOwnListing = false,
  paymentActionsLocked,
  currencyView,
  getQuickBidAmounts,
  formatQuickBidLabel,
  handleQuickBid,
  isSubmittingBid,
  isUserLeader,
  disableAuctionBidFields,
  notifyListingCurrencyOnly,
  bidAmountInputValue,
  handleBidAmountChange,
  bidAmount,
  handleBidSubmit,
  auctionEndedForSidebar,
  showCurrencySelector = false,
  alwaysShowCurrentBid = false,
  showSubmitButton = true,
  showBidCeilingButton = false,
  onOpenBidCeiling,
  bidCeilingActive = false,
  bidCeilingModalProps = null,
  onOpenBidHistory = null,
  bidCelebrateToken = 0,
  celebrateBid = false,
  suppressCurrentBidDisplay = false,
  layout = 'default',
  variant = 'default',
}) {
  const { t } = useTranslation()
  const isPanelLayout = layout === 'panel'
  const isQuickButtonsOnly = variant === 'desktop-v3-quick'
  const isActionsOnly = variant === 'desktop-v3-actions'
  const isSplitDesktopVariant = isQuickButtonsOnly || isActionsOnly
  const [kycBannerDismissed, setKycBannerDismissed] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [bidMode, setBidMode] = useState('auction')

  const listingTitle = displayProperty?.title || displayProperty?.name || ''
  const listingPhotos = useMemo(
    () => listingPhotoUrls(displayProperty),
    [displayProperty],
  )

  useEffect(() => {
    setPhotoIndex(0)
    setBidMode('auction')
  }, [displayProperty?.id, listingPhotos[0]])

  const activePhoto = listingPhotos[Math.min(photoIndex, listingPhotos.length - 1)]
  const thumbItems = useMemo(() => {
    const maxVisible = 5
    if (listingPhotos.length <= maxVisible) {
      return listingPhotos.map((url, index) => ({ url, index, moreCount: 0 }))
    }
    return listingPhotos.slice(0, maxVisible).map((url, index) => ({
      url,
      index,
      moreCount: index === maxVisible - 1 ? listingPhotos.length - maxVisible : 0,
    }))
  }, [listingPhotos])
  const photoSwipe = useHorizontalSwipe({
    enabled: isPanelLayout && listingPhotos.length > 1,
    onSwipeLeft: () => setPhotoIndex((prev) => (prev + 1) % listingPhotos.length),
    onSwipeRight: () =>
      setPhotoIndex((prev) => (prev - 1 + listingPhotos.length) % listingPhotos.length),
  })
  const catalogPrice = fmtBidPrice(
    currentBid !== null
      ? currentBid
      : isAuctionProperty
        ? displayProperty?.currentBid || displayProperty?.auction_starting_price || 0
        : displayProperty?.price || 0,
  )
  const showModeSwitch = isPanelLayout && showBidCeilingButton && Boolean(bidCeilingModalProps || onOpenBidCeiling)
  const embedBidCeiling = Boolean(isPanelLayout && bidCeilingModalProps)

  const startingPrice = displayProperty?.auction_starting_price || 0
  const hideCurrentBid =
    suppressCurrentBidDisplay ||
    (!alwaysShowCurrentBid &&
      isAuctionProperty &&
      currentBid !== null &&
      currentBid !== startingPrice)

  const showBidding =
    !isAuctionProperty || !auctionEndedForSidebar

  const renderQuickBidButtons = (extraClassName = '') => (
    <div className={`bidding-section__quick-buttons${extraClassName ? ` ${extraClassName}` : ''}`}>
      {getQuickBidAmounts().map((amount, index) => (
        <button
          key={index}
          type="button"
          className={`bidding-section__quick-btn${
            paymentActionsLocked ? ' bidding-section__quick-btn--preview' : ''
          }`}
          onClick={() => handleQuickBid(amount)}
          disabled={isSubmittingBid || isUserLeader || disableAuctionBidFields}
          style={{
            opacity: disableAuctionBidFields ? 0.5 : 1,
            cursor:
              disableAuctionBidFields || paymentActionsLocked ? 'not-allowed' : 'pointer',
          }}
        >
          <span className="bidding-section__quick-btn-shine" aria-hidden />
          <span className="bidding-section__quick-btn-label">{formatQuickBidLabel(amount)}</span>
        </button>
      ))}
    </div>
  )

  const renderMinBidHint = (className = 'bidding-section__min-hint') => {
    if (!isAuctionProperty || isUserLeader || isReservedActive) return null
    const effectiveCurrentBid =
      currentBid !== null ? currentBid : displayProperty.currentBid || startingPrice
    const step = getAuctionMinBidStep(effectiveCurrentBid)
    const minBid = effectiveCurrentBid + step
    const hint = t('propertyDetailMinBidHint', {
      min: fmtBidPrice(minBid),
    })

    if (isPanelLayout) {
      return (
        <div className={className} role="note">
          <ShieldCheck size={16} strokeWidth={2.25} aria-hidden />
          <span>{hint}</span>
        </div>
      )
    }

    return <p className={className}>{hint}</p>
  }

  const renderInputCurrency = () => {
    if (showCurrencySelector && isPanelLayout) {
      return (
        <PropertyCurrencyInputTrigger
          baseCurrency={currencyView.baseCurrency}
          displayCurrency={currencyView.displayCurrency}
          onChange={currencyView.setDisplayCurrency}
          options={currencyView.options}
          loading={currencyView.loading}
          isConverted={currencyView.isConverted}
          disabled={paymentActionsLocked}
          onLockedClick={() => notifyListingCurrencyOnly('bid')}
          compact
        />
      )
    }

    return (
      <span className="bidding-section__currency">
        {paymentActionsLocked ? currencyView.symbol : currencyView.baseSymbol}
      </span>
    )
  }

  const renderPanelSubmitLabel = () => {
    if (isSubmittingBid) return t('propertyDetailSubmitting')
    if (isOwnListing) return t('propertyDetail_ownListingCta')
    if (isUserLeader) return t('propertyDetailYouAreWinning')
    if (isReservedActive) return t('objectReserved')
    return t('placeBid')
  }

  const winningBidAmount =
    currentBid !== null
      ? currentBid
      : displayProperty?.currentBid ?? displayProperty?.auction_starting_price ?? 0

  const celebrateOverlay =
    isPanelLayout && celebrateBid && typeof document !== 'undefined' ? (
    <div className="auction-bid-celebrate-layer" key={bidCelebrateToken}>
      <div className="auction-bid-coins" aria-hidden>
        {BID_SUCCESS_COINS.map((coin) => (
          <span
            key={coin.id}
            className="auction-bid-coin"
            style={{
              '--coin-left': coin.left,
              '--coin-top': coin.top,
              '--coin-size': coin.size,
              '--coin-delay': coin.delay,
              '--coin-duration': coin.duration,
              '--coin-rot': coin.rot,
              '--coin-rot-start': coin.rotStart,
              '--coin-x': coin.x,
              '--coin-fall': coin.fall,
            }}
          >
            <img
              src={AUCTION_BID_COIN_ART}
              alt=""
              className="auction-bid-coin__img"
            />
          </span>
        ))}
      </div>
      <div className="auction-bid-rise" role="status">
        <div className="auction-bid-rise__stack">
          <div className="auction-bid-rise__card">
            <span className="auction-bid-rise__arrow" aria-hidden>
              <FiArrowUp size={22} strokeWidth={2.75} />
            </span>
            <p className="auction-bid-rise__amount">{fmtBidPrice(winningBidAmount)}</p>
          </div>
          {onOpenBidHistory ? (
            <button
              type="button"
              className="auction-bid-history-link"
              onClick={onOpenBidHistory}
            >
              {t('auctionBidDrawerHistoryLink')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {celebrateOverlay ? createPortal(celebrateOverlay, document.body) : null}
      {showCurrencySelector && !isPanelLayout && !isSplitDesktopVariant && (
        <div className="property-detail-mobile-card__bid-header">
          <PropertyCurrencySelector
            baseCurrency={currencyView.baseCurrency}
            displayCurrency={currencyView.displayCurrency}
            onChange={currencyView.setDisplayCurrency}
            options={currencyView.options}
            loading={currencyView.loading}
            isConverted={currencyView.isConverted}
          />
        </div>
      )}

      {isPanelLayout ? (
        <div className="property-detail-sidebar__current-bid property-detail-sidebar__current-bid--auction-stage">
          <div className="auction-bid-hero">
            <div
              className={`auction-bid-hero__art${celebrateBid ? ' auction-bid-hero__art--celebrate' : ''}`}
              {...photoSwipe}
            >
              <img
                src={activePhoto}
                alt={listingTitle}
                className="auction-bid-hero__img"
                width="1600"
                height="1200"
                decoding="async"
              />
              {listingPhotos.length > 1 ? (
                <span className="auction-bid-hero__count">
                  {photoIndex + 1} / {listingPhotos.length}
                </span>
              ) : null}
              {listingPhotos.length > 1 ? (
                <div
                  className="auction-bid-thumbs"
                  role="tablist"
                  aria-label={t('auctionBidDrawerPhotosLabel')}
                >
                  {thumbItems.map(({ url, index, moreCount }) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      role="tab"
                      aria-selected={index === photoIndex}
                      className={`auction-bid-thumbs__btn${
                        index === photoIndex ? ' auction-bid-thumbs__btn--active' : ''
                      }`}
                      onClick={() => setPhotoIndex(index)}
                      aria-label={`${index + 1} / ${listingPhotos.length}`}
                    >
                      <img src={url} alt="" />
                      {moreCount > 0 ? (
                        <span className="auction-bid-thumbs__more">+{moreCount}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : !hideCurrentBid && !isQuickButtonsOnly ? (
        <div className="property-detail-sidebar__current-bid">
          <span className="current-bid-label">
            {isAuctionProperty
              ? t('propertyDetailCurrentMaxBid')
              : t('propertyDetailObjectPrice')}
          </span>
          <div
            className={`current-bid-value-wrapper ${priceAnimation ? 'current-bid-value-wrapper--animated' : ''}`}
            aria-live="polite"
          >
            <span className="current-bid-value">
              {fmtBidPrice(
                currentBid !== null
                  ? currentBid
                  : isAuctionProperty
                    ? displayProperty.auction_starting_price || 0
                    : displayProperty.price || 0,
              )}
            </span>
          </div>
        </div>
      ) : null}

      {showBidding && (
        <div className="property-detail-sidebar__bidding-section">
          {!isPanelLayout && !isSplitDesktopVariant && isOwnListing && (
            <div className="property-detail-own-listing-notice" role="status">
              {t('propertyDetail_ownListingCannotBid')}
            </div>
          )}
          {!isPanelLayout && !isSplitDesktopVariant && isReservedActive && !isOwnListing && (
            <div className="property-detail-bidding-reserved-notice">
              <FiLock size={16} />
              <span>{t('propertyDetailBidsUnavailableReserved')}</span>
            </div>
          )}
          {!isPanelLayout && !isSplitDesktopVariant && !isReservedActive && kycBidBlocked && (
            <div className="auction-verification-pending-banner" role="status">
              {t('propertyDetailBidVerificationPending')}
            </div>
          )}
          {paymentActionsLocked && !isPanelLayout && !isSplitDesktopVariant ? (
            <p className="property-detail-sidebar__bids-currency-note" role="note">
              {t('propertyDetailBidsListingCurrency', { currency: currencyView.baseCurrency })}
            </p>
          ) : null}

          {!isPanelLayout ? (
            isQuickButtonsOnly ? (
              renderQuickBidButtons()
            ) : isActionsOnly ? (
              <>
                <div
                  className={`bidding-section__input-wrapper${
                    paymentActionsLocked ? ' bidding-section__input-wrapper--preview' : ''
                  }`}
                  onClick={() => {
                    if (paymentActionsLocked) notifyListingCurrencyOnly('bid')
                  }}
                  onKeyDown={(e) => {
                    if (paymentActionsLocked && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      notifyListingCurrencyOnly('bid')
                    }
                  }}
                  role={paymentActionsLocked ? 'button' : undefined}
                  tabIndex={paymentActionsLocked ? 0 : undefined}
                >
                  {renderInputCurrency()}
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    readOnly={paymentActionsLocked}
                    className="bidding-section__input"
                    placeholder={
                      isUserLeader
                        ? t('propertyDetailYouAreLeading')
                        : isReservedActive
                          ? t('objectReserved')
                          : t('propertyDetailEnterBidAmount')
                    }
                    value={bidAmountInputValue}
                    onChange={handleBidAmountChange}
                    disabled={isSubmittingBid || isUserLeader || disableAuctionBidFields}
                    style={{
                      opacity: disableAuctionBidFields ? 0.5 : 1,
                      cursor:
                        disableAuctionBidFields || paymentActionsLocked ? 'not-allowed' : 'text',
                    }}
                  />
                </div>

                {showSubmitButton ? (
                  <div className="bidding-section__submit-row">
                    <button
                      type="button"
                      className={`bidding-section__submit-btn ${isUserLeader ? 'bidding-section__submit-btn--winner' : ''}${
                        paymentActionsLocked ? ' bidding-section__submit-btn--preview' : ''
                      }`}
                      onClick={handleBidSubmit}
                      disabled={
                        isSubmittingBid ||
                        (!paymentActionsLocked && !bidAmount) ||
                        isUserLeader ||
                        disableAuctionBidFields
                      }
                      style={{
                        opacity: disableAuctionBidFields ? 0.5 : 1,
                        cursor:
                          disableAuctionBidFields || paymentActionsLocked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {renderPanelSubmitLabel()}
                    </button>
                    {showBidCeilingButton && onOpenBidCeiling ? (
                      <button
                        type="button"
                        className={`bidding-section__ceiling-btn${
                          bidCeilingActive ? ' bidding-section__ceiling-btn--active' : ''
                        }`}
                        onClick={onOpenBidCeiling}
                        disabled={disableAuctionBidFields || isReservedActive}
                        aria-label={t('auctionBidCeilingButtonAria')}
                        title={t('auctionBidCeilingButtonAria')}
                      >
                        <FiPlus size={22} strokeWidth={2.5} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
            <>
              {renderQuickBidButtons()}
              {renderMinBidHint()}

              <div
                className={`bidding-section__input-wrapper${
                  paymentActionsLocked ? ' bidding-section__input-wrapper--preview' : ''
                }`}
                onClick={() => {
                  if (paymentActionsLocked) notifyListingCurrencyOnly('bid')
                }}
                onKeyDown={(e) => {
                  if (paymentActionsLocked && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    notifyListingCurrencyOnly('bid')
                  }
                }}
                role={paymentActionsLocked ? 'button' : undefined}
                tabIndex={paymentActionsLocked ? 0 : undefined}
              >
                <span className="bidding-section__currency">
                  {paymentActionsLocked ? currencyView.symbol : currencyView.baseSymbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  readOnly={paymentActionsLocked}
                  className="bidding-section__input"
                  placeholder={
                    isUserLeader
                      ? t('propertyDetailYouAreLeading')
                      : isReservedActive
                        ? t('objectReserved')
                        : t('propertyDetailEnterBidAmount')
                  }
                  value={bidAmountInputValue}
                  onChange={handleBidAmountChange}
                  disabled={isSubmittingBid || isUserLeader || disableAuctionBidFields}
                  style={{
                    opacity: disableAuctionBidFields ? 0.5 : 1,
                    cursor:
                      disableAuctionBidFields || paymentActionsLocked ? 'not-allowed' : 'text',
                  }}
                />
              </div>

              {showSubmitButton && (
                <div className="bidding-section__submit-row">
                  <button
                    type="button"
                    className={`bidding-section__submit-btn ${isUserLeader ? 'bidding-section__submit-btn--winner' : ''}${
                      paymentActionsLocked ? ' bidding-section__submit-btn--preview' : ''
                    }`}
                    onClick={handleBidSubmit}
                    disabled={
                      isSubmittingBid ||
                      (!paymentActionsLocked && !bidAmount) ||
                      isUserLeader ||
                      disableAuctionBidFields
                    }
                    style={{
                      opacity: disableAuctionBidFields ? 0.5 : 1,
                      cursor:
                        disableAuctionBidFields || paymentActionsLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {renderPanelSubmitLabel()}
                  </button>
                  {showBidCeilingButton && onOpenBidCeiling ? (
                    <button
                      type="button"
                      className={`bidding-section__ceiling-btn${
                        bidCeilingActive ? ' bidding-section__ceiling-btn--active' : ''
                      }`}
                      onClick={onOpenBidCeiling}
                      disabled={disableAuctionBidFields || isReservedActive}
                      aria-label={t('auctionBidCeilingButtonAria')}
                      title={t('auctionBidCeilingButtonAria')}
                    >
                      <FiPlus size={22} strokeWidth={2.5} aria-hidden />
                    </button>
                  ) : null}
                </div>
              )}
            </>
            )
          ) : (
            <>
              {!isReservedActive && kycBidBlocked && !kycBannerDismissed ? (
                <div
                  className="auction-verification-pending-banner auction-verification-pending-banner--panel"
                  role="status"
                >
                  <span className="auction-verification-pending-banner--panel__icon" aria-hidden>
                    <ShieldCheck size={18} strokeWidth={2.25} />
                  </span>
                  <p className="auction-verification-pending-banner--panel__text">
                    {t('propertyDetailBidVerificationPending')}
                  </p>
                  <button
                    type="button"
                    className="auction-verification-pending-banner--panel__close"
                    onClick={() => setKycBannerDismissed(true)}
                    aria-label={t('close')}
                  >
                    <FiX size={18} aria-hidden />
                  </button>
                </div>
              ) : null}

              <div className="auction-bid-catalog">
                {listingTitle ? (
                  <h3 className="auction-bid-catalog__title" title={listingTitle}>
                    {listingTitle}
                  </h3>
                ) : null}
                <p className="auction-bid-catalog__price">
                  {t('propertyDetailCurrentMaxBid')} · {catalogPrice}
                </p>
                {showModeSwitch ? (
                  <div
                    className="auction-bid-mode"
                    role="tablist"
                    aria-label={t('auctionBidDrawerModeLabel')}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={bidMode === 'auction'}
                      className={`auction-bid-mode__btn${
                        bidMode === 'auction' ? ' auction-bid-mode__btn--active' : ''
                      }`}
                      onClick={() => setBidMode('auction')}
                    >
                      {t('auction')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={bidMode === 'auto'}
                      className={`auction-bid-mode__btn${
                        bidMode === 'auto' ? ' auction-bid-mode__btn--active' : ''
                      }`}
                      onClick={() => setBidMode('auto')}
                    >
                      {t('auctionBidDrawerAutoBid')}
                    </button>
                  </div>
                ) : null}
              </div>

              {bidMode === 'auto' && showModeSwitch ? (
                <div className="auction-bid-auto">
                  {embedBidCeiling ? (
                    <AuctionBidCeilingModal
                      embedded
                      open
                      onClose={() => setBidMode('auction')}
                      {...bidCeilingModalProps}
                    />
                  ) : (
                    <>
                      <p className="auction-bid-auto__text">{t('auctionBidCeilingHeroText')}</p>
                      {bidCeilingActive ? (
                        <p className="auction-bid-auto__active">{t('auctionBidCeilingAlreadyActive')}</p>
                      ) : null}
                      <button
                        type="button"
                        className="bidding-section__panel-submit"
                        onClick={onOpenBidCeiling}
                        disabled={disableAuctionBidFields || isReservedActive}
                      >
                        <span className="bidding-section__panel-submit-shine" aria-hidden />
                        <span className="bidding-section__panel-submit-label">
                          {bidCeilingActive
                            ? t('auctionBidCeilingChange')
                            : t('auctionBidCeilingButtonLabel')}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
              <div
                className={`bidding-section__panel-box${
                  isUserLeader ? ' bidding-section__panel-box--winner' : ''
                }${bidAmount && !isUserLeader ? ' bidding-section__panel-box--ready' : ''}${
                  celebrateBid ? ' auction-bid-celebrate' : ''
                }`}
              >
                {!isUserLeader ? (
                  <p className="bidding-section__panel-label">{t('propertyDetailYourBidLabel')}</p>
                ) : null}

                {isUserLeader && !celebrateBid ? (
                  <>
                  <div className="bidding-section__winner-bar" role="status">
                    <span className="bidding-section__winner-bar__shine" aria-hidden />
                    <div className="bidding-section__winner-bar__copy">
                      <p className="bidding-section__winner-bar__title">
                        {t('propertyDetailYouAreWinning')}
                      </p>
                      <p className="bidding-section__winner-bar__amount">{fmtBidPrice(winningBidAmount)}</p>
                      <p className="bidding-section__winner-bar__hint">
                        {t('propertyDetailYouAreWinningHint')}
                      </p>
                    </div>
                    <div className="bidding-section__winner-bar__trophy">
                      <img
                        src={AUCTION_BID_TROPHY_ART}
                        alt=""
                        className="bidding-section__winner-bar__trophy-img"
                      />
                      <span className="bidding-section__winner-bar__trophy-shine" aria-hidden />
                    </div>
                  </div>
                  {onOpenBidHistory ? (
                    <button
                      type="button"
                      className="auction-bid-history-link"
                      onClick={onOpenBidHistory}
                    >
                      {t('auctionBidDrawerHistoryLink')}
                    </button>
                  ) : null}
                  </>
                ) : !isUserLeader ? (
                  <div className="auction-bid-mission">
                    <div className="auction-bid-mission__head">
                      <div className="auction-bid-mission__copy">
                        <p className="auction-bid-mission__kicker">{t('auction')}</p>
                        <h3 className="auction-bid-mission__title">{t('placeBid')}</h3>
                      </div>
                      <img
                        src={AUCTION_BID_MISSION_ART}
                        alt=""
                        className="auction-bid-mission__art"
                      />
                    </div>
                    <div
                      className={`bidding-section__input-wrapper${
                        paymentActionsLocked ? ' bidding-section__input-wrapper--preview' : ''
                      }${showCurrencySelector ? ' bidding-section__input-wrapper--currency-trigger' : ''}`}
                      onClick={() => {
                        if (paymentActionsLocked) notifyListingCurrencyOnly('bid')
                      }}
                      onKeyDown={(e) => {
                        if (paymentActionsLocked && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          notifyListingCurrencyOnly('bid')
                        }
                      }}
                      role={paymentActionsLocked ? 'button' : undefined}
                      tabIndex={paymentActionsLocked ? 0 : undefined}
                    >
                      {renderInputCurrency()}
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        readOnly={paymentActionsLocked}
                        className="bidding-section__input"
                        placeholder={t('propertyDetailEnterBidAmount')}
                        aria-label={t('placeBid')}
                        value={bidAmountInputValue}
                        onChange={handleBidAmountChange}
                        disabled={isSubmittingBid || disableAuctionBidFields}
                        style={{
                          opacity: disableAuctionBidFields ? 0.5 : 1,
                          cursor:
                            disableAuctionBidFields || paymentActionsLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {!isUserLeader && !isReservedActive ? (
                  <div className="bidding-section__quick-block">
                    <p className="bidding-section__quick-label">{t('propertyDetailQuickBidLabel')}</p>
                    {renderQuickBidButtons('bidding-section__quick-buttons--panel')}
                    {renderMinBidHint('bidding-section__panel-min-hint')}
                  </div>
                ) : null}

                {showSubmitButton && !isUserLeader ? (
                  <div className="bidding-section__panel-actions">
                    <button
                      type="button"
                      className={`bidding-section__panel-submit${
                        paymentActionsLocked ? ' bidding-section__submit-btn--preview' : ''
                      }`}
                      onClick={handleBidSubmit}
                      disabled={
                        isSubmittingBid ||
                        (!paymentActionsLocked && !bidAmount) ||
                        disableAuctionBidFields
                      }
                      style={{
                        opacity: disableAuctionBidFields ? 0.5 : 1,
                        cursor:
                          disableAuctionBidFields || paymentActionsLocked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span className="bidding-section__panel-submit-shine" aria-hidden />
                      <span className="bidding-section__panel-submit-label">
                        {renderPanelSubmitLabel()}
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
