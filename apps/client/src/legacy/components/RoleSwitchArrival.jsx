import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiCheck, FiX } from 'react-icons/fi'
import { getUserData } from '../services/authService'
import { readStoredUserRole } from '../utils/cabinetRoutes'
import { clearRoleSwitchArrival, readRoleSwitchArrival } from '../utils/roleSwitchArrival'
import { publicAsset } from '../utils/publicAsset'
import { clearRoleSwitchTransition, readRoleSwitchTransition } from '../utils/roleSwitchTransition'
import './InvestmentCompassPromoModal.css'
import './RoleSwitchArrival.css'

const ArrivalContext = createContext(false)
const ArrivalReadyContext = createContext(null)
export const useRoleSwitchArrival = () => useContext(ArrivalContext)

export function useRoleSwitchDestinationReady(ready) {
  const markReady = useContext(ArrivalReadyContext)
  useEffect(() => {
    if (ready) markReady?.()
  }, [ready, markReady])
}

export function RoleSwitchArrivalModal({ role, onClose }) {
  const { t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const ctaRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const seller = role === 'seller'

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ctaRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const buttons = [...dialogRef.current.querySelectorAll('button:not([disabled])')]
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus?.()
    }
  }, [])

  return createPortal(
    <div className="investment-compass-promo-modal__overlay role-switch-arrival__overlay">
      <div className="investment-compass-promo-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="investment-compass-promo-modal role-switch-arrival"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="investment-compass-promo-modal__card role-switch-arrival__card">
          <div className="investment-compass-promo-modal__hero role-switch-arrival__hero" aria-hidden="true">
            <span className="role-switch-arrival__orbit" />
            <img
              className="investment-compass-promo-modal__illustration role-switch-arrival__illustration"
              src={publicAsset('images/role-switch/cabinet-arrival-v1.webp')}
              alt=""
              width="768"
              height="768"
              decoding="async"
            />
          </div>
          <div className="investment-compass-promo-modal__content role-switch-arrival__content">
            <p className="role-switch-arrival__status"><FiCheck size={14} aria-hidden="true" />{t('roleSwitch_arrivalStatus')}</p>
            <h2 id={titleId} className="investment-compass-promo-modal__title role-switch-arrival__title">
              <span>{t('roleSwitch_arrivalTitle')}</span>
              <strong>{seller ? t('roleSwitch_arrivalSeller') : t('roleSwitch_arrivalBuyer')}</strong>
            </h2>
            <p id={descriptionId} className="investment-compass-promo-modal__lead role-switch-arrival__lead">
              {seller ? t('roleSwitch_arrivalSellerDescription') : t('roleSwitch_arrivalBuyerDescription')}
            </p>
            <button ref={ctaRef} type="button" className="investment-compass-promo-modal__cta role-switch-arrival__cta" onClick={onClose}>
              <span>{t('roleSwitch_arrivalContinue')}</span><FiArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <button type="button" className="investment-compass-promo-modal__close" onClick={onClose} aria-label={t('close')}>
          <FiX size={24} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

/** Mounted by the destination route, after its lazy page has loaded. */
export default function RoleSwitchArrival({ role, children }) {
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])
  const [arrival, setArrival] = useState(() => {
    const user = getUserData()
    if (localStorage.getItem('isLoggedIn') !== 'true') return null
    return readRoleSwitchArrival({ role: readStoredUserRole(), userId: user?.id || localStorage.getItem('userId') })
  })
  const active = Boolean(arrival?.role === role)

  useEffect(() => {
    if (active && ready) {
      clearRoleSwitchArrival()
      const transition = readRoleSwitchTransition()
      if (transition?.userId === arrival.userId && transition.role === role) clearRoleSwitchTransition(transition.id)
    }
  }, [active, ready, arrival, role])

  return (
    <ArrivalContext.Provider value={active}>
      <ArrivalReadyContext.Provider value={markReady}>
        {children}
      </ArrivalReadyContext.Provider>
      {active && ready ? <RoleSwitchArrivalModal role={role} onClose={() => setArrival(null)} /> : null}
    </ArrivalContext.Provider>
  )
}
