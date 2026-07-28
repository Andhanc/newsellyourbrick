import { FiCheckCircle, FiRefreshCw, FiShield } from 'react-icons/fi'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import './DepositInfoDrawer.css'

export default function DepositInfoDrawer({ isOpen, onClose, onTopUp }) {
  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      tone="detail"
      titleId="deposit-info-drawer-title"
      describedBy="deposit-info-drawer-description"
      closeLabel="Закрыть информацию о депозите"
      className="deposit-info-drawer"
      footer={(
        <div className="deposit-info-drawer__actions">
          <button type="button" className="deposit-info-drawer__cta" onClick={onTopUp}>Пополнить депозит</button>
          <button type="button" className="deposit-info-drawer__secondary" onClick={onClose}>Понятно</button>
        </div>
      )}
    >
      <div className="deposit-info-drawer__content">
        <div className="deposit-info-drawer__visual">
          <img src="/images/property-detail/deposit-wallet-3d.png" alt="" aria-hidden />
        </div>
        <span className="deposit-info-drawer__eyebrow">SellYourBrick Deposit</span>
        <h2 id="deposit-info-drawer-title">Что такое депозит</h2>
        <p id="deposit-info-drawer-description" className="deposit-info-drawer__lead">
          Это доступный баланс для действий, где площадке нужно подтвердить серьёзность намерений покупателя.
        </p>
        <div className="deposit-info-drawer__benefits">
          <div><FiShield aria-hidden /><span>До подтверждения вы видите сумму и назначение платежа.</span></div>
          <div><FiRefreshCw aria-hidden /><span>Доступную, не зарезервированную часть можно запросить к возврату.</span></div>
          <div><FiCheckCircle aria-hidden /><span>После пополнения сайт подскажет, какое действие стало доступно.</span></div>
        </div>
      </div>
    </BuyerSheetShell>
  )
}
