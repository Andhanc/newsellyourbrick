import { FiX } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import BiddingHistoryPanel from './BiddingHistoryPanel'
import './BiddingHistoryModal.css'

const BiddingHistoryModal = ({ isOpen, onClose, property, refreshTrigger }) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="bidding-history-overlay" onClick={onClose}>
      <div className="bidding-history-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="bidding-history-modal__close"
          onClick={onClose}
          aria-label={t('closeAria')}
          type="button"
        >
          <FiX size={24} />
        </button>

        <BiddingHistoryPanel
          property={property}
          isOpen={isOpen}
          refreshTrigger={refreshTrigger}
          hideTitleHeader={false}
        />
      </div>
    </div>
  )
}

export default BiddingHistoryModal
