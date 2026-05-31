import { FiLock, FiPlus } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { getAuctionMinBidStep } from '../utils/auctionBidStep'
import PropertyCurrencySelector from './PropertyCurrencySelector'

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
}) {
  const { t } = useTranslation()

  const startingPrice = displayProperty?.auction_starting_price || 0
  const hideCurrentBid =
    suppressCurrentBidDisplay ||
    (!alwaysShowCurrentBid &&
      isAuctionProperty &&
      currentBid !== null &&
      currentBid !== startingPrice)

  const showBidding =
    !isAuctionProperty || !auctionEndedForSidebar

  return (
    <>
      {showCurrencySelector && (
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

      {!hideCurrentBid && (
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
          {isReservedActive && (
            <div className="property-detail-bidding-reserved-notice">
              <FiLock size={16} />
              <span>{t('propertyDetailBidsUnavailableReserved')}</span>
            </div>
          )}
          {!isReservedActive && kycBidBlocked && (
            <div className="auction-verification-pending-banner" role="status">
              {t('propertyDetailBidVerificationPending')}
            </div>
          )}
          {paymentActionsLocked ? (
            <p className="property-detail-sidebar__bids-currency-note" role="note">
              {t('propertyDetailBidsListingCurrency', { currency: currencyView.baseCurrency })}
            </p>
          ) : null}
          <div className="bidding-section__quick-buttons">
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

          {isAuctionProperty &&
            !isUserLeader &&
            !isReservedActive &&
            (() => {
              const effectiveCurrentBid =
                currentBid !== null ? currentBid : displayProperty.currentBid || startingPrice
              const step = getAuctionMinBidStep(effectiveCurrentBid)
              const minBid = effectiveCurrentBid + step
              return (
                <p className="bidding-section__min-hint">
                  {t('propertyDetailMinBidHint', {
                    min: fmtBidPrice(minBid),
                    step: fmtBidPrice(step),
                  })}
                </p>
              )
            })()}

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
                {isSubmittingBid
                  ? t('propertyDetailSubmitting')
                  : isUserLeader
                    ? t('propertyDetailYouAreWinning')
                    : isReservedActive
                      ? t('objectReserved')
                      : t('placeBid')}
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
        </div>
      )}
    </>
  )
}
