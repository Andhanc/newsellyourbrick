import { Suspense, lazy, useEffect, useState } from 'react'
import { Camera, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import './SellerVerificationModal.css'

const VerificationModalLazy = lazy(() => import('./VerificationModal'))

const SellerVerificationModal = ({ isOpen, onClose, userId, onComplete, required, title, subtitle }) => {
  const { t } = useTranslation()
  const [showVerification, setShowVerification] = useState(false)
  const displayTitle = title ?? t('verificationModal_sellerDefaultTitle')
  const displaySubtitle = subtitle ?? t('verificationModal_sellerDefaultSubtitle')

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
            if (!required) onClose()
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
      closeLabel={t('verificationModal_closeLabel')}
      dismissible={!required}
      className="seller-verification-drawer"
      footer={(
        <button
          type="button"
          className="seller-verification-drawer__cta"
          onClick={handleStartVerification}
        >
          <Camera size={20} aria-hidden />
          <span>{t('verificationModal_startCta')}</span>
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
                <strong>{t('verificationModal_passportTitle')}</strong>
                <small>{t('verificationModal_passportDesc')}</small>
              </span>
              <ChevronRight size={19} aria-hidden />
          </button>

          <button type="button" className="seller-verification-drawer__item" onClick={handleStartVerification}>
              <span className="seller-verification-drawer__icon" aria-hidden="true">
                <img src="/images/verification/selfie-3d.png" alt="" />
              </span>
              <span className="seller-verification-drawer__item-copy">
                <strong>{t('verificationModal_selfieTitle')}</strong>
                <small>{t('verificationModal_selfieDesc')}</small>
              </span>
              <ChevronRight size={19} aria-hidden />
          </button>

          <button type="button" className="seller-verification-drawer__item" onClick={handleStartVerification}>
              <span className="seller-verification-drawer__icon" aria-hidden="true">
                <img src="/images/verification/selfie-with-passport-3d.png" alt="" />
              </span>
              <span className="seller-verification-drawer__item-copy">
                <strong>{t('verificationModal_selfieWithPassportTitle')}</strong>
                <small>{t('verificationModal_selfieWithPassportDesc')}</small>
              </span>
              <ChevronRight size={19} aria-hidden />
          </button>
        </div>
      </div>
    </BuyerSheetShell>
  )
}

export default SellerVerificationModal
