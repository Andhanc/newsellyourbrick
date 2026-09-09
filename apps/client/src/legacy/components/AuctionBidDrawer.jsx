import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import './AuctionBidDrawer.css'

export default function AuctionBidDrawer({ isOpen, onClose, title, children, contextAnchorSelector }) {
  const { t } = useTranslation()
  const [keyboardViewport, setKeyboardViewport] = useState(null)
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

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
    isEntering,
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

  // Keep the real listing photo and countdown in view, even when opened far down the page.
  useLayoutEffect(() => {
    if (!visible || !contextAnchorSelector || !window.matchMedia('(max-width: 960px)').matches) return
    const anchor = document.querySelector(contextAnchorSelector)
    const panel = panelRef.current
    if (!anchor || !panel || !anchor.getClientRects().length) return
    const scrollRoot = anchor.closest('.app-layout')
    const scrollTarget = scrollRoot || window
    const originalScrollY = scrollRoot?.scrollTop ?? window.scrollY
    const originalOverflow = scrollRoot?.style.overflowY
    if (scrollRoot) scrollRoot.style.overflowY = 'hidden'
    const alignContext = () => {
      const timerBottom = anchor.getBoundingClientRect().bottom + (scrollRoot?.scrollTop ?? window.scrollY)
      const viewport = window.visualViewport
      const viewportBottom = viewport && window.innerHeight - viewport.height > 120
        ? viewport.height + viewport.offsetTop
        : window.innerHeight
      const bottomInset = parseFloat(window.getComputedStyle(panel).marginBottom) || 0
      const visibleBottom = viewportBottom - panel.offsetHeight - bottomInset - 12
      scrollTarget.scrollTo({ top: Math.max(0, timerBottom - visibleBottom), behavior: 'instant' })
    }
    alignContext()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(alignContext) : null
    observer?.observe(panel)
    observer?.observe(anchor)
    window.addEventListener('resize', alignContext)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', alignContext)
      if (scrollRoot) scrollRoot.style.overflowY = originalOverflow
      scrollTarget.scrollTo({ top: originalScrollY, behavior: 'instant' })
    }
  }, [visible, contextAnchorSelector, panelRef])

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
        requestClose()
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
  }, [visible, panelRef, requestClose])

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
            isEntering ? ' auction-bid-drawer__panel--entering' : ''
          }${isCollapsed ? ' auction-bid-drawer__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div
            className="auction-bid-drawer__drag-zone"
            onPointerDown={onDragZonePointerDown}
            onPointerMove={onDragZonePointerMove}
            onPointerUp={onDragZonePointerUp}
            onPointerCancel={onDragZonePointerCancel}
          >
            <div className="auction-bid-drawer__handle" aria-hidden="true">
              <span className="auction-bid-drawer__handle-pill" />
            </div>
          </div>

          <div className="auction-bid-drawer__header">
            {title ? (
              <h2 id="auction-bid-drawer-title" className="auction-bid-drawer__title">
                {title}
              </h2>
            ) : (
              <span id="auction-bid-drawer-title" className="auction-bid-drawer__title-sr">
                {t('placeBid')}
              </span>
            )}
            <button
              type="button"
              className="auction-bid-drawer__close"
              onClick={() => requestClose()}
              aria-label={t('closeAria')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="auction-bid-drawer__body">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  )
}
