import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { CLERK_DB_USER_SYNCED, getUserData } from '../services/authService'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import {
  fetchVerificationStatus,
  invalidateVerificationStatusCache,
} from '../utils/verificationStatusApi'
import './VerificationRejectedGate.css'

const SellerVerificationModalLazy = lazy(() => import('./SellerVerificationModal'))

/**
 * Блокирующее окно после отклонения верификации админом.
 * Сначала — сообщение на сайте с причиной; по кнопке — повторная верификация.
 */
export default function VerificationRejectedGate({ blockedUser = false }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const [gateActive, setGateActive] = useState(false)
  const [reason, setReason] = useState('')
  const [userId, setUserId] = useState(null)
  const [phase, setPhase] = useState('banner')

  const refreshGate = useCallback(
    async ({ force = false } = {}) => {
      if (blockedUser) {
        setGateActive(false)
        setUserId(null)
        setReason('')
        setPhase('banner')
        return false
      }
      if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/marketer')) {
        setGateActive(false)
        setUserId(null)
        setReason('')
        setPhase('banner')
        return false
      }
      if (
        localStorage.getItem('isAdminLoggedIn') === 'true'
        && localStorage.getItem('userRole') === 'admin'
      ) {
        setGateActive(false)
        setUserId(null)
        setReason('')
        setPhase('banner')
        return false
      }
      if (!authLoaded) return false

      const legacy = getUserData()
      const legacyIn = Boolean(legacy?.isLoggedIn)
      const raw = localStorage.getItem('userId')
      const uid = raw && /^\d+$/.test(String(raw).trim()) ? parseInt(String(raw).trim(), 10) : null

      if (!uid || (!isSignedIn && !legacyIn)) {
        setGateActive(false)
        setUserId(null)
        setReason('')
        setPhase('banner')
        return false
      }

      setUserId(uid)

      try {
        const apiBase = getApiBaseUrlSync()
        const status = await fetchVerificationStatus(apiBase, uid, {
          force,
          ttlMs: force ? 0 : 10000,
        })
        if (status?.needsReverificationAfterRejection) {
          setReason(status.rejectionReasonSummary || '')
          setGateActive(true)
          setPhase('banner')
          return true
        }
        setGateActive(false)
        setReason('')
        setPhase('banner')
        return false
      } catch {
        return false
      }
    },
    [authLoaded, blockedUser, isSignedIn, location.pathname],
  )

  useEffect(() => {
    void refreshGate()
  }, [refreshGate])

  useEffect(() => {
    const onRefresh = () => void refreshGate({ force: true })
    window.addEventListener('verification-status-update', onRefresh)
    window.addEventListener('focus', onRefresh)
    window.addEventListener(CLERK_DB_USER_SYNCED, onRefresh)
    return () => {
      window.removeEventListener('verification-status-update', onRefresh)
      window.removeEventListener('focus', onRefresh)
      window.removeEventListener(CLERK_DB_USER_SYNCED, onRefresh)
    }
  }, [refreshGate])

  if (!gateActive || !userId) return null

  if (phase === 'verifying') {
    const subtitle = reason
      ? t('verificationRejectedGateVerificationSubtitleWithReason', { reason })
      : t('verificationRejectedGateVerificationSubtitle')

    return (
      <Suspense fallback={null}>
        <SellerVerificationModalLazy
          isOpen
          required
          onClose={() => {
            setPhase('banner')
            void refreshGate({ force: true })
          }}
          userId={userId}
          title={t('verificationRejectedGateVerificationTitle')}
          subtitle={subtitle}
          onComplete={async () => {
            const apiBase = getApiBaseUrlSync()
            invalidateVerificationStatusCache(apiBase, userId)
            window.dispatchEvent(new Event('verification-status-update'))
            await refreshGate({ force: true })
            return true
          }}
        />
      </Suspense>
    )
  }

  return (
    <div
      className="verification-rejected-gate"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="verification-rejected-gate-title"
    >
      <div className="verification-rejected-gate__backdrop" aria-hidden="true" />
      <div className="verification-rejected-gate__panel">
        <h2 id="verification-rejected-gate-title">{t('verificationRejectedGateTitle')}</h2>
        <p className="verification-rejected-gate__text">{t('verificationRejectedGateIntro')}</p>
        {reason ? (
          <p className="verification-rejected-gate__reason">
            <strong>{t('verificationRejectedGateReasonLabel')}</strong> {reason}
          </p>
        ) : (
          <p className="verification-rejected-gate__reason verification-rejected-gate__reason--muted">
            {t('verificationRejectedGateNoReason')}
          </p>
        )}
        <button
          type="button"
          className="verification-rejected-gate__cta"
          onClick={() => setPhase('verifying')}
        >
          {t('verificationRejectedGateCta')}
        </button>
      </div>
    </div>
  )
}
