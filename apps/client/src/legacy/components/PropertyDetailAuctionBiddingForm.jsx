import { useState } from 'react'
import { FiLock, FiPlus, FiX } from 'react-icons/fi'
import { ShieldCheck, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getAuctionMinBidStep } from '../utils/auctionBidStep'
import PropertyCurrencySelector, {
  PropertyCurrencyInputTrigger,
} from './PropertyCurrencySelector'

export default function PropertyDetailAuctionBiddingForm({
  isAuctionProperty,
  displayProperty,
  currentBid,
  priceAnimation,
  fmtBidPrice,
  isReservedActive,
  kycBidBlocked,
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
          {formatQuickBidLabel(amount)}
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
    return (
      <p className={className}>
        {t('propertyDetailMinBidHint', {
          min: fmtBidPrice(minBid),
        })}
      </p>
    )
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
    if (isUserLeader) return t('propertyDetailYouAreWinning')
    if (isReservedActive) return t('objectReserved')
    return t('placeBid')
  }

  const winningBidAmount =
    currentBid !== null
      ? currentBid
      : displayProperty?.currentBid ?? displayProperty?.auction_starting_price ?? 0

  return (
    <>
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

      {!hideCurrentBid && !isQuickButtonsOnly && (
        <div className="property-detail-sidebar__current-bid">
          <span className="current-bid-label">
            {isAuctionProperty
              ? t('propertyDetailCurrentMaxBid')
              : t('propertyDetailObjectPrice')}
          </span>
          <div
            className={`current-bid-value-wrapper ${priceAnimation ? 'current-bid-value-wrapper--animated' : ''}`}
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
      )}

      {showBidding && (
        <div className="property-detail-sidebar__bidding-section">
          {!isPanelLayout && !isSplitDesktopVariant && isReservedActive && (
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

              {!isUserLeader && !isReservedActive ? (
                <div className="bidding-section__quick-block">
                  <p className="bidding-section__quick-label">{t('propertyDetailQuickBidLabel')}</p>
                  {renderQuickBidButtons('bidding-section__quick-buttons--panel')}
                  {renderMinBidHint('bidding-section__panel-min-hint')}
                </div>
              ) : null}

              <div
                className={`bidding-section__panel-box${
                  isUserLeader ? ' bidding-section__panel-box--winner' : ''
                }`}
              >
                {!isUserLeader ? (
                  <p className="bidding-section__panel-label">{t('propertyDetailYourBidLabel')}</p>
                ) : null}

                {isUserLeader ? (
                  <div className="bidding-section__winner-bar" role="status">
                    <span className="bidding-section__winner-bar__shine" aria-hidden />
                    <div className="bidding-section__winner-bar__head">
                      <span className="bidding-section__winner-bar__icon" aria-hidden>
                        <Trophy size={18} strokeWidth={2.25} />
                      </span>
                      <div className="bidding-section__winner-bar__copy">
                        <p className="bidding-section__winner-bar__title">
                          {t('propertyDetailYouAreWinning')}
                        </p>
                        <p className="bidding-section__winner-bar__hint">
                          {t('propertyDetailYouAreWinningHint')}
                        </p>
                      </div>
                    </div>
                    <p className="bidding-section__winner-bar__amount">{fmtBidPrice(winningBidAmount)}</p>
                  </div>
                ) : (
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
                )}

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
                      {renderPanelSubmitLabel()}
                    </button>
                    {showBidCeilingButton && onOpenBidCeiling ? (
                      <button
                        type="button"
                        className={`bidding-section__ceiling-btn bidding-section__panel-plus${
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
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
