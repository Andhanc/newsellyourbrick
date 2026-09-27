import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pointer,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestionMark,
  Zap,
} from 'lucide-react'
import { getUserData } from '../services/authService'
import { useViewerVipAccess } from '../hooks/useViewerVipAccess'
import { resolveDebtRiskPresentation } from '../utils/debtPropertyDetail'
import { DebtProModal } from './DebtAuctionInsight'
import './PropertyDebtRiskBanner.css'

const ICONS = {
  high: ShieldQuestionMark,
  medium: ShieldAlert,
  low: ShieldCheck,
  unknown: ShieldAlert,
}

export default function PropertyDebtRiskBanner({ property, onRequireLogin, onOpenDocuments }) {
  const { t } = useTranslation()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const { canAccess, resolved } = useViewerVipAccess()
  const docsUnlocked = resolved && canAccess('documents')
  const risk = useMemo(
    () => resolveDebtRiskPresentation(property?.debt_severity, t),
    [property?.debt_severity, t],
  )
  const RiskIcon = ICONS[risk.tone]

  const handleOpen = () => {
    if (!resolved) return
    if (docsUnlocked) {
      onOpenDocuments?.()
      return
    }
    const userData = getUserData()
    const userId = userData?.id ?? window.localStorage.getItem('userId')
    if (!userId) {
      onRequireLogin?.()
      return
    }
    setPaywallOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className={`debt-risk-banner debt-risk-banner--${risk.tone}`}
        onClick={handleOpen}
        disabled={!resolved}
        aria-label={t('debtRiskOpenDocumentsAria', { label: risk.label })}
      >
        <span className="debt-risk-banner__icon" aria-hidden>
          <RiskIcon size={28} strokeWidth={2.15} />
        </span>
        <span className="debt-risk-banner__copy">
          <strong>{risk.label}</strong>
          <span>{risk.description}</span>
        </span>
        <span className="debt-risk-banner__action" aria-hidden>
          <span><Pointer size={14} /> {t('debtsFlipCardClickHint')}</span>
          <Zap size={22} />
        </span>
      </button>

      <DebtProModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onRequireLogin={onRequireLogin}
        onOpenDocuments={onOpenDocuments}
        risk={risk}
        isAuction
      />
    </>
  )
}
