import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Check,
  CircleHelp,
  Sparkles,
  X,
} from 'lucide-react'
import {
  sheetHandleDragProps,
  useBottomSheetDrag,
} from '../hooks/useBottomSheetDrag'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'
import { publicAsset } from '../utils/publicAsset'
import '../styles/drawerDismiss.css'
import './SectionInfoDrawer.css'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const TIFFANY_THEME = {
  accent: '#16a7b3',
  accentRgb: '22, 167, 179',
}

const SECTION_CONFIG = {
  auction: {
    iconSrc: publicAsset('images/home-sale-formats/icons/auction-3d.png'),
    ...TIFFANY_THEME,
  },
  shares: {
    iconSrc: publicAsset('images/home-sale-formats/icons/shares-3d.png'),
    ...TIFFANY_THEME,
  },
  debts: {
    iconSrc: publicAsset('images/home-sale-formats/icons/debts-3d.png'),
    ...TIFFANY_THEME,
  },
  testDrive: {
    iconSrc: publicAsset('images/home-sale-formats/icons/test-drive-3d.png'),
    ...TIFFANY_THEME,
  },
}

function getFocusableElements(root) {
  if (!root) return []
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  )
}

export default function SectionInfoDrawer({ section, placement = 'floating' }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isMobileSheet, setIsMobileSheet] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
  )
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)
  const triggerRef = useRef(null)
  const previousOverflowRef = useRef('')
  const titleId = useId()
  const descriptionId = useId()
  const config = SECTION_CONFIG[section] || SECTION_CONFIG.auction
  const translationPrefix = `sectionInfo_${section}`
  const { visible, isClosing, requestClose } = useDrawerDismiss(open, () => setOpen(false), {
    duration: 340,
  })

  const close = useCallback(() => {
    requestClose(() => triggerRef.current?.focus?.())
  }, [requestClose])

  const sheetDrag = useBottomSheetDrag({
    isOpen: open,
    visible,
    isClosing,
    requestClose: close,
    dismissOnly: true,
    applyVisual: isMobileSheet,
  })

  const setPanelRefs = useCallback(
    (node) => {
      panelRef.current = node
      sheetDrag.panelRef.current = isMobileSheet ? node : null
    },
    [isMobileSheet, sheetDrag.panelRef],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia('(max-width: 640px)')
    const sync = () => setIsMobileSheet(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!visible || typeof document === 'undefined') return undefined
    previousOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus?.())

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflowRef.current
    }
  }, [visible])

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(panelRef.current)
      if (!focusable.length) {
        event.preventDefault()
        panelRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [close],
  )

  const themeStyle = {
    '--section-info-accent': config.accent,
    '--section-info-accent-rgb': config.accentRgb,
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`section-info-trigger section-info-trigger--${placement}`}
        style={themeStyle}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('sectionInfo_trigger')}: ${t(`${translationPrefix}Title`)}`}
      >
        <span className="section-info-trigger__halo" aria-hidden />
        <span className="section-info-trigger__icon" aria-hidden>
          <CircleHelp size={21} strokeWidth={2.35} />
        </span>
        <span className="section-info-trigger__label">{t('sectionInfo_trigger')}</span>
      </button>

      {visible && typeof document !== 'undefined'
        ? createPortal(
            <div className="section-info-layer" style={themeStyle}>
              <div
                role="presentation"
                className={`section-info-backdrop${
                  isClosing ? ' drawer-dismiss-backdrop--closing' : ''
                }`}
                onClick={close}
              />
              <aside
                ref={setPanelRefs}
                className={`section-info-panel${
                  isClosing
                    ? ' drawer-dismiss-from-right--closing section-info-panel--closing'
                    : ''
                }${sheetDrag.isDragging ? ' section-info-panel--dragging' : ''}`}
                style={sheetDrag.panelDragStyle}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
              >
                <button
                  type="button"
                  className="section-info-panel__handle"
                  data-sheet-drag-zone
                  aria-label={t('sectionInfo_dragHandleAria')}
                  {...sheetHandleDragProps(sheetDrag)}
                >
                  <span aria-hidden />
                </button>
                <div className="section-info-panel__glow" aria-hidden />
                <div className="section-info-panel__header">
                  <span className="section-info-panel__eyebrow">
                    <Sparkles size={15} aria-hidden />
                    {t('sectionInfo_eyebrow')}
                  </span>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="section-info-panel__close"
                    onClick={close}
                    aria-label={t('closeAria')}
                  >
                    <X size={21} aria-hidden />
                  </button>
                </div>

                <div className="section-info-panel__hero">
                  <span className="section-info-panel__section-icon" aria-hidden>
                    <img src={config.iconSrc} alt="" />
                  </span>
                  <div>
                    <h2 id={titleId}>{t(`${translationPrefix}Title`)}</h2>
                    <p id={descriptionId}>{t(`${translationPrefix}Lead`)}</p>
                  </div>
                </div>

                <ol className="section-info-steps" aria-label={t('sectionInfo_stepsAria')}>
                  {[1, 2, 3].map((step) => (
                    <li key={step}>
                      <span className="section-info-steps__number" aria-hidden>
                        {step}
                      </span>
                      <span>{t(`${translationPrefix}Step${step}`)}</span>
                      <Check className="section-info-steps__check" size={17} aria-hidden />
                    </li>
                  ))}
                </ol>

                <div className="section-info-panel__note">
                  <CircleHelp size={21} aria-hidden />
                  <p>{t(`${translationPrefix}Note`)}</p>
                </div>

                <button type="button" className="section-info-panel__done" onClick={close}>
                  {t('sectionInfo_understood')}
                </button>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
