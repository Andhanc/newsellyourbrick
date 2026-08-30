import { Suspense, lazy, useEffect, useState } from 'react'
import { Camera, ChevronRight } from 'lucide-react'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import './SellerVerificationModal.css'

const VerificationModalLazy = lazy(() => import('./VerificationModal'))

const SellerVerificationModal = ({ isOpen, onClose, userId, onComplete, required, title, subtitle }) => {
  const [showVerification, setShowVerification] = useState(false)
  const displayTitle = title ?? 'Для публикации объявлений необходимо пройти процедуру верификации'
  const displaySubtitle = subtitle ?? 'Пожалуйста следуйте инструкциям ниже'

  useEffect(() => {
    if (isOpen) {
      setShowVerification(false)
    }
  }, [isOpen])

  const handleStartVerification = () => {
    setShowVerification(true)
  }

  const handleVerificationComplete = async () => {
    // Не закрываем модальное окно сразу, ждем завершения onComplete
    if (onComplete) {
      const success = await onComplete()
      // Закрываем только после успешного завершения
      if (success !== false) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  if (showVerification) {
    return (
      <Suspense fallback={null}>
        <VerificationModalLazy
          isOpen={true}
          required={required}
          onClose={() => {
            setShowVerification(false)
            onClose()
          }}
          userId={userId}
          onComplete={async () => {
            await handleVerificationComplete()
          }}
        />
      </Suspense>
    )
  }

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      tone="choice"
      titleId="seller-verification-drawer-title"
      describedBy="seller-verification-drawer-description"
      closeLabel="Закрыть верификацию"
      dismissible={!required}
      className="seller-verification-drawer"
      footer={(
        <button
          type="button"
          className="seller-verification-drawer__cta"
          onClick={handleStartVerification}
        >
          <Camera size={20} aria-hidden />
          <span>Начать верификацию</span>
        </button>
      )}
    >
      <div className="seller-verification-drawer__content">
        <header className="seller-verification-drawer__header">
          <h2 id="seller-verification-drawer-title">{displayTitle}</h2>
          <p id="seller-verification-drawer-description">{displaySubtitle}</p>
        </header>

        <div className="seller-verification-drawer__info">
          <button type="button" className="seller-verification-drawer__item" onClick={handleStartVerification}>
              <span className="seller-verification-drawer__icon" aria-hidden="true">
                <img src="/images/verification/passport-3d.png" alt="" />
              </span>
              <span className="seller-verification-drawer__item-copy">
                <strong>Фото паспорта</strong>
                <small>
                  Загрузите фото или скан паспорта (разворот с фото)
                </small>
              </span>
              <ChevronRight size={19} aria-hidden />
          </button>

          <button type="button" className="seller-verification-drawer__item" onClick={handleStartVerification}>
              <span className="seller-verification-drawer__icon" aria-hidden="true">
                <img src="/images/verification/selfie-3d.png" alt="" />
              </span>
              <span className="seller-verification-drawer__item-copy">
                <strong>Ваше селфи</strong>
                <small>Загрузите ваше селфи</small>
              </span>
              <ChevronRight size={19} aria-hidden />
          </button>

          <button type="button" className="seller-verification-drawer__item" onClick={handleStartVerification}>
              <span className="seller-verification-drawer__icon" aria-hidden="true">
                <img src="/images/verification/selfie-with-passport-3d.png" alt="" />
              </span>
              <span className="seller-verification-drawer__item-copy">
                <strong>Селфи с паспортом</strong>
                <small>Держите паспорт рядом с лицом</small>
              </span>
              <ChevronRight size={19} aria-hidden />
          </button>
        </div>
      </div>
    </BuyerSheetShell>
  )
}

export default SellerVerificationModal
