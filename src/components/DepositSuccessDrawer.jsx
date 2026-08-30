import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiArrowRight, FiCheck } from 'react-icons/fi'
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
  const actionRef = useRef(null)
  const cardRef = useRef(null)
  const actionLabel = continueLabel(returnPath)

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    const frame = window.requestAnimationFrame(() => cardRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="deposit-success-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        ref={cardRef}
        className="deposit-success-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-success-modal-title"
        aria-describedby="deposit-success-modal-description"
        tabIndex={-1}
      >
        <span className="deposit-success-modal__check" aria-hidden="true">
          <FiCheck />
        </span>
        <h2 id="deposit-success-modal-title" className="deposit-success-modal__title">
          Депозит пополнен
        </h2>
        {confirmedAmount ? (
          <strong className="deposit-success-modal__confirmed">+ {confirmedAmount}</strong>
        ) : null}
        <p id="deposit-success-modal-description" className="deposit-success-modal__lead">
          Платёж прошёл успешно. Средства уже доступны для участия в торгах.
        </p>
        <button
          ref={actionRef}
          type="button"
          className="deposit-success-modal__cta"
          onClick={onContinue}
        >
          <span>{actionLabel}</span>
          <FiArrowRight aria-hidden="true" />
        </button>
      </section>
    </div>,
    document.body,
  )
}

export { continueLabel as getDepositSuccessContinueLabel }
