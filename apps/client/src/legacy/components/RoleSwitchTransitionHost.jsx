import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { readRoleSwitchTransition, ROLE_SWITCH_TRANSITION_EVENT, clearRoleSwitchTransition } from '../utils/roleSwitchTransition'
import { getUserData } from '../services/authService'
import RoleSwitchPreloader from './RoleSwitchPreloader'

export default function RoleSwitchTransitionHost() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [transition, setTransition] = useState(() => {
    const value = readRoleSwitchTransition()
    // Reloading during the password request cancels it and keeps the original cabinet usable.
    if (value?.phase === 'authenticating') {
      clearRoleSwitchTransition(value.id)
      return null
    }
    return value
  })

  useLayoutEffect(() => {
    document.getElementById('role-switch-boot-loader')?.remove()
    const sync = () => setTransition(readRoleSwitchTransition())
    window.addEventListener(ROLE_SWITCH_TRANSITION_EVENT, sync)
    return () => {
      window.removeEventListener(ROLE_SWITCH_TRANSITION_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    if (!transition) return undefined
    const timeout = window.setTimeout(() => setTransition(readRoleSwitchTransition()),
      Math.max(1, 45100 - (Date.now() - transition.startedAt)))
    return () => window.clearTimeout(timeout)
  }, [transition])

  useEffect(() => {
    if (transition?.phase !== 'committed') return
    if (String(getUserData()?.id) !== transition.userId) {
      clearRoleSwitchTransition(transition.id)
      return
    }
    if (location.pathname !== transition.path) navigate(transition.path, { replace: true })
  }, [transition, location.pathname, navigate])

  return transition ? <RoleSwitchPreloader message={transition.label || t('roleSwitch_switchingProfile')} /> : null
}
