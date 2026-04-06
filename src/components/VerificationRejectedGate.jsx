import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { getApiBaseUrl } from '../utils/apiConfig'
import { CLERK_DB_USER_SYNCED, getUserData } from '../services/authService'
import SellerVerificationModal from './SellerVerificationModal'
import './VerificationRejectedGate.css'

/**
 * Блокирующее окно после отклонения верификации админом.
 * Закрывается только после успешной повторной отправки трёх фото (VerificationModal + clear-rejected на бэке).
 */
export default function VerificationRejectedGate({ blockedUser = false }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [userId, setUserId] = useState(null)
  const [phase, setPhase] = useState('banner')

  const tryFetch = useCallback(async () => {
    if (blockedUser) {
      setOpen(false)
      return
    }
    if (location.pathname.startsWith('/admin')) {
      setOpen(false)
      return
    }
    if (localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('userRole') === 'admin') {
      setOpen(false)
      return
    }
    if (!authLoaded) return

    const legacy = getUserData()
    const legacyIn = Boolean(legacy?.isLoggedIn)
    const raw = localStorage.getItem('userId')
    const uid = raw && /^\d+$/.test(String(raw).trim()) ? parseInt(String(raw).trim(), 10) : null

    if (!uid) {
      setOpen(false)
      setUserId(null)
      setReason('')
      return
    }

    if (!isSignedIn && !legacyIn) {
      setOpen(false)
      setUserId(null)
      setReason('')
      return
    }

    setUserId(uid)

    try {
      const base = await getApiBaseUrl()
      const normalized = String(base).replace(/\/$/, '')
      const r = await fetch(`${normalized}/users/${uid}/verification-status`)
      if (!r.ok) return
      const j = await r.json()
      if (j.success && j.data?.needsReverificationAfterRejection) {
        setReason(j.data.rejectionReasonSummary || '')
        setOpen(true)
        setPhase('banner')
      } else {
        setOpen(false)
        setPhase('banner')
      }
    } catch {
      /* сеть */
    }
  }, [authLoaded, blockedUser, isSignedIn, location.pathname])

  useEffect(() => {
    void tryFetch()
  }, [tryFetch])

  useEffect(() => {
    const onUpd = () => void tryFetch()
    window.addEventListener('verification-status-update', onUpd)
    window.addEventListener('focus', onUpd)
    window.addEventListener(CLERK_DB_USER_SYNCED, onUpd)
    return () => {
      window.removeEventListener('verification-status-update', onUpd)
      window.removeEventListener('focus', onUpd)
      window.removeEventListener(CLERK_DB_USER_SYNCED, onUpd)
    }
  }, [tryFetch])

  if (!open) return null

  if (phase === 'verifying' && userId) {
    return (
      <div className="verification-rejected-gate-flow">
        <SellerVerificationModal
          isOpen
          required
          onClose={() => {
            setPhase('banner')
            void tryFetch()
          }}
          userId={userId}
          title={t('verificationRejectedGateVerificationTitle')}
          subtitle={t('verificationRejectedGateVerificationSubtitle')}
          onComplete={async () => {
            await tryFetch()
            return true
          }}
        />
      </div>
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
        <button type="button" className="verification-rejected-gate__cta" onClick={() => setPhase('verifying')}>
          {t('verificationRejectedGateCta')}
        </button>
      </div>
    </div>
  )
}
