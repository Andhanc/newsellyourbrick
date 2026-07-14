import { FiArrowRight, FiCheckCircle } from 'react-icons/fi'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import './DepositSuccessDrawer.css'

function continueLabel(returnPath = '') {
  if (returnPath.startsWith('/property/')) return 'Вернуться к объекту'
  if (returnPath.startsWith('/compare')) return 'Вернуться к сравнению'
  if (returnPath.startsWith('/calculator')) return 'Вернуться к расчёту'
  if (returnPath.startsWith('/favorites')) return 'Вернуться к избранному'
  return 'Продолжить выбор'
}

export default function DepositSuccessDrawer({
  isOpen,
  onClose,
  onContinue,
  confirmedAmount,
  returnPath,
}) {
  const actionLabel = continueLabel(returnPath)
  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      tone="success"
      titleId="deposit-success-drawer-title"
      describedBy="deposit-success-drawer-description"
      closeLabel="Закрыть подтверждение пополнения"
      className="deposit-success-drawer"
      footer={(
        <button type="button" className="deposit-success-drawer__cta" onClick={onContinue}>
          <span>{actionLabel}</span>
          <FiArrowRight size={20} aria-hidden />
        </button>
      )}
    >
      <div className="deposit-success-drawer__panel">
        <img
          className="deposit-success-drawer__illustration"
          src="/images/property-detail/deposit-success-check-3d.png"
          alt=""
          aria-hidden="true"
        />
        <span className="deposit-success-drawer__eyebrow"><FiCheckCircle aria-hidden /> Платёж подтверждён</span>
        <h2 id="deposit-success-drawer-title" className="deposit-success-drawer__title">
          Депозит пополнен
        </h2>
        {confirmedAmount ? (
          <strong className="deposit-success-drawer__confirmed">+ {confirmedAmount}</strong>
        ) : null}
        <p id="deposit-success-drawer-description" className="deposit-success-drawer__lead">
          Средства уже доступны. Теперь можно вернуться к выбранному объекту, сделать ставку или продолжить бронирование.
        </p>
      </div>
    </BuyerSheetShell>
  )
}

export { continueLabel as getDepositSuccessContinueLabel }
