import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Code2, Copy, Rocket, Zap } from 'lucide-react'
import { useMobileModalLayout } from '../hooks/useMobileModalLayout'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import '../styles/drawerDismiss.css'
import './DebtsRiskDrawer.css'

const FEATURE_ICONS = [Copy, Code2, Rocket, Zap]

function DebtsRiskDrawerBody({ risk, onCta }) {
  if (!risk) return null
  const Icon = risk.icon
  const iconSrc = risk.iconSrc
  const accent = risk.color
  const ctaLabel = String(risk.ctaText || '')
    .replace(/^(\p{Extended_Pictographic}\p{Emoji_Modifier}*|\p{Emoji_Presentation})(\uFE0F|\u200D\p{Extended_Pictographic})*\s+/u, '')
    .trim()

  return (
    <div className="debts-risk-drawer__body" style={{ '--debts-risk-accent': accent }}>
      <header className="debts-risk-drawer__header">
        <span
          className={`debts-risk-drawer__icon${iconSrc ? ' debts-risk-drawer__icon--image' : ''}`}
          style={{ background: iconSrc ? 'transparent' : accent }}
        >
          {iconSrc ? (
            <img src={iconSrc} alt="" aria-hidden />
          ) : (
            <Icon size={22} color="#fff" strokeWidth={2} aria-hidden />
          )}
        </span>
        <div className="debts-risk-drawer__heading">
          <h2 id="debts-risk-drawer-title">{risk.title}</h2>
          {risk.subtitle ? <p>{risk.subtitle}</p> : null}
        </div>
      </header>

      {risk.description ? (
        <p className="debts-risk-drawer__description">{risk.description}</p>
      ) : null}

      {risk.features?.length ? (
        <ul className="debts-risk-drawer__features">
          {risk.features.map((feature, index) => {
            const FeatureIcon = FEATURE_ICONS[index % FEATURE_ICONS.length]
            return (
              <li key={feature}>
                <span className="debts-risk-drawer__feature-icon">
                  <FeatureIcon size={15} aria-hidden />
                </span>
                <span>{feature}</span>
              </li>
            )
          })}
        </ul>
      ) : null}

      {ctaLabel ? (
        <button type="button" className="debts-risk-drawer__cta" onClick={onCta}>
          <span>
            {iconSrc ? <img src={iconSrc} alt="" aria-hidden /> : <Icon size={18} aria-hidden />}
            {ctaLabel}
          </span>
          <ArrowRight size={16} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

export default function DebtsRiskDrawer({ open, onClose, risk }) {
  const { t } = useTranslation()
  const isMobile = useMobileModalLayout()
  const { visible, isClosing, requestClose } = useDrawerDismiss(open, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })
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
    isOpen: open,
    visible,
    isClosing,
    requestClose,
    panelClosingClass: 'debts-risk-drawer__panel--closing',
    maxViewportHeightRatio: 0.82,
  })

  useEffect(() => {
    if (!visible) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [visible])

  if (!visible || !risk) return null

  const closeLabel = t('close')
  const handleBackdropClose = () => requestClose()

  if (!isMobile) {
    return createPortal(
      <div className="debts-risk-drawer-overlay" onClick={handleBackdropClose} role="presentation">
        <div
          className="debts-risk-drawer-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="debts-risk-drawer-title"
        >
          <button
            type="button"
            className="debts-risk-drawer__close"
            onClick={handleBackdropClose}
            aria-label={closeLabel}
          >
            <span aria-hidden>×</span>
          </button>
          <DebtsRiskDrawerBody risk={risk} onCta={handleBackdropClose} />
        </div>
      </div>,
      document.body,
    )
  }

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanelClasses = isClosing
    ? `${closingPanel} drawer-dismiss-from-bottom--closing`
    : closingPanel

  return createPortal(
    <>
      <div
        role="presentation"
        className={`debts-risk-drawer__backdrop${closingBackdrop}`}
        onClick={handleBackdropClose}
      />
      <div
        className={`debts-risk-drawer${isDragging ? ' debts-risk-drawer--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="debts-risk-drawer-title"
      >
        <div
          ref={panelRef}
          className={`debts-risk-drawer__panel${closingPanelClasses}${isCollapsed ? ' debts-risk-drawer__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div className="debts-risk-drawer__toolbar">
            <span className="debts-risk-drawer__toolbar-spacer" aria-hidden />
            <div
              className="debts-risk-drawer__drag-zone"
              onPointerDown={onDragZonePointerDown}
              onPointerMove={onDragZonePointerMove}
              onPointerUp={onDragZonePointerUp}
              onPointerCancel={onDragZonePointerCancel}
            >
              <div className="debts-risk-drawer__handle" aria-hidden="true">
                <span className="debts-risk-drawer__handle-pill" />
              </div>
            </div>
            <button
              type="button"
              className="debts-risk-drawer__close"
              onClick={handleBackdropClose}
              aria-label={closeLabel}
            >
              <span aria-hidden>×</span>
            </button>
          </div>
          <div className="debts-risk-drawer__scroll">
            <DebtsRiskDrawerBody risk={risk} onCta={handleBackdropClose} />
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
