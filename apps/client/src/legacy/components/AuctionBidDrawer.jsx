import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiChevronLeft } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import './AuctionBidDrawer.css'

export default function AuctionBidDrawer({ isOpen, onClose, title, children, contextAnchorSelector }) {
  const { t } = useTranslation()
  const [keyboardViewport, setKeyboardViewport] = useState(null)
  const [isOpening, setIsOpening] = useState(isOpen)
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  useEffect(() => {
    if (!isOpen) return undefined
    setIsOpening(true)
    const timer = window.setTimeout(() => setIsOpening(false), 620)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  useLayoutEffect(() => {
    if (!visible || !window.visualViewport) return
    const viewport = window.visualViewport
    const updateViewport = () => {
      setKeyboardViewport(window.innerHeight - viewport.height > 120
        ? { height: viewport.height, top: viewport.offsetTop }
        : null)
    }
    updateViewport()
    viewport.addEventListener('resize', updateViewport)
    viewport.addEventListener('scroll', updateViewport)
    return () => {
      viewport.removeEventListener('resize', updateViewport)
      viewport.removeEventListener('scroll', updateViewport)
    }
  }, [visible])

  const {
    panelRef,
    isDragging,
    panelDragStyle,
    isCollapsed,
    closingPanel,
    onDragZonePointerDown,
    onDragZonePointerMove,
    onDragZonePointerUp,
    onDragZonePointerCancel,
  } = useBottomSheetDrag({
    isOpen,
    visible,
    isClosing,
    requestClose,
    panelClosingClass: 'auction-bid-drawer__panel--closing',
    dismissOnly: true,
  })

  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const previousFocus = document.activeElement
    const panel = panelRef.current
    panel?.querySelector('.auction-bid-drawer__close')?.focus({ preventScroll: true })
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        // Let the currency picker close before dismissing its parent sheet.
        if (panel.querySelector('[aria-expanded="true"]')) return
        event.preventDefault()
        requestCloseRef.current()
      }
      if (event.key !== 'Tab') return
      const controls = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
        .filter((element) => element.getClientRects().length)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault()
        last?.focus({ preventScroll: true })
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault()
        first?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [visible, panelRef])

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanelClasses = isClosing
    ? `${closingPanel} drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing`
    : closingPanel

  return createPortal(
    <>
      <div
        role="presentation"
        className={`auction-bid-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`auction-bid-drawer${isDragging ? ' auction-bid-drawer--dragging' : ''}${keyboardViewport ? ' auction-bid-drawer--keyboard' : ''}`}
        style={keyboardViewport ? { ...keyboardViewport, bottom: 'auto' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-bid-drawer-title"
      >
        <div
          ref={panelRef}
          className={`auction-bid-drawer__panel${closingPanelClasses}${
            isOpening && !isClosing ? ' auction-bid-drawer__panel--entering' : ''
          }${isCollapsed ? ' auction-bid-drawer__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div
            className="auction-bid-drawer__drag-zone"
            onPointerDown={(event) => {
              setIsOpening(false)
              onDragZonePointerDown(event)
            }}
            onPointerMove={onDragZonePointerMove}
            onPointerUp={onDragZonePointerUp}
            onPointerCancel={onDragZonePointerCancel}
          >
            <div className="auction-bid-drawer__handle" aria-hidden="true">
              <span className="auction-bid-drawer__handle-pill" />
            </div>
          </div>

          <div className="auction-bid-drawer__header">
            <h2 id="auction-bid-drawer-title" className="auction-bid-drawer__title-sr">
              {title || t('placeBid')}
            </h2>
            <button
              type="button"
              className="auction-bid-drawer__close"
              onClick={() => requestClose()}
              aria-label={t('closeAria')}
            >
              <FiChevronLeft size={20} />
            </button>
          </div>

          <div className="auction-bid-drawer__body">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  )
}
