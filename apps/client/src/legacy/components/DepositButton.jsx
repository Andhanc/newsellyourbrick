import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { navigateToWallet } from '../utils/walletNavigation'
import { useState } from 'react'
import { FaWallet, FaExternalLinkAlt } from 'react-icons/fa'
import './DepositButton.css'

const DepositButton = ({ amount = 0 }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(false)
  const hasDeposit = Number(amount) > 0

  const formatAmount = (value) => {
    const numericValue = Number(value) || 0

    if (numericValue === 0) {
      return t('depositButton_topUpZero')
    }
    if (numericValue >= 1000000) {
      return `€${(numericValue / 1000000).toFixed(2)}M`
    }
    if (numericValue >= 1000) {
      return `€${(numericValue / 1000).toFixed(2)}K`
    }
    return `€${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handleClick = () => {
    if (hasDeposit && !isExpanded) {
      setIsExpanded(true)
      return
    }

    navigateToWallet(navigate, location.pathname)
  }

  return (
    <button 
      className={`deposit-button${hasDeposit ? ' deposit-button--compact' : ''}${
        isExpanded ? ' deposit-button--expanded' : ''
      }`}
      onClick={handleClick}
      aria-label={t('depositButton_ariaOpen')}
      aria-expanded={hasDeposit ? isExpanded : undefined}
    >
      <div className="deposit-button__glow"></div>
      <div className="deposit-button__content-wrapper">
        <div className="deposit-button__icon-wrapper">
          <div className="deposit-button__icon-bg"></div>
          <FaWallet className="deposit-button__icon" />
        </div>
        <div className="deposit-button__content">
          <div className="deposit-button__label">{t('depositButton_label')}</div>
          <div className="deposit-button__amount">{formatAmount(amount)}</div>
        </div>
        <div className="deposit-button__arrow">
          <FaExternalLinkAlt />
        </div>
      </div>
      <div className="deposit-button__particles">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </button>
  )
}

export default DepositButton
