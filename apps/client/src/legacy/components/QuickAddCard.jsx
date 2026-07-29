import { FiUpload, FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './QuickAddCard.css'

const QuickAddCard = ({ onClick }) => {
  const { t } = useTranslation()
  return (
    <div className="quick-add-card" onClick={onClick}>
      <div className="quick-add-card__content-wrapper">
        <div className="quick-add-card__icon-wrapper">
          <div className="quick-add-card__icon">
            <FiUpload size={24} />
          </div>
        </div>
        <div className="quick-add-card__content">
          <div className="quick-add-card__main-text">
            <p className="quick-add-card__value">{t('ownerQuickAddLine1')}</p>
            <p className="quick-add-card__value">{t('ownerQuickAddLine2')}</p>
          </div>
          <div className="quick-add-card__footer">
            <p className="quick-add-card__subtext">{t('ownerQuickAddCsv')}</p>
            <FiArrowRight className="quick-add-card__arrow" size={18} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickAddCard
