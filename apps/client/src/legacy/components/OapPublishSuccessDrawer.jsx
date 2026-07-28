import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import Confetti from './Confetti'
import './Confetti.css'
import './OapPublishSuccessDrawer.css'

export default function OapPublishSuccessDrawer({
  isOpen,
  onClose,
  onViewProperties,
  onGoHome,
}) {
  const { t } = useTranslation()
  const [entered, setEntered] = useState(false)
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.panel,
  })

  useEffect(() => {
    if (!visible) {
      setEntered(false)
      return undefined
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  if (!visible || typeof document === 'undefined') return null

  const handleViewProperties = () => {
    requestClose(() => onViewProperties?.())
  }

  const handleGoHome = () => {
    requestClose(() => onGoHome?.())
  }

  return createPortal(
    <>
      <div
        className={`oap-publish-success-drawer__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
        aria-hidden="true"
      />
      {visible && !isClosing ? (
        <Confetti className="oap-publish-success-drawer__confetti" />
      ) : null}
      <div
        className="oap-publish-success-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oap-publish-success-drawer-title"
      >
        <div
          className={`oap-publish-success-drawer__sheet${
            entered && !isClosing ? ' oap-publish-success-drawer__sheet--entering' : ''
          }${isClosing ? ' oap-publish-success-drawer__sheet--closing drawer-dismiss-from-bottom--closing' : ''}`}
        >
          <div className="oap-publish-success-drawer__handle" aria-hidden="true">
            <span className="oap-publish-success-drawer__handle-pill" />
          </div>

          <div className="oap-publish-success-drawer__body">
            <div className="oap-publish-success-drawer__badge" aria-hidden="true">
              <Check size={34} strokeWidth={2.5} />
            </div>

            <div className="oap-publish-success-drawer__copy">
              <h2 id="oap-publish-success-drawer-title" className="oap-publish-success-drawer__title">
                <span className="oap-publish-success-drawer__title-line">
                  {t('oap_journeyPublishSuccessTitleBefore')}
                </span>
                <span className="oap-publish-success-drawer__title-line">
                  <span className="oap-publish-success-drawer__pill">
                    {t('oap_journeyPublishSuccessTitleHighlight')}
                  </span>
                </span>
              </h2>
              <p className="oap-publish-success-drawer__lead">{t('oap_journeyPublishSuccessText')}</p>
            </div>

            <div className="oap-publish-success-drawer__actions">
              <button
                type="button"
                className="oap-publish-success-drawer__cta"
                onClick={handleViewProperties}
              >
                {t('oap_journeyPublishSuccessPropertiesBtn')}
              </button>
              <button
                type="button"
                className="oap-publish-success-drawer__secondary"
                onClick={handleGoHome}
              >
                {t('oap_journeyPublishSuccessHomeBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
