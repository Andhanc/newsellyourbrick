import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { useInvestorHomeShowcases } from '../hooks/useInvestorHomeShowcases'
import InvestorPropertyShowcaseSection from './InvestorPropertyShowcaseSection'

const SHOWCASE_SECTIONS = [
  {
    id: 'auction',
    sectionId: 'invest-objects-auction',
    variant: 'auction',
    titleKey: 'auction',
    subtitleKey: 'discoverPage_showcaseAuctionSubtitle',
    to: '/auction?filter=auction',
    itemsKey: 'auctionSection',
  },
  {
    id: 'buy_now',
    sectionId: 'invest-objects-buy-now',
    variant: 'buyNow',
    titleKey: 'buyNowSectionTitle',
    subtitleKey: 'discoverPage_showcaseBuyNowSubtitle',
    to: '/auction/buy-now',
    itemsKey: 'buyNowSection',
  },
  {
    id: 'shares',
    sectionId: 'invest-objects-shares',
    variant: 'shares',
    titleKey: 'shares',
    subtitleKey: 'discoverPage_showcaseSharesSubtitle',
    to: '/shares',
    itemsKey: 'sharesSection',
  },
  {
    id: 'debts',
    sectionId: 'invest-objects-debts',
    variant: 'debts',
    titleKey: 'debtsTitle',
    subtitleKey: 'discoverPage_showcaseDebtsSubtitle',
    to: '/debts',
    itemsKey: 'debtsSection',
  },
]

export default function InvestorHomeShowcases({ activeStrategyTab = 'all' }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const {
    loading,
    auctionSection,
    buyNowSection,
    debtsSection,
    sharesSection,
  } = useInvestorHomeShowcases()

  const itemsByKey = {
    auctionSection,
    buyNowSection,
    sharesSection,
    debtsSection,
  }

  const showPropertyAuthRequiredToast = useCallback(() => {
    showNotification(
      t('discoverPage_authToOpenProperty'),
      'warning',
      7000,
    )
    requestOpenLoginModal({ wizard: true })
  }, [t])

  const visibleSections = SHOWCASE_SECTIONS.filter(
    (section) => activeStrategyTab === 'all' || activeStrategyTab === section.id,
  )

  return (
    <>
      {visibleSections.map((section) => (
        <InvestorPropertyShowcaseSection
          key={section.id}
          sectionId={section.sectionId}
          title={t(section.titleKey)}
          subtitle={t(section.subtitleKey)}
          ctaLabel={t('goTo')}
          onCtaClick={() => navigate(section.to)}
          loading={loading}
          items={itemsByKey[section.itemsKey]}
          variant={section.variant}
          navigate={navigate}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          ensureCanOpenProperty={ensureCanOpenProperty}
          showPropertyAuthRequiredToast={showPropertyAuthRequiredToast}
        />
      ))}
    </>
  )
}
