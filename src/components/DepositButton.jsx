import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { navigateToWallet } from '../utils/walletNavigation'
import { useState } from 'react'
import { FaWallet, FaArrowRight } from 'react-icons/fa'
import './DepositButton.css'

const DepositButton = ({ amount = 0 }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)

  const formatAmount = (value) => {
    if (value === 0) {
      return t('depositButton_topUpZero')
    }
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(2)}M`
    }
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(2)}K`
    }
    return `€${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <button 
      className="deposit-button"
      onClick={() => navigateToWallet(navigate, location.pathname)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={t('depositButton_ariaOpen')}
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
        <div className={`deposit-button__arrow ${isHovered ? 'hovered' : ''}`}>
          <FaArrowRight />
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
