import { publicAsset } from './publicAsset'

export const DEBT_RISK_ICONS = {
  high: publicAsset('images/debts/risk-icons/risk-high-3d.webp'),
  medium: publicAsset('images/debts/risk-icons/risk-medium-3d.webp'),
  low: publicAsset('images/debts/risk-icons/risk-low-3d.webp'),
}

export function getDebtRiskIcon(tone) {
  return DEBT_RISK_ICONS[tone] || DEBT_RISK_ICONS.medium
}
