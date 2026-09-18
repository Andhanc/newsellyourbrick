import { FiArrowUpRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import { publicAsset } from '../utils/publicAsset'
import { COMPASS_ICON_SRC } from '../utils/investmentCompass'
import './InvestmentCompassDrawer.css'

export default function InvestmentCompassDrawer({ isOpen, onClose, onStart }) {
  const { t } = useTranslation()

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="investment-compass-title"
      describedBy="investment-compass-description"
      tone="choice"
      closeLabel={t('compass_drawerClose')}
      className="investment-compass-drawer"
      footer={
        <button type="button" className="investment-compass-drawer__cta" onClick={onStart}>
          <span>{t('compass_drawerCta')}</span>
          <span className="investment-compass-drawer__cta-icon" aria-hidden="true">
            <FiArrowUpRight />
          </span>
        </button>
      }
    >
      <div className="investment-compass-drawer__hero" aria-hidden="true">
        <span className="investment-compass-drawer__glow" />
        <span className="investment-compass-drawer__orbit" />
        <span className="investment-compass-drawer__orbit investment-compass-drawer__orbit--inner" />
        <img
          className="investment-compass-drawer__icon"
          src={publicAsset(COMPASS_ICON_SRC)}
          alt=""
          width="512"
          height="512"
        />
      </div>

      <div className="investment-compass-drawer__copy">
        <span className="investment-compass-drawer__eyebrow">{t('compass_drawerEyebrow')}</span>
        <h2 id="investment-compass-title">{t('compass_drawerTitle')}</h2>
        <p id="investment-compass-description">{t('compass_drawerDescription')}</p>
        <div
          className="investment-compass-drawer__meta"
          aria-label={`${t('compass_drawerMetaQuestions')}, ${t('compass_drawerMetaDuration')}`}
        >
          <span>{t('compass_drawerMetaQuestions')}</span>
          <i aria-hidden="true" />
          <span>{t('compass_drawerMetaDuration')}</span>
        </div>
      </div>
    </BuyerSheetShell>
  )
}
