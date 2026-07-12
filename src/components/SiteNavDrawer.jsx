import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  isCabinetDataPath,
  isCabinetProfilePath,
  isCabinetSubscriptionsPath,
} from '../utils/cabinetRoutes'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '../utils/sectionRoutes'
import HeaderMegaMenu from './HeaderMegaMenu'

/**
 * Бургер-панель навигации (как на /auction). Для highlight «умный помощник» передайте
 * aiConsultantOpen: открыт ли виджет AI на текущей странице (аукцион / главная).
 */
export function useSiteDrawerMenuActive(isManagerChatOpen, aiConsultantOpen) {
  const { pathname, search } = useLocation()

  return useMemo(() => {
    const managerQ = new URLSearchParams(search).get('manager')
    const isManagerChatUrl = pathname === '/chat' && (managerQ === '1' || managerQ === 'true')
    const managerChatHighlighted =
      isManagerChatUrl || (pathname !== '/chat' && isManagerChatOpen)

    const starts = (base) => pathname === base || pathname.startsWith(`${base}/`)
    const isAiChatRoute = pathname === '/chat' && !isManagerChatUrl
    const aiAssistantHighlighted =
      isAiChatRoute ||
      ((pathname === '/auction' || pathname === '/' || pathname === '/main') && aiConsultantOpen)

    return {
      home: pathname === '/',
      auction: starts('/auction') || pathname === '/main',
      shares: starts(CO_INVESTMENT_PATH) || starts('/shares'),
      debts: starts('/debts'),
      testDrive: starts(TEST_DRIVE_PATH),
      chat: managerChatHighlighted,
      bonuses: starts('/bonuses'),
      map: starts('/map'),
      calculator: starts('/calculator'),
      aiAssistant: aiAssistantHighlighted,
      moreSections: starts('/sections'),
      profile: isCabinetProfilePath(pathname),
      wallet: pathname === '/deposit' || pathname === '/wallet',
      subscriptions: isCabinetSubscriptionsPath(pathname, search),
      data: isCabinetDataPath(pathname, search),
    }
  }, [pathname, search, isManagerChatOpen, aiConsultantOpen])
}

export default function SiteNavDrawer({
  menuRef,
  isMenuOpen,
  isMenuClosing,
  setIsMenuOpen,
  setIsMenuClosing,
  openLoginOrNavigate,
}) {
  const closeAfterNav = () => {
    setIsMenuOpen(false)
  }

  const startCloseDrawer = () => {
    setIsMenuClosing(true)
    setTimeout(() => {
      setIsMenuOpen(false)
      setIsMenuClosing(false)
    }, 300)
  }

  const visible = isMenuOpen || isMenuClosing
  if (!visible) return null

  return (
    <>
      <div
        className={`menu-backdrop ${isMenuClosing ? 'menu-backdrop--closing' : ''}`}
        onClick={(e) => {
          const menuBtn = menuRef.current?.querySelector('.new-header__menu-btn')
          const menuDropdown = document.querySelector('.menu-dropdown')

          if (menuBtn && menuBtn.contains(e.target)) return
          if (menuDropdown && menuDropdown.contains(e.target)) return

          startCloseDrawer()
        }}
      />
      <div className={`menu-dropdown menu-dropdown--mega ${isMenuClosing ? 'menu-dropdown--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="menu-dropdown__content menu-dropdown__content--mega">
          <HeaderMegaMenu
            onClose={startCloseDrawer}
            openLoginOrNavigate={openLoginOrNavigate}
            closeAfterNav={closeAfterNav}
          />
        </div>
      </div>
    </>
  )
}
