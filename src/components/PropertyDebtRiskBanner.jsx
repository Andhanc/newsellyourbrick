import { useMemo, useState } from 'react'
import {
  Pointer,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestionMark,
  Zap,
} from 'lucide-react'
import { getUserData } from '../services/authService'
import { useViewerVipAccess } from '../hooks/useViewerVipAccess'
import { getDebtRiskPresentation } from '../utils/debtPropertyDetail'
import { DebtProModal } from './DebtAuctionInsight'
import './PropertyDebtRiskBanner.css'

const ICONS = {
  high: ShieldQuestionMark,
  medium: ShieldAlert,
  low: ShieldCheck,
  unknown: ShieldAlert,
}

export default function PropertyDebtRiskBanner({ property, onRequireLogin, onOpenDocuments }) {
  const [paywallOpen, setPaywallOpen] = useState(false)
  const { canAccess, resolved } = useViewerVipAccess()
  const docsUnlocked = resolved && canAccess('documents')
  const risk = useMemo(
    () => getDebtRiskPresentation(property?.debt_severity),
    [property?.debt_severity],
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
        aria-label={
          docsUnlocked
            ? `${risk.label}. Открыть документы объекта`
            : `${risk.label}. Открыть документы объекта`
        }
      >
        <span className="debt-risk-banner__icon" aria-hidden>
          <RiskIcon size={28} strokeWidth={2.15} />
        </span>
        <span className="debt-risk-banner__copy">
          <strong>{risk.label}</strong>
          <span>{risk.description}</span>
        </span>
        <span className="debt-risk-banner__action" aria-hidden>
          <span><Pointer size={14} /> Нажмите</span>
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
