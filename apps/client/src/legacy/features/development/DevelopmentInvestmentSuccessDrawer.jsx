import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Confetti from '../../components/Confetti'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Check, Layers } from 'lucide-react'
import BuyerSheetShell from '../../components/buyer-mobile/BuyerSheetShell'
import { DRAWER_DISMISS_MS } from '../../hooks/useDrawerDismiss'
import { publicAsset } from '../../utils/publicAsset'
import { useDealFormat } from './DevelopmentFields'
import './DevelopmentPortfolio.css'

const CELEBRATION_COLORS = [
  '#0099a9',
  '#63cdd4',
  '#c1f4f1',
  '#ffffff',
  '#e9c675',
]

export default function DevelopmentInvestmentSuccessDrawer({
  confirmation,
  onClose,
  onInvestAgain,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const fmt = useDealFormat(
    confirmation?.currency || confirmation?.project?.currency || 'EUR',
    2,
  )
  useEffect(() => {
    if (!confirmation) {
      setVisible(false)
      return
    }
    // Wait for the investment form to finish dismissing before locking the next sheet.
    const timer = window.setTimeout(
      () => setVisible(true),
      DRAWER_DISMISS_MS.spring + 40,
    )
    return () => window.clearTimeout(timer)
  }, [confirmation])
  const investAgain = () => {
    setVisible(false)
    window.setTimeout(onInvestAgain, DRAWER_DISMISS_MS.panel + 40)
  }
  return (
    <>
      {visible &&
        createPortal(
          <Confetti
            className="dev-investment-confirmation__confetti"
            count={100}
            minSize={5}
            maxSize={11}
            colors={CELEBRATION_COLORS}
            spreadOnMount
          />,
          document.body,
        )}
      <BuyerSheetShell
        isOpen={visible}
        onClose={onClose}
        titleId="development-invested-title"
        describedBy="development-invested-description"
        closeLabel={t('closeAria')}
        className="dev-portfolio-sheet dev-investment-confirmation"
      >
        <div className="dev-investment-confirmation__art">
          <img
            src={publicAsset(
              'images/development/investment-villa-tiffany-v1.webp',
            )}
            alt=""
          />
          <span aria-hidden="true">
            <Check size={28} />
          </span>
        </div>
        <div className="dev-investment-confirmation__copy">
          <span className="dev-portfolio-eyebrow">
            <Layers size={14} /> {t('develop.portfolioCategory')}
          </span>
          <h2 id="development-invested-title">
            {t('develop.successfulInvestment')}
          </h2>
          <p id="development-invested-description">
            {t('develop.portfolioSuccessNote')}
          </p>
          <div className="dev-investment-confirmation__receipt">
            <span>{confirmation?.project?.title}</span>
            <strong>{fmt(confirmation?.amount)}</strong>
          </div>
          <button
            type="button"
            className="dev-portfolio-primary btn-tiffany-shine"
            onClick={() => {
              onClose()
              navigate('/profile?history=1&history_category=development')
            }}
          >
            {t('develop.openPortfolio')}
            <ArrowUpRight size={20} />
          </button>
          {onInvestAgain && (
            <button
              type="button"
              className="dev-portfolio-secondary"
              onClick={investAgain}
            >
              {t('develop.investAgain')}
              <ArrowUpRight size={17} />
            </button>
          )}
        </div>
      </BuyerSheetShell>
    </>
  )
}
