import { useTranslation } from 'react-i18next'
import { Lightbulb, Check } from 'lucide-react'
import SectionInfoDrawer from '../components/SectionInfoDrawer'
import OapWizardSidebarImage from '../components/OapWizardSidebarImage'
import { OAP_LISTING_IMAGES } from './oapListingImages'
import { showNotification } from '../utils/toastHelper'
import './OwnerAddPropertyListingStep.css'

const LISTING_MODE_META = {
  development: {
    image: OAP_LISTING_IMAGES.development,
    section: 'sellerDevelopment',
    summaryKey: 'oap_saleFormatDevelopmentSummary',
    tone: 'teal',
  },
  auction: {
    image: OAP_LISTING_IMAGES.auction,
    section: 'sellerAuction',
    summaryKey: 'oap_saleFormatAuctionSummary',
    tone: 'teal',
  },
  auction_buy_now: {
    image: OAP_LISTING_IMAGES.auctionBuyNow,
    section: 'sellerAuctionBuyNow',
    summaryKey: 'oap_saleFormatAuctionBuyNowSummary',
    tone: 'violet',
  },
  shares: {
    image: OAP_LISTING_IMAGES.shares,
    section: 'sellerShares',
    summaryKey: 'oap_saleFormatSharesSummary',
    tone: 'blue',
  },
  shares_buy_now: {
    image: OAP_LISTING_IMAGES.sharesBuyNow,
    section: 'sellerSharesBuyNow',
    summaryKey: 'oap_saleFormatSharesBuyNowSummary',
    tone: 'violet',
  },
  debt: {
    image: OAP_LISTING_IMAGES.debt,
    section: 'sellerDebt',
    summaryKey: 'oap_saleFormatDebtSummary',
    tone: 'amber',
  },
  debt_auction: {
    image: OAP_LISTING_IMAGES.debtAuction,
    section: 'sellerDebtAuction',
    summaryKey: 'oap_saleFormatDebtAuctionSummary',
    tone: 'slate',
  },
}

function ListingModesList({ listingModes, listingMode, errors, onSelectMode }) {
  const { t } = useTranslation()

  return (
    <>
      <div
        className={`oap-listing-step__modes${listingModes.length === 1 ? ' oap-listing-step__modes--single' : ''}`}
        role="radiogroup"
        aria-label={t('oap_strategyListingModeTitle')}
      >
        {listingModes.map((mode) => {
          const meta = LISTING_MODE_META[mode.id] || LISTING_MODE_META.auction
          const tone = mode.tone || meta.tone
          const isActive = listingMode === mode.id
          const isComingSoon = mode.id === 'development'

          const handleSelect = () => {
            if (isComingSoon) {
              showNotification({
                type: 'info',
                title: t('oap_developmentComingSoonTitle'),
                message: t('oap_developmentComingSoonDescription'),
                duration: 5000,
                dedupeKey: 'oap-development-coming-soon',
              })
              return
            }
            onSelectMode(mode.id)
          }

          return (
            <div
              key={mode.id}
              className={`oap-listing-step__mode-shell oap-listing-step__mode-shell--${tone}${isActive ? ' oap-listing-step__mode-shell--active' : ''}${isComingSoon ? ' oap-listing-step__mode-shell--coming-soon' : ''}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-disabled={isComingSoon}
                className={`oap-listing-step__mode oap-listing-step__mode--illustrated oap-listing-step__mode--${tone}${isActive ? ' oap-listing-step__mode--active' : ''}`}
                onClick={handleSelect}
              >
                <span className="oap-listing-step__mode-visual" aria-hidden="true">
                  <img src={meta.image} alt="" width="128" height="128" loading="lazy" />
                </span>
                <span className="oap-listing-step__mode-body">
                  <span className="oap-listing-step__mode-label">{mode.label}</span>
                  <span className="oap-listing-step__mode-desc">{t(meta.summaryKey)}</span>
                </span>
                <span className="oap-listing-step__mode-mark" aria-hidden>
                  {isActive ? <Check size={12} strokeWidth={2.5} /> : null}
                </span>
                {isComingSoon ? (
                  <span className="oap-listing-step__mode-coming-soon">
                    {t('oap_developmentComingSoonBadge')}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className={`oap-listing-step__mode-action${isActive ? ' oap-listing-step__mode-action--selected' : ''}`}
                aria-label={`${t(isActive ? 'oap_saleFormatSelected' : 'oap_saleFormatChoose')}: ${mode.label}${isComingSoon ? `. ${t('oap_developmentComingSoonTitle')}` : ''}`}
                onClick={handleSelect}
              >
                {isActive ? <Check size={14} strokeWidth={2.5} aria-hidden /> : null}
                {t(isActive ? 'oap_saleFormatSelected' : 'oap_saleFormatChoose')}
              </button>
              <div className="oap-listing-step__mode-help">
                <SectionInfoDrawer
                  section={meta.section}
                  placement="card"
                  triggerLabel={`${t('sectionInfo_trigger')}: ${mode.label}`}
                  title={mode.label}
                  lead={mode.description}
                  noteKey="oap_saleFormatDrawerNote"
                />
              </div>
            </div>
          )
        })}
      </div>
      {errors.listingMode && <p className="oap-listing-step__error">{errors.listingMode}</p>}
    </>
  )
}

export default function OwnerAddPropertyListingStep({
  embedded = false,
  listingModes,
  listingMode,
  errors = {},
  onSelectMode,
}) {
  const { t } = useTranslation()

  if (embedded) {
    return (
      <section className="oap-listing-step oap-listing-step--embedded">
        <ListingModesList
          listingModes={listingModes}
          listingMode={listingMode}
          errors={errors}
          onSelectMode={onSelectMode}
        />
      </section>
    )
  }

  return (
    <section className="oap-listing-step" aria-labelledby="oap-listing-title">
      <div className="oap-listing-step__layout">
        <div className="oap-listing-step__main">
          <header className="oap-listing-step__head">
            <h2 id="oap-listing-title" className="oap-listing-step__title">
              {t('oap_listingChooseFormat')}
            </h2>
            <p className="oap-listing-step__subtitle">{t('oap_listingChooseFormatDesc')}</p>
          </header>

          <div className="oap-listing-step__card">
            <div className="oap-listing-step__section">
              <h3 className="oap-listing-step__section-title">{t('oap_listingPlacementType')}</h3>
              <ListingModesList
                listingModes={listingModes}
                listingMode={listingMode}
                errors={errors}
                onSelectMode={onSelectMode}
              />
            </div>
          </div>
        </div>

        <aside className="oap-listing-step__sidebar" aria-label={t('oap_listingSidebarAria')}>
          <div className="oap-listing-step__sidebar-head">
            <span className="oap-listing-step__sidebar-icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-listing-step__sidebar-title">{t('oap_listingSidebarTitle')}</span>
          </div>
          <p className="oap-listing-step__sidebar-text">{t('oap_listingSidebarP1')}</p>
          <p className="oap-listing-step__sidebar-text oap-listing-step__sidebar-text--extra">
            {t('oap_listingSidebarP2')}
          </p>
          <div className="oap-listing-step__sidebar-illustration">
            <OapWizardSidebarImage
              src={OAP_LISTING_IMAGES.sidebarHero}
              className="oap-listing-step__sidebar-img"
            />
          </div>
        </aside>
      </div>
    </section>
  )
}
