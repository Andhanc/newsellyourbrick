import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { DEBTS_SORT_OPTIONS } from '../utils/debtsListing'
import './DebtsListingMeta.css'

function DebtsListingMeta({ total = 0, sortKey, onSortChange }) {
  const { t } = useTranslation()

  return (
    <div className="debts-listing-meta">
      <p className="debts-listing-meta__count">{t('debtsFoundCount', { count: total })}</p>
      <label className="debts-listing-meta__sort">
        <select
          className="debts-listing-meta__sort-select"
          value={sortKey}
          onChange={(e) => onSortChange?.(e.target.value)}
          aria-label={t('sharesSortLabel')}
        >
          {DEBTS_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="debts-listing-meta__sort-icon" aria-hidden />
      </label>
    </div>
  )
}

export default DebtsListingMeta
