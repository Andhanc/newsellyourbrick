import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import './DebtsPageHeader.css'

function DebtsPageHeader({
  searchQuery,
  onSearchChange,
}) {
  const { t } = useTranslation()

  return (
    <header className="debts-page-header" aria-label={t('debtsTitle')}>
      <div className="debts-page-header__toolbar">
        <label className="debts-page-header__search">
          <Search size={18} className="debts-page-header__search-icon" aria-hidden />
          <input
            type="search"
            className="debts-page-header__search-input"
            placeholder={t('debtsSearchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('debtsSearchPlaceholder')}
          />
        </label>
      </div>
    </header>
  )
}

export default DebtsPageHeader
