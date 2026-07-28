import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PRIVATE_CLUB_KICKED_MODAL_EVENT } from '../constants/cabinetEvents'
import './PrivateClubKickModal.css'

export default function PrivateClubKickModal() {
  const { t } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const isAdminSession = useCallback(() => {
    if (location.pathname.startsWith('/admin')) return true
    if (localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('userRole') === 'admin') {
      return true
    }
    return false
  }, [location.pathname])

  useEffect(() => {
    if (isAdminSession()) setOpen(false)
  }, [location.pathname, isAdminSession])

  useEffect(() => {
    const onKick = () => {
      if (isAdminSession()) return
      setOpen(true)
    }
    window.addEventListener(PRIVATE_CLUB_KICKED_MODAL_EVENT, onKick)
    return () => window.removeEventListener(PRIVATE_CLUB_KICKED_MODAL_EVENT, onKick)
  }, [isAdminSession])

  if (!open) return null

  return (
    <div className="private-club-kick-modal" role="dialog" aria-modal="true" aria-labelledby="private-club-kick-title">
      <div className="private-club-kick-modal__backdrop" aria-hidden />
      <div className="private-club-kick-modal__panel">
        <h2 id="private-club-kick-title">{t('privateClubKickedModalTitle')}</h2>
        <p className="private-club-kick-modal__text">{t('privateClubKickedModalBody')}</p>
        <button type="button" className="private-club-kick-modal__btn" onClick={() => setOpen(false)}>
          {t('privateClubKickedModalOk')}
        </button>
      </div>
    </div>
  )
}
