import { useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { FiHome, FiActivity, FiMessageSquare } from 'react-icons/fi'
import ManagerChatModal, { useManagerChatUserId } from './ManagerChatModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import './OwnerCabinetQuickNav.css'

const QUICK_NAV_LINKS = [
  { id: 'home', to: '/', titleKey: 'home', icon: FiHome, accent: 'teal' },
  { id: 'auction', to: '/auction', titleKey: 'auction', icon: FiActivity, accent: 'ocean' },
]

const CHAT_ITEM = {
  id: 'chat',
  titleKey: 'chat',
  icon: FiMessageSquare,
  accent: 'jade',
}

function isQuickNavItemActive(item, pathname, managerChatOpen) {
  if (item.id === 'chat') {
    return managerChatOpen || pathname === '/chat' || pathname.startsWith('/chat/')
  }
  if (item.id === 'home') {
    return pathname === '/' || pathname === '/main'
  }
  const base = item.to.split('?')[0]
  return pathname === base || pathname.startsWith(`${base}/`)
}

export default function OwnerCabinetQuickNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, isLoaded } = useUser()
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)
  const chatUserId = useManagerChatUserId(user, isLoaded)

  const openManagerChat = useCallback(() => {
    if (!isLoaded) return
    if (!isSiteUserSignedIn(user, isLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    if (!chatUserId) return
    setIsManagerChatOpen(true)
  }, [user, isLoaded, chatUserId])

  const closeManagerChat = useCallback(() => {
    setIsManagerChatOpen(false)
  }, [])

  const renderTile = (item, { isButton = false, onClick } = {}) => {
    const Icon = item.icon
    const active = isQuickNavItemActive(item, location.pathname, isManagerChatOpen)
    const title = t(item.titleKey)
    const tileClass = `owner-quick-nav__tile owner-quick-nav__tile--${item.accent}${
      active ? ' owner-quick-nav__tile--active' : ''
    }`
    const inner = (
      <>
        <span className="owner-quick-nav__icon">
          <Icon size={18} strokeWidth={2} aria-hidden />
        </span>
        <span className="owner-quick-nav__text">{title}</span>
      </>
    )

    if (isButton) {
      return (
        <button
          key={item.id}
          type="button"
          className={tileClass}
          title={title}
          aria-label={title}
          aria-pressed={active}
          onClick={onClick}
        >
          {inner}
        </button>
      )
    }

    return (
      <Link
        key={item.id}
        to={item.to}
        className={tileClass}
        title={title}
        aria-label={title}
        aria-current={active ? 'page' : undefined}
      >
        {inner}
      </Link>
    )
  }

  return (
    <>
      <nav className="owner-quick-nav" aria-label={t('ownerCabinet_quickNavAria')}>
        <div className="owner-quick-nav__grid">
          {QUICK_NAV_LINKS.map((item) => renderTile(item))}
          {renderTile(CHAT_ITEM, { isButton: true, onClick: openManagerChat })}
        </div>
      </nav>

      <ManagerChatModal
        open={isManagerChatOpen}
        onClose={closeManagerChat}
        chatUserId={chatUserId}
      />
    </>
  )
}
