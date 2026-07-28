import { useMemo, useState } from 'react'
import {
  Pointer,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestionMark,
  Zap,
} from 'lucide-react'
import { getDebtRiskPresentation } from '../utils/debtPropertyDetail'
import { DebtProModal } from './DebtAuctionInsight'
import './PropertyDebtRiskBanner.css'

const ICONS = {
  high: ShieldQuestionMark,
  medium: ShieldAlert,
  low: ShieldCheck,
  unknown: ShieldAlert,
}

export default function PropertyDebtRiskBanner({ property, onRequireLogin }) {
  const [proOpen, setProOpen] = useState(false)
  const risk = useMemo(
    () => getDebtRiskPresentation(property?.debt_severity),
    [property?.debt_severity],
  )
  const RiskIcon = ICONS[risk.tone]

  return (
    <>
      <button
        type="button"
        className={`debt-risk-banner debt-risk-banner--${risk.tone}`}
        onClick={() => setProOpen(true)}
        aria-label={`${risk.label}. Узнать о долге подробнее`}
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
        open={proOpen}
        onClose={() => setProOpen(false)}
        onRequireLogin={onRequireLogin}
        risk={risk}
        isAuction
      />
    </>
  )
}
