import { TonConnectButton } from '@tonconnect/ui-react'
import './TonConnectModal.css'

const TonConnectModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="ton-connect-overlay" onClick={onClose}>
      <div className="ton-connect-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="ton-connect-modal__close" onClick={onClose} aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="ton-connect-modal__icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M28 56c15.464 0 28-12.536 28-28S43.464 0 28 0 0 12.536 0 28s12.536 28 28 28z" fill="#0098EA"/>
            <path d="M37.56 15.027H18.44c-.577 0-.866.32-1.01.96L14.028 35.46c-.144.64.072 1.04.577 1.2l5.34 1.44c.577.16.865-.08 1.01-.72l2.017-8.4c.144-.64.721-1.2 1.298-1.2h4.392c5.772 0 9.063-2.88 10.11-8.64l.433-2.4c.144-.72-.217-1.04-.721-1.12l-4.68-.64c-.576-.08-.864-.4-.72-1.04l.288-1.2c.144-.64.576-.96 1.153-.96h2.88c.576 0 .864-.32.72-.96l-.576-2.4c-.145-.64-.433-.96-1.01-.96z" fill="#fff"/>
          </svg>
        </div>
        <h2 className="ton-connect-modal__title">Пополнение через TON</h2>
        <p className="ton-connect-modal__subtitle">
          Подключите кошелёк TON для пополнения депозита криптовалютой
        </p>
        <div className="ton-connect-modal__button-wrap">
          <TonConnectButton className="ton-connect-modal__button" />
        </div>
      </div>
    </div>
  )
}

export default TonConnectModal
