import { useTranslation } from 'react-i18next'
import DebtsPageFilters from './DebtsPageFilters'
import { EMPTY_DEBTS_FILTERS } from '../utils/debtsPageFilters'
import './DebtsAdvancedFiltersDrawer.css'

function DebtsAdvancedFiltersDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
  priceBounds,
  debtBounds,
  riskStats,
  purchaseCounts,
}) {
  const { t } = useTranslation()

  if (!open) return null

  const handleReset = () => {
    onFiltersChange({
      ...EMPTY_DEBTS_FILTERS,
      propertyType: filters.propertyType,
      country: filters.country,
      city: filters.city,
    })
  }

  return (
    <div className="debts-advanced-filters-drawer" role="dialog" aria-modal="true" aria-label={t('filters')}>
      <button
        type="button"
        className="debts-advanced-filters-drawer__backdrop"
        aria-label={t('close')}
        onClick={onClose}
      />
      <div className="debts-advanced-filters-drawer__panel">
        <div className="debts-advanced-filters-drawer__filters">
          <DebtsPageFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
            priceBounds={priceBounds}
            debtBounds={debtBounds}
            riskStats={riskStats}
            purchaseCounts={purchaseCounts}
            filterOptions={{ locations: [] }}
          />
        </div>
        <div className="debts-advanced-filters-drawer__footer">
          <button
            type="button"
            className="debts-advanced-filters-drawer__btn debts-advanced-filters-drawer__btn--primary"
            onClick={onClose}
          >
            {t('auctionApplyFilters')}
          </button>
          <button
            type="button"
            className="debts-advanced-filters-drawer__btn debts-advanced-filters-drawer__btn--ghost"
            onClick={handleReset}
          >
            {t('catalogResetFilters')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DebtsAdvancedFiltersDrawer
