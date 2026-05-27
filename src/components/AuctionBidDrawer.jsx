import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import './AuctionBidDrawer.css'

const DISMISS_DRAG_PX = 100

export default function AuctionBidDrawer({ isOpen, onClose, title, children }) {
  const { t } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartYRef = useRef(0)
  const dragYRef = useRef(0)
  const panelRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setDragY(0)
      dragYRef.current = 0
      setIsDragging(false)
    }
  }, [isOpen])

  const finishDrag = useCallback(() => {
    setIsDragging(false)
    if (dragYRef.current >= DISMISS_DRAG_PX) {
      requestClose()
      return
    }
    setDragY(0)
    dragYRef.current = 0
  }, [requestClose])

  const onDragZonePointerDown = useCallback((e) => {
    if (isClosing) return
    e.preventDefault()
    setIsDragging(true)
    dragStartYRef.current = e.clientY - dragYRef.current
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [isClosing])

  const onDragZonePointerMove = useCallback(
    (e) => {
      if (!isDragging) return
      const next = Math.max(0, e.clientY - dragStartYRef.current)
      dragYRef.current = next
      setDragY(next)
    },
    [isDragging],
  )

  const onDragZonePointerUp = useCallback(
    (e) => {
      if (!isDragging) return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      finishDrag()
    },
    [isDragging, finishDrag],
  )

  const onDragZonePointerCancel = useCallback(() => {
    if (!isDragging) return
    finishDrag()
  }, [isDragging, finishDrag])

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanel = isClosing ? ' auction-bid-drawer__panel--closing' : ''
  const panelDragStyle =
    isDragging || dragY > 0
      ? {
          transform: `translate3d(0, ${dragY}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 1, 0.32, 1)',
        }
      : undefined

  return createPortal(
    <>
      <div
        role="presentation"
        className={`auction-bid-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`auction-bid-drawer${isDragging ? ' auction-bid-drawer--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-bid-drawer-title"
      >
        <div
          ref={panelRef}
          className={`auction-bid-drawer__panel${closingPanel}`}
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
          <button
            type="button"
            className="auction-bid-drawer__close"
            onClick={() => requestClose()}
            aria-label={t('closeAria')}
          >
            <FiX size={20} />
          </button>
          {title ? (
            <h2 id="auction-bid-drawer-title" className="auction-bid-drawer__title">
              {title}
            </h2>
          ) : null}
          <div className="auction-bid-drawer__body">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  )
}
