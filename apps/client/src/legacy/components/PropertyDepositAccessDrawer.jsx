import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiArrowRight, FiCheck, FiX } from 'react-icons/fi'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'
import '../styles/drawerDismiss.css'
import './PropertyDepositAccessDrawer.css'

export default function PropertyDepositAccessDrawer({ isOpen, onClose, onGoToDeposit }) {
  const closeButtonRef = useRef(null)
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose)

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, requestClose])

  if (!visible || typeof document === 'undefined') return null

  const goToDeposit = () => requestClose(onGoToDeposit)

  return createPortal(
    <div className="property-deposit-drawer" role="presentation">
      <button
        type="button"
        className={`property-deposit-drawer__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
        onClick={() => requestClose()}
        aria-label="Закрыть окно"
      />
      <section
        className={`property-deposit-drawer__panel${isClosing ? ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-deposit-drawer-title"
      >
        <div className="property-deposit-drawer__handle" aria-hidden><span /></div>
        <button
          ref={closeButtonRef}
          type="button"
          className="property-deposit-drawer__close"
          onClick={() => requestClose()}
          aria-label="Закрыть"
        >
          <FiX size={21} />
        </button>

        <div className="property-deposit-drawer__visual" aria-hidden="true">
          <img
            className="property-deposit-drawer__wallet"
            src="/images/property-detail/deposit-wallet-3d.png"
            alt=""
          />
        </div>
        <div className="property-deposit-drawer__content">
          <span className="property-deposit-drawer__eyebrow">Безопасный доступ</span>
          <h2 id="property-deposit-drawer-title">Откройте все детали объекта</h2>
          <p>Пополните депозит, чтобы увидеть документы и точное расположение объекта.</p>
          <ul>
            <li><FiCheck size={16} aria-hidden /> Проверенные документы</li>
            <li><FiCheck size={16} aria-hidden /> Точка объекта на карте</li>
          </ul>
          <button type="button" className="property-deposit-drawer__cta" onClick={goToDeposit}>
            Пополнить депозит
            <FiArrowRight size={19} aria-hidden />
          </button>
          <span className="property-deposit-drawer__note">Средства остаются на вашем балансе</span>
        </div>
      </section>
    </div>,
    document.body,
  )
}
