import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CABINET_ENTRY_EVENT,
  CABINET_ENTRY_FADE_MS,
  CABINET_ENTRY_HOLD_MS,
  CABINET_ENTRY_ROOT_ID,
  CABINET_ENTRY_STARTED_KEY,
  claimCabinetEntry,
  mountCabinetEntrySplash,
} from '../utils/cabinetEntryPreloader'
import './CabinetEntryPreloader.css'

let hideAt = 0

export default function CabinetEntryPreloader() {
  const { t, i18n } = useTranslation()
  const timers = useRef([])

  useLayoutEffect(() => {
    const clear = () => {
      timers.current.forEach((id) => window.clearTimeout(id))
      timers.current = []
    }

    const begin = () => {
      const claimed = claimCabinetEntry()
      const existing = document.getElementById(CABINET_ENTRY_ROOT_ID)
      if (!claimed && !existing && !(hideAt > Date.now())) return

      const now = Date.now()
      let started = Number(sessionStorage.getItem(CABINET_ENTRY_STARTED_KEY) || 0)
      if (!started) {
        started = now
        try {
          sessionStorage.setItem(CABINET_ENTRY_STARTED_KEY, String(started))
        } catch {
          /* ignore */
        }
      }

      const elapsed = Math.max(0, now - started)
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const fade = reduce ? 0 : CABINET_ENTRY_FADE_MS
      const untilOut = Math.max(0, CABINET_ENTRY_HOLD_MS - elapsed)
      hideAt = started + CABINET_ENTRY_HOLD_MS + fade

      const el = mountCabinetEntrySplash({
        kicker: t('cabinetEntry_kicker'),
        title: t('cabinetEntry_title'),
        subtitle: t('cabinetEntry_subtitle'),
      })
      const fill = el?.querySelector('.cabinet-entry__rule-fill')
      if (fill) fill.style.animationDelay = reduce ? '0ms' : `-${elapsed}ms`

      clear()
      timers.current = [
        window.setTimeout(() => {
          el?.classList.add('is-leaving')
          document.documentElement.classList.remove('cabinet-entry-boot')
        }, untilOut),
        window.setTimeout(() => {
          el?.remove()
          document.documentElement.classList.remove('cabinet-entry-boot')
          try {
            sessionStorage.removeItem(CABINET_ENTRY_STARTED_KEY)
          } catch {
            /* ignore */
          }
          hideAt = 0
        }, untilOut + fade),
      ]
    }

    begin()
    window.addEventListener(CABINET_ENTRY_EVENT, begin)
    return () => {
      window.removeEventListener(CABINET_ENTRY_EVENT, begin)
      clear()
    }
  }, [i18n.language, t])

  return null
}
