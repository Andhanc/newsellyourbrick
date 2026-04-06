import { useNavigate, useLocation } from 'react-router-dom'
import { navigateToWallet } from '../utils/walletNavigation'
import { useState } from 'react'
import { FaWallet, FaArrowRight } from 'react-icons/fa'
import './DepositButton.css'

const DepositButton = ({ amount = 0 }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)

  const formatAmount = (amount) => {
    if (amount === 0) {
      return '0 - Пополните депозит'
    }
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(2)}M`
    }
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(2)}K`
    }
    return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <button 
      className="deposit-button"
      onClick={() => navigateToWallet(navigate, location.pathname)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Открыть депозит"
    >
      <div className="deposit-button__glow"></div>
      <div className="deposit-button__content-wrapper">
        <div className="deposit-button__icon-wrapper">
          <div className="deposit-button__icon-bg"></div>
          <FaWallet className="deposit-button__icon" />
        </div>
        <div className="deposit-button__content">
          <div className="deposit-button__label">Депозит</div>
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

