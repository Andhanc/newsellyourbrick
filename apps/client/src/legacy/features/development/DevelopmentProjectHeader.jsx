import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { FiChevronDown, FiShare2, FiUser } from 'react-icons/fi'
import PageBackButton from '../../components/PageBackButton'
import { NotificationsBell } from '../../context/SiteNotificationsContext'
import { getUserData, isAuthenticated } from '../../services/authService'
import { getCabinetProfilePath } from '../../utils/cabinetRoutes'
import { requestOpenLoginModal } from '../../utils/requestOpenLoginModal'
import { showNotification } from '../../utils/toastHelper'
import '../../pages/PropertyDetailClassic.css'
import '../../pages/PropertyDetailClassic.desktopAuctionV3.css'

export default function DevelopmentProjectHeader({ project }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()
  const [solid, setSolid] = useState(false)
  const [showTitle, setShowTitle] = useState(false)
  const localUser = getUserData()
  const name =
    user?.fullName || localUser?.name || localUser?.firstName || t('profile')
  const photo = user?.imageUrl || localUser?.picture
  const title = project?.title || 'DEVELOP'
  const back = () => navigate('/development')
  useEffect(() => {
    const hero = document.querySelector('.dev-project-hero')
    const heading = document.querySelector('.dev-project-head')
    if (!hero || !heading) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const above = entry.boundingClientRect.bottom <= 72
          if (entry.target === hero) setSolid(above)
          if (entry.target === heading) setShowTitle(above)
        }
      },
      { rootMargin: '-72px 0px 0px 0px', threshold: 0 },
    )
    observer.observe(hero)
    observer.observe(heading)
    return () => observer.disconnect()
  }, [project?.id])
  const share = async () => {
    const url = `${window.location.origin}/development/${encodeURIComponent(project.slug)}`
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      showNotification(t('shareLinkCopied'), 'success')
    } catch {
      showNotification(t('shareLinkFailed'), 'error')
    }
  }
  const shareButton = project && (
    <button
      type="button"
      className="property-detail-gallery__action-btn"
      onClick={share}
      aria-label={t('share')}
    >
      <FiShare2 size={20} />
    </button>
  )
  return (
    <>
      <header
        className={`property-detail-auction-mobile-header dev-object-mobile-header${solid || showTitle ? ' property-detail-auction-mobile-header--solid' : ''}${showTitle ? ' property-detail-auction-mobile-header--title-visible' : ''}`}
      >
        <div className="property-detail-auction-mobile-header__toolbar">
          <PageBackButton
            onClick={back}
            className="page-back-button--icon-only property-detail-auction-mobile-header__back"
          />
          <div
            className={`property-detail-auction-mobile-header__title-inline-wrap${showTitle ? ' is-visible' : ''}`}
            aria-hidden={!showTitle}
          >
            <span className="property-detail-auction-mobile-header__title-inline">
              {title}
            </span>
          </div>
          <div className="property-detail-auction-mobile-header__actions">
            {shareButton}
          </div>
        </div>
      </header>
      <div className="pd-v3-topbar-shell dev-object-desktop-header">
        <header className="pd-v3-topbar">
          <PageBackButton
            onClick={back}
            label={t('develop.projects')}
            className="pd-v3-topbar__back"
          />
          <div className="pd-v3-topbar__actions">
            {shareButton}
            <NotificationsBell />
            <button
              type="button"
              className="pd-v3-topbar__profile"
              onClick={() => {
                if (isAuthenticated() || (isLoaded && user))
                  navigate(getCabinetProfilePath())
                else requestOpenLoginModal({ wizard: true })
              }}
            >
              <span className="pd-v3-topbar__avatar" aria-hidden="true">
                {photo ? (
                  <img
                    src={photo}
                    alt=""
                    className="pd-v3-topbar__avatar-img"
                  />
                ) : (
                  <FiUser size={22} />
                )}
              </span>
              <span className="pd-v3-topbar__profile-text">
                <span className="pd-v3-topbar__profile-name">{name}</span>
                <span className="pd-v3-topbar__profile-role">
                  {t(
                    ['seller', 'owner'].includes(localUser?.role)
                      ? 'roleSeller'
                      : 'propertyDetailRoleInvestor',
                  )}
                </span>
              </span>
              <FiChevronDown
                size={18}
                className="pd-v3-topbar__chevron"
                aria-hidden="true"
              />
            </button>
          </div>
        </header>
        <div className="pd-v3-topbar-shell__divider" aria-hidden="true" />
      </div>
    </>
  )
}
