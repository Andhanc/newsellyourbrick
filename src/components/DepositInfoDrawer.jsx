import { FiCheckCircle, FiRefreshCw, FiShield } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import './DepositInfoDrawer.css'

export default function DepositInfoDrawer({ isOpen, onClose, onTopUp }) {
  const { t } = useTranslation()

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      tone="detail"
      titleId="deposit-info-drawer-title"
      describedBy="deposit-info-drawer-description"
      closeLabel={t('depositInfoDrawer_closeAria')}
      className="deposit-info-drawer"
      footer={(
        <div className="deposit-info-drawer__actions">
          <button type="button" className="deposit-info-drawer__cta" onClick={onTopUp}>
            {t('depositInfoDrawer_topUpCta')}
          </button>
          <button type="button" className="deposit-info-drawer__secondary" onClick={onClose}>
            {t('depositInfoDrawer_gotIt')}
          </button>
        </div>
      )}
    >
      <div className="deposit-info-drawer__content">
        <div className="deposit-info-drawer__visual">
          <img src="/images/property-detail/deposit-wallet-3d.png" alt="" aria-hidden />
        </div>
        <span className="deposit-info-drawer__eyebrow">{t('depositInfoDrawer_eyebrow')}</span>
        <h2 id="deposit-info-drawer-title">{t('depositInfoDrawer_title')}</h2>
        <p id="deposit-info-drawer-description" className="deposit-info-drawer__lead">
          {t('depositInfoDrawer_lead')}
        </p>
        <div className="deposit-info-drawer__benefits">
          <div><FiShield aria-hidden /><span>{t('depositInfoDrawer_benefit1')}</span></div>
          <div><FiRefreshCw aria-hidden /><span>{t('depositInfoDrawer_benefit2')}</span></div>
          <div><FiCheckCircle aria-hidden /><span>{t('depositInfoDrawer_benefit3')}</span></div>
        </div>
      </div>
    </BuyerSheetShell>
  )
}
