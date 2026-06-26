import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getCabinetDataPath,
  getCabinetProfilePath,
  isCabinetDataPath,
  isCabinetProfilePath,
  isSellerCabinetRole,
} from '../utils/cabinetRoutes'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '../utils/sectionRoutes'

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

    const sellerCabinet = isSellerCabinetRole()

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
      subscriptions: starts('/subscriptions'),
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
  isLoggedIn,
  isManagerChatOpen,
  aiConsultantOpen,
  openLoginOrNavigate,
  openWalletFromMenu,
  onOpenLoginWizard,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const drawerMenuActive = useSiteDrawerMenuActive(isManagerChatOpen, aiConsultantOpen)

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
      <div className={`menu-dropdown ${isMenuClosing ? 'menu-dropdown--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="menu-dropdown__content">
          <div className="menu-dropdown__top-row">
            <div className="menu-dropdown__brand">
              <span className="menu-dropdown__brand-text">
                <span className="menu-dropdown__brand-sell">Sell</span>
                <span className="menu-dropdown__brand-you">You</span>
                <span className="menu-dropdown__brand-brick">Brick</span>
              </span>
            </div>
            <button
              type="button"
              className="menu-dropdown__close-btn"
              aria-label={t('closeMenu')}
              onClick={(e) => {
                e.stopPropagation()
                startCloseDrawer()
              }}
            >
              <FiX size={22} />
            </button>
          </div>
          <div className="menu-dropdown__columns">
            <div className="menu-dropdown__column menu-dropdown__column--site-nav">
              <h3 className="menu-dropdown__column-title menu-dropdown__column-title--accent">{t('navSiteTitle')}</h3>
              <div className="menu-dropdown__column-items">
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.home ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.home ? 'page' : undefined}
                  onClick={() => {
                    navigate('/')
                    closeAfterNav()
                  }}
                >
                  <span>{t('home')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.auction ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.auction ? 'page' : undefined}
                  onClick={() => {
                    navigate('/auction')
                    closeAfterNav()
                  }}
                >
                  <span>{t('auction')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.shares ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.shares ? 'page' : undefined}
                  onClick={() => {
                    navigate(CO_INVESTMENT_PATH)
                    closeAfterNav()
                  }}
                >
                  <span>{t('coInvestment')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.debts ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.debts ? 'page' : undefined}
                  onClick={() => {
                    navigate('/debts')
                    closeAfterNav()
                  }}
                >
                  <span>{t('debtsTitle')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.testDrive ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.testDrive ? 'page' : undefined}
                  onClick={() => {
                    navigate(TEST_DRIVE_PATH)
                    closeAfterNav()
                  }}
                >
                  <span>{t('testDrive')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.chat ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.chat ? 'page' : undefined}
                  onClick={() => openLoginOrNavigate('/chat?manager=1', true)}
                >
                  <span>{t('chat')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.bonuses ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.bonuses ? 'page' : undefined}
                  onClick={() => openLoginOrNavigate('/bonuses', true)}
                >
                  <span>{t('bonuses')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.map ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.map ? 'page' : undefined}
                  onClick={() => openLoginOrNavigate('/map', true)}
                >
                  <span>{t('mapLink')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.calculator ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.calculator ? 'page' : undefined}
                  onClick={() => openLoginOrNavigate('/calculator', true)}
                >
                  <span>{t('calculator')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.aiAssistant ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.aiAssistant ? 'page' : undefined}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openAIChat'))
                    closeAfterNav()
                  }}
                >
                  <span>{t('aiAssistant')}</span>
                </button>
                <button
                  type="button"
                  className={`menu-dropdown__item${drawerMenuActive.moreSections ? ' menu-dropdown__item--active' : ''}`}
                  aria-current={drawerMenuActive.moreSections ? 'page' : undefined}
                  onClick={() => {
                    navigate('/sections')
                    closeAfterNav()
                  }}
                >
                  <span>{t('moreSections')}</span>
                </button>
              </div>
            </div>
            <div className="menu-dropdown__column menu-dropdown__column--profile">
              <h3 className="menu-dropdown__column-title menu-dropdown__column-title--accent">{t('profile')}</h3>
              <div className="menu-dropdown__column-items">
                {isLoggedIn ? (
                  <>
                    <button
                      type="button"
                      className={`menu-dropdown__item${drawerMenuActive.profile ? ' menu-dropdown__item--active' : ''}`}
                      aria-current={drawerMenuActive.profile ? 'page' : undefined}
                      onClick={() => openLoginOrNavigate(getCabinetProfilePath(), true)}
                    >
                      <span>{t('profile')}</span>
                    </button>
                    <button
                      type="button"
                      className={`menu-dropdown__item${drawerMenuActive.wallet ? ' menu-dropdown__item--active' : ''}`}
                      aria-current={drawerMenuActive.wallet ? 'page' : undefined}
                      onClick={() => openWalletFromMenu(true)}
                    >
                      <span>{t('wallet')}</span>
                    </button>
                    <button
                      type="button"
                      className={`menu-dropdown__item${drawerMenuActive.subscriptions ? ' menu-dropdown__item--active' : ''}`}
                      aria-current={drawerMenuActive.subscriptions ? 'page' : undefined}
                      onClick={() => {
                        navigate('/subscriptions')
                        closeAfterNav()
                      }}
                    >
                      <span>{t('subscriptions')}</span>
                    </button>
                    <button
                      type="button"
                      className={`menu-dropdown__item${drawerMenuActive.data ? ' menu-dropdown__item--active' : ''}`}
                      aria-current={drawerMenuActive.data ? 'page' : undefined}
                      onClick={() => {
                        navigate(getCabinetDataPath())
                        closeAfterNav()
                      }}
                    >
                      <span>{t('data')}</span>
                    </button>
                  </>
                ) : (
                  <button type="button" className="menu-dropdown__item" onClick={onOpenLoginWizard}>
                    <span>{t('logIn')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
