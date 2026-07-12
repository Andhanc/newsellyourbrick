import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { navigateToSearchCatalog } from '../utils/searchCatalogNavigation'
import './AuctionSoldOutNotice.css'

function AuctionSoldOutIllustration({ className = '' }) {
  return (
    <div className={`auction-sold-notice__illustration ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M35 129c0-46 37-83 83-83h24c46 0 83 37 83 83v25H35v-25Z" fill="#F0FAFB" />
        <circle cx="47" cy="51" r="5" fill="#5ED6D1" />
        <circle cx="214" cy="59" r="4" fill="#0099A9" />
        <path d="m205 39 2.5 5.5L213 47l-5.5 2.5L205 55l-2.5-5.5L197 47l5.5-2.5L205 39Z" fill="#0099A9" />
        <path d="M21 138h72M167 138h72" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />

        <path d="M28 101 60 73l32 28v37H28v-37Z" fill="#DDF6F5" stroke="#0F172A" strokeWidth="3" strokeLinejoin="round" />
        <path d="m21 102 39-34 39 34" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M43 107h15v31H43zM66 108h15v15H66z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="31" cy="66" r="18" fill="#0099A9" />
        <path d="m22 66 6 6 11-13" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        <path d="M99 112c18 0 24-20 42-20h6" stroke="#0099A9" strokeWidth="4" strokeLinecap="round" />
        <path d="m141 83 15 9-15 9" fill="#0099A9" />

        <path d="M164 98 200 66l36 32v40h-72v-40Z" fill="#0099A9" opacity=".14" />
        <path d="M168 101 200 73l32 28v37h-64v-37Z" fill="#F0FAFB" stroke="#0F172A" strokeWidth="3" strokeLinejoin="round" />
        <path d="m161 102 39-34 39 34" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M185 107h15v31h-15zM208 108h15v15h-15z" fill="#5ED6D1" stroke="#0F172A" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="m231 53 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#0099A9" />
        <path d="M176 146h48" stroke="#5ED6D1" strokeWidth="5" strokeLinecap="round" />

        <path d="M109 151a13 13 0 1 0 0-26 13 13 0 0 0 0 26Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
        <path d="M119 143h29l7 7-7 7h-8v7h-9v-7h-12v-14Z" fill="#5ED6D1" stroke="#0F172A" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="109" cy="138" r="4" stroke="#0099A9" strokeWidth="3" />
      </svg>
    </div>
  )
}

export default function AuctionSoldOutNotice({ open, onClose, property, isMobile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { visible, isClosing, requestClose } = useDrawerDismiss(open, onClose, { duration: DRAWER_DISMISS_MS.panel })

  useEffect(() => {
    if (!visible) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, requestClose])

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanel = isClosing
    ? isMobile
      ? ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing'
      : ' drawer-dismiss-modal--closing'
    : ''

  const onNavigateToCatalog = () => {
    requestClose()
    navigateToSearchCatalog(navigate, { property })
  }

  return createPortal(
    isMobile ? (
      <div className="auction-sold-notice-drawer" role="presentation">
        <div
          className={`auction-sold-notice-drawer__backdrop${closingBackdrop}`}
          role="presentation"
          onClick={() => requestClose()}
        />
        <div
          className={`auction-sold-notice-drawer__panel${closingPanel}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auction-sold-notice-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="auction-sold-notice-drawer__drag-zone" aria-hidden>
            <span className="auction-sold-notice-drawer__handle" />
          </div>

          <button
            type="button"
            className="auction-sold-notice-drawer__close"
            onClick={() => requestClose()}
            aria-label={t('closeAria') || 'Закрыть'}
          >
            <FiX size={20} />
          </button>

          <div className="auction-sold-notice__body">
            <AuctionSoldOutIllustration />

            <h2 id="auction-sold-notice-title" className="auction-sold-notice__title">
              Объект продан
            </h2>
            <p className="auction-sold-notice__lead">
              Этот объект уже продан. Посмотрите похожие предложения: возможно, среди них есть вариант,
              который подойдёт вам даже лучше.
            </p>

            <button type="button" className="auction-sold-notice__cta" onClick={onNavigateToCatalog}>
              Перейти к похожим
              <FiArrowRight size={18} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="auction-sold-notice-modal" role="presentation">
        <div
          className={`auction-sold-notice-modal__backdrop${closingBackdrop}`}
          role="presentation"
          onClick={() => requestClose()}
        />
        <div
          className={`auction-sold-notice-modal__panel${closingPanel}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auction-sold-notice-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="auction-sold-notice-modal__close"
            onClick={() => requestClose()}
            aria-label={t('closeAria') || 'Закрыть'}
          >
            <FiX size={20} />
          </button>

          <div className="auction-sold-notice__body">
            <AuctionSoldOutIllustration />

            <h2 id="auction-sold-notice-title" className="auction-sold-notice__title">
              Объект продан
            </h2>
            <p className="auction-sold-notice__lead">
              Этот объект уже продан. Посмотрите похожие предложения: возможно, среди них есть вариант,
              который подойдёт вам даже лучше.
            </p>

            <button type="button" className="auction-sold-notice__cta" onClick={onNavigateToCatalog}>
              Перейти к похожим
              <FiArrowRight size={18} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    ),
    document.body,
  )
}
