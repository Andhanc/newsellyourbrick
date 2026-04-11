import { useEffect, useState } from 'react'
import { FiArrowRight, FiChevronLeft, FiShield, FiX } from 'react-icons/fi'
import './DepositRequiredModal.css'

const DepositRequiredModal = ({
  isOpen,
  onClose,
  onGoToDeposit,
  title = 'Необходимо внести депозит',
  message = 'Для участия в аукционе нужно пополнить депозит.',
  actionText = 'Перейти',
}) => {
  const [showDepositInfo, setShowDepositInfo] = useState(false)

  useEffect(() => {
    if (!isOpen) setShowDepositInfo(false)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="deposit-required-modal__overlay" onClick={onClose}>
      <div
        className={`deposit-required-modal__panel ${showDepositInfo ? 'deposit-required-modal__panel--expanded' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="deposit-required-modal__glow deposit-required-modal__glow--one" />
        <div className="deposit-required-modal__glow deposit-required-modal__glow--two" />

        <button
          type="button"
          className="deposit-required-modal__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={20} />
        </button>

        <div className="deposit-required-modal__content">
          <div className="deposit-required-modal__icon-wrap" aria-hidden="true">
            <FiShield size={24} />
          </div>
          {!showDepositInfo ? (
            <>
              <h2 className="deposit-required-modal__title">{title}</h2>
              <p className="deposit-required-modal__message">{message}</p>

              <button
                type="button"
                className="deposit-required-modal__action"
                onClick={onGoToDeposit}
              >
                {actionText}
                <FiArrowRight size={18} />
              </button>

              <button
                type="button"
                className="deposit-required-modal__link"
                onClick={() => setShowDepositInfo(true)}
              >
                Что такое депозит?
              </button>
            </>
          ) : (
            <div className="deposit-required-modal__details">
              <h2 className="deposit-required-modal__title">Что такое депозит?</h2>
              <p className="deposit-required-modal__detail-text">
                Депозит составляет <strong>3000 евро</strong> и подтверждает вашу платежеспособность для участия в аукционе.
              </p>
              <p className="deposit-required-modal__detail-text">
                Это не штраф и не скрытая комиссия: деньги остаются вашими. После завершения участия депозит можно
                <strong> вернуть обратно</strong> на ваш баланс.
              </p>
              <p className="deposit-required-modal__detail-text">
                Если вы приобретаете объект, депозит можно <strong>зачесть в сумму покупки</strong>, чтобы уменьшить итоговый платеж.
              </p>

              <div className="deposit-required-modal__detail-actions">
                <button
                  type="button"
                  className="deposit-required-modal__back"
                  onClick={() => setShowDepositInfo(false)}
                >
                  <FiChevronLeft size={16} />
                  Назад
                </button>
                <button
                  type="button"
                  className="deposit-required-modal__action"
                  onClick={onGoToDeposit}
                >
                  {actionText}
                  <FiArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DepositRequiredModal
