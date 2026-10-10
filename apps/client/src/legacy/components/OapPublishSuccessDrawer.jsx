import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Check } from 'lucide-react'
import { sheetHandleDragProps, useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { triggerPublishSuccessHaptic } from '../utils/haptics'
import { setNativePublishSuccessVibrationActive } from '../utils/nativeDomBridge'
import Confetti from './Confetti'
import './Confetti.css'
import './OapPublishSuccessDrawer.css'

export default function OapPublishSuccessDrawer({
  isOpen,
  onClose,
  onViewProperties,
}) {
  const { t } = useTranslation()
  const [entered, setEntered] = useState(false)
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.panel,
  })
  const sheetDrag = useBottomSheetDrag({
    isOpen,
    visible,
    isClosing,
    requestClose,
    dismissOnly: true,
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

  useEffect(() => {
    if (!isOpen || isClosing) return undefined
    let cancelled = false
    let stopBrowserHaptic = null

    void setNativePublishSuccessVibrationActive(true)
      .then((handled) => {
        if (cancelled) return
        if (!handled) stopBrowserHaptic = triggerPublishSuccessHaptic()
      })
      .catch(() => {
        if (!cancelled) stopBrowserHaptic = triggerPublishSuccessHaptic()
      })

    return () => {
      cancelled = true
      stopBrowserHaptic?.()
      void setNativePublishSuccessVibrationActive(false)
    }
  }, [isOpen, isClosing])

  if (!visible || typeof document === 'undefined') return null

  const handleViewProperties = () => {
    requestClose(() => onViewProperties?.())
  }

  return createPortal(
    <>
      <div
        className={`oap-publish-success-drawer__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
        aria-hidden="true"
      />
      {visible && !isClosing ? (
        <Confetti className="oap-publish-success-drawer__confetti" count={110} minSize={6} maxSize={13} loop spreadOnMount />
      ) : null}
      <div
        className="oap-publish-success-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oap-publish-success-drawer-title"
        aria-describedby="oap-publish-success-drawer-description"
      >
        <div
          ref={sheetDrag.panelRef}
          className={`oap-publish-success-drawer__sheet${
            entered && !isClosing ? ' oap-publish-success-drawer__sheet--entering' : ''
          }${isClosing ? ' oap-publish-success-drawer__sheet--closing drawer-dismiss-from-bottom--closing' : ''}`}
          style={sheetDrag.panelDragStyle}
        >
          <div
            className="oap-publish-success-drawer__handle"
            aria-hidden="true"
            {...sheetHandleDragProps(sheetDrag)}
          >
            <span className="oap-publish-success-drawer__handle-pill" />
          </div>

          <div className="oap-publish-success-drawer__body">
            <div className="oap-publish-success-drawer__badge" aria-hidden="true">
              <Badge className="oap-publish-success-drawer__badge-shape" size={86} strokeWidth={1.7} />
              <Check className="oap-publish-success-drawer__badge-check" size={43} strokeWidth={3.2} />
            </div>

            <div className="oap-publish-success-drawer__copy">
              <h2 id="oap-publish-success-drawer-title" className="oap-publish-success-drawer__title">
                {t('oap_journeyPublishSuccessTitle')}
              </h2>
              <p id="oap-publish-success-drawer-description" className="oap-publish-success-drawer__lead">
                {t('oap_journeyPublishSuccessText')}
              </p>
            </div>

            <div className="oap-publish-success-drawer__actions">
              <button
                type="button"
                className="oap-publish-success-drawer__cta"
                onClick={handleViewProperties}
              >
                {t('oap_journeyPublishSuccessPropertiesBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
