import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
    title: 'Аукцион',
    subtitle: 'Находите скрытые возможности и приобретайте объекты по лучшей цене.',
    ctaLabel: 'Перейти к аукциону',
    to: '/auction?filter=auction',
    itemsKey: 'auctionSection',
  },
  {
    id: 'buy_now',
    sectionId: 'invest-objects-buy-now',
    variant: 'buyNow',
    title: 'Купить сейчас',
    subtitle: 'Готовые объекты по фиксированной цене без торгов.',
    ctaLabel: 'Перейти к разделу',
    to: '/auction?filter=buy_now',
    itemsKey: 'buyNowSection',
  },
  {
    id: 'shares',
    sectionId: 'invest-objects-shares',
    variant: 'shares',
    title: 'Доли',
    subtitle: 'Инвестируйте в доли крупных объектов от минимальных сумм.',
    ctaLabel: 'Перейти к долям',
    to: '/shares',
    itemsKey: 'sharesSection',
  },
  {
    id: 'debts',
    sectionId: 'invest-objects-debts',
    variant: 'debts',
    title: 'Долги',
    subtitle: 'Инвестируйте в долговые инструменты под залог недвижимости.',
    ctaLabel: 'Перейти к долгам',
    to: '/debts',
    itemsKey: 'debtsSection',
  },
]

export default function InvestorHomeShowcases({ activeStrategyTab = 'all' }) {
  const navigate = useNavigate()
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
      'Войдите в аккаунт, чтобы открыть карточку объекта.',
      'warning',
      7000,
    )
    requestOpenLoginModal({ wizard: true })
  }, [])

  const visibleSections = SHOWCASE_SECTIONS.filter(
    (section) => activeStrategyTab === 'all' || activeStrategyTab === section.id,
  )

  return (
    <>
      {visibleSections.map((section) => (
        <InvestorPropertyShowcaseSection
          key={section.id}
          sectionId={section.sectionId}
          title={section.title}
          subtitle={section.subtitle}
          ctaLabel={section.ctaLabel}
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
