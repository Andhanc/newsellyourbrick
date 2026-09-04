import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import OwnerCabinetOnboardingDrawer from './OwnerCabinetOnboardingDrawer'
import { ProfileSpotlightOnboarding } from './ProfileSpotlightOnboarding'
import { OWNER_CABINET_WELCOME_PRESET } from './ownerCabinetWelcomePresets'
import { useOwnerTestNav } from '../context/OwnerTestNavigationContext'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import {
  OWNER_CABINET_WELCOME_PREVIEW_EVENT,
  clearOwnerCabinetOnboardingComplete,
  hasCompletedOwnerCabinetOnboarding,
  markOwnerCabinetOnboardingComplete,
} from '../utils/ownerCabinetOnboarding'
import { getOwnerProfileCompletion } from '../utils/ownerTestProfile'
import { OWNER_VIEWS } from '../utils/ownerTestNav'
import { getStoredNumericUserId } from '../services/authService'
import { showNotification } from '../utils/toastHelper'

/** Пока заполнение профиля ниже порога — показываем welcome + spotlight + гейт. */
export const OWNER_WELCOME_MIN_COMPLETE_PCT = 78

const OWNER_WELCOME_PREVIEW_QUERY = 'owner_welcome'
const SPOTLIGHT_FOLDER_MS = 2200
const SPOTLIGHT_FORM_MS = 2400
const SPOTLIGHT_START_DELAY_MS = 420
const GATE_WARN_COOLDOWN_MS = 1600

const OwnerWelcomeUiContext = createContext({
  personalFolderRef: { current: null },
  personalTabRef: { current: null },
  personalDataSectionRef: { current: null },
  spotlightPhase: null,
  gateLocked: false,
  warnGateLocked: () => false,
})

export function useOwnerWelcomeUi() {
  return useContext(OwnerWelcomeUiContext)
}

function isElementVisible(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false
  const rect = el.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1
}

/**
 * Welcome-drawer продавца → профиль → spotlight (папка → форма) → гейт до заполнения.
 * Монтируется внутри OwnerTestNavigationProvider + OwnerTestProfileProvider.
 */
export default function OwnerCabinetWelcomeHost({ children = null }) {
  const { t } = useTranslation()
  const { view, goTo } = useOwnerTestNav()
  const { profile, loading: profileLoading } = useOwnerTestProfile()
  const [searchParams, setSearchParams] = useSearchParams()
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  /** null | 'folder' | 'form' */
  const [spotlightPhase, setSpotlightPhase] = useState(null)
  const personalFolderRef = useRef(null)
  const personalTabRef = useRef(null)
  const personalDataSectionRef = useRef(null)
  const openedOnceRef = useRef(false)
  const tourTokenRef = useRef(0)
  const lastGateWarnAtRef = useRef(0)

  const folderTargetRef = useMemo(
    () => ({
      get current() {
        if (isElementVisible(personalFolderRef.current)) return personalFolderRef.current
        if (isElementVisible(personalTabRef.current)) return personalTabRef.current
        return personalFolderRef.current || personalTabRef.current
      },
    }),
    [],
  )

  const userId = useMemo(() => {
    const stored = getStoredNumericUserId() ?? localStorage.getItem('userId')
    const id = String(stored || '').trim()
    return /^\d+$/.test(id) ? id : null
  }, [])

  const completion = useMemo(() => getOwnerProfileCompletion(profile), [profile])
  const welcomeCompleted = hasCompletedOwnerCabinetOnboarding(userId)
  const needsProfileOnboarding =
    !profileLoading && Boolean(profile) && completion.pct < OWNER_WELCOME_MIN_COMPLETE_PCT

  const welcomeEligible = Boolean(userId) && needsProfileOnboarding && !welcomeCompleted

  const gateLocked =
    Boolean(userId) &&
    welcomeCompleted &&
    needsProfileOnboarding &&
    !welcomeOpen

  const warnGateLocked = useCallback(() => {
    if (!gateLocked) return false
    const now = Date.now()
    if (now - lastGateWarnAtRef.current >= GATE_WARN_COOLDOWN_MS) {
      lastGateWarnAtRef.current = now
      showNotification(t('ownerWelcome_gateFillToContinue'), 'info')
    }
    return true
  }, [gateLocked, t])

  const startSpotlightTour = useCallback(() => {
    const token = ++tourTokenRef.current
    setSpotlightPhase('folder')
    window.setTimeout(() => {
      if (tourTokenRef.current !== token) return
      folderTargetRef.current?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }, 40)

    window.setTimeout(() => {
      if (tourTokenRef.current !== token) return
      setSpotlightPhase('form')
      personalDataSectionRef.current?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      })
    }, SPOTLIGHT_FOLDER_MS)

    window.setTimeout(() => {
      if (tourTokenRef.current !== token) return
      setSpotlightPhase(null)
    }, SPOTLIGHT_FOLDER_MS + SPOTLIGHT_FORM_MS)
  }, [folderTargetRef])

  useEffect(() => {
    if (searchParams.get(OWNER_WELCOME_PREVIEW_QUERY) !== '1') return undefined
    tourTokenRef.current += 1
    setSpotlightPhase(null)
    setWelcomeOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete(OWNER_WELCOME_PREVIEW_QUERY)
    setSearchParams(next, { replace: true })
    return undefined
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!welcomeEligible || welcomeOpen || openedOnceRef.current) return undefined
    const timer = window.setTimeout(() => {
      openedOnceRef.current = true
      setWelcomeOpen(true)
    }, 480)
    return () => window.clearTimeout(timer)
  }, [welcomeEligible, welcomeOpen])

  const completeWelcome = useCallback(() => {
    markOwnerCabinetOnboardingComplete(userId)
    setWelcomeOpen(false)
    goTo(OWNER_VIEWS.PROFILE, { tab: 'personal' })
    window.setTimeout(() => {
      startSpotlightTour()
    }, SPOTLIGHT_START_DELAY_MS)
  }, [goTo, startSpotlightTour, userId])

  useEffect(() => {
    const openPreview = () => {
      tourTokenRef.current += 1
      setSpotlightPhase(null)
      setWelcomeOpen(true)
    }
    window.addEventListener(OWNER_CABINET_WELCOME_PREVIEW_EVENT, openPreview)
    window.__previewOwnerCabinetWelcome = openPreview
    window.__resetOwnerCabinetWelcome = (id) => {
      clearOwnerCabinetOnboardingComplete(id ?? userId ?? localStorage.getItem('userId'))
    }
    return () => {
      window.removeEventListener(OWNER_CABINET_WELCOME_PREVIEW_EVENT, openPreview)
      delete window.__previewOwnerCabinetWelcome
      delete window.__resetOwnerCabinetWelcome
    }
  }, [userId])

  useEffect(() => {
    if (!spotlightPhase) return undefined
    if (view !== OWNER_VIEWS.PROFILE || !needsProfileOnboarding) {
      tourTokenRef.current += 1
      setSpotlightPhase(null)
    }
    return undefined
  }, [spotlightPhase, view, needsProfileOnboarding])

  /** Гейт: не даём уйти с профиля, пока данные не заполнены. */
  useEffect(() => {
    if (!gateLocked) return undefined
    if (view === OWNER_VIEWS.PROFILE) return undefined
    warnGateLocked()
    goTo(OWNER_VIEWS.PROFILE, { tab: 'personal' })
    return undefined
  }, [gateLocked, view, goTo, warnGateLocked])

  useEffect(() => {
    const bodyClass = 'owner-profile-onboarding-gate-locked'
    if (gateLocked) {
      document.body.classList.add(bodyClass)
      return () => {
        document.body.classList.remove(bodyClass)
      }
    }
    document.body.classList.remove(bodyClass)
    return undefined
  }, [gateLocked])

  const uiValue = useMemo(
    () => ({
      personalFolderRef,
      personalTabRef,
      personalDataSectionRef,
      spotlightPhase,
      gateLocked,
      warnGateLocked,
    }),
    [spotlightPhase, gateLocked, warnGateLocked],
  )

  return (
    <OwnerWelcomeUiContext.Provider value={uiValue}>
      {children}
      <OwnerCabinetOnboardingDrawer
        isOpen={welcomeOpen}
        onComplete={completeWelcome}
        translationPrefix={OWNER_CABINET_WELCOME_PRESET.translationPrefix}
        stepCount={OWNER_CABINET_WELCOME_PRESET.stepCount}
        images={OWNER_CABINET_WELCOME_PRESET.images}
        finishLabelKey={OWNER_CABINET_WELCOME_PRESET.finishLabelKey}
        buyerStyled={OWNER_CABINET_WELCOME_PRESET.buyerStyled}
      />
      <ProfileSpotlightOnboarding
        active={spotlightPhase === 'folder' && view === OWNER_VIEWS.PROFILE}
        targetRef={folderTargetRef}
        message={t('ownerWelcome_spotlightFolderHint')}
        bubbleMaxWidth={280}
      />
      <ProfileSpotlightOnboarding
        active={spotlightPhase === 'form' && view === OWNER_VIEWS.PROFILE}
        targetRef={personalDataSectionRef}
        message={t('ownerWelcome_spotlightFillHint')}
        bubbleMaxWidth={280}
      />
    </OwnerWelcomeUiContext.Provider>
  )
}
