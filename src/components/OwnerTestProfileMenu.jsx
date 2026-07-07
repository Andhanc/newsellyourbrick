import { useState, useEffect, useRef, useId, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { ChevronDown } from 'lucide-react'
import { getOwnerProfileTabs, getOwnerProfileTabPath } from '../pages/ownerProfileTestTabs'
import { getUserData, logout } from '../services/authService'
import { useOwnerTestProfileOptional } from '../context/OwnerTestProfileContext'
import { useOwnerTestUserPhoto } from '../hooks/useOwnerTestUserPhoto'
import './OwnerTestProfileMenu.css'

export function resolveOwnerTestDisplayName({ name, fullName, fallback } = {}) {
  if (name?.trim()) return name.trim()
  if (fullName?.trim()) return fullName.trim()
  const localName = getUserData()?.name
  if (localName?.trim()) return localName.trim()
  return fallback || ''
}

export default function OwnerTestProfileMenu({
  name,
  role,
  current = false,
  activeTab,
  onTabSelect,
  onLogout,
  className = '',
}) {
  const { t } = useTranslation()
  const profileCtx = useOwnerTestProfileOptional()
  const { user } = useUser()
  const { signOut } = useClerk()
  const sellerRoleLabel = t('ownerTest_roleSeller')
  const profileTabs = useMemo(() => getOwnerProfileTabs(t), [t])
  const displayName = resolveOwnerTestDisplayName({
    name,
    fullName: profileCtx?.fullName,
    fallback: sellerRoleLabel,
  })
  const displayRole = role?.trim() || profileCtx?.roleLabel || sellerRoleLabel
  const photoUrl = useOwnerTestUserPhoto()
  const [photoFailed, setPhotoFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const gradientId = useId()

  useEffect(() => {
    setPhotoFailed(false)
  }, [photoUrl])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const closeMenu = () => setOpen(false)

  const handleLogout = useCallback(async () => {
    closeMenu()
    if (onLogout) {
      onLogout()
      return
    }

    if (!window.confirm(t('ownerTest_logoutConfirm'))) {
      return
    }

    sessionStorage.setItem('clerk_logout_in_progress', 'true')
    try {
      if (user && signOut) {
        await signOut({ redirectUrl: `${window.location.origin}/` })
      }
    } catch (error) {
      console.warn('OwnerTestProfileMenu: Clerk signOut', error)
    }

    try {
      await logout()
    } catch (error) {
      console.warn('OwnerTestProfileMenu: logout()', error)
    } finally {
      sessionStorage.removeItem('clerk_logout_in_progress')
    }

    window.location.assign('/')
  }, [onLogout, signOut, user, t])

  return (
    <div className={`otpm${current ? ' otpm--current' : ''}${className ? ` ${className}` : ''}`} ref={rootRef}>
      <div className="otpm__pill">
        <Link
          to={getOwnerProfileTabPath('personal')}
          className="otpm__identity"
          aria-label={t('ownerTest_profileAria')}
          onClick={closeMenu}
        >
          <span className="otpm__avatar" aria-hidden>
            {photoUrl && !photoFailed ? (
              <img
                src={photoUrl}
                alt=""
                className="otpm__avatar-img"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <svg viewBox="0 0 40 40">
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#33adbb" />
                    <stop offset="100%" stopColor="#007d8a" />
                  </linearGradient>
                </defs>
                <circle cx="20" cy="20" r="20" fill={`url(#${gradientId})`} />
                <circle cx="20" cy="16" r="7" fill="#F8FAFC" />
                <ellipse cx="20" cy="34" rx="11" ry="8" fill="#F8FAFC" />
              </svg>
            )}
          </span>
          <span className="otpm__info">
            <span className="otpm__name">{displayName}</span>
            <span className="otpm__role">{displayRole}</span>
          </span>
        </Link>
        <button
          type="button"
          className={`otpm__toggle${open ? ' otpm__toggle--open' : ''}`}
          aria-label={t('ownerTest_profileSectionsAria')}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      {open && (
        <div className="otpm__menu" role="menu" aria-label={t('ownerTest_profileSectionsAria')}>
          {profileTabs.map((tab) => {
            const isActive = activeTab === tab.id

            if (onTabSelect) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="menuitem"
                  className={`otpm__item${isActive ? ' otpm__item--active' : ''}`}
                  onClick={() => {
                    onTabSelect(tab.id)
                    closeMenu()
                  }}
                >
                  {tab.label}
                </button>
              )
            }

            return (
              <Link
                key={tab.id}
                to={getOwnerProfileTabPath(tab.id)}
                role="menuitem"
                className="otpm__item"
                onClick={closeMenu}
              >
                {tab.label}
              </Link>
            )
          })}
          <div className="otpm__divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="otpm__item otpm__item--logout"
            onClick={handleLogout}
          >
            {t('ownerTest_logout')}
          </button>
        </div>
      )}
    </div>
  )
}
