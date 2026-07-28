import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, Building2, LayoutDashboard, Menu } from 'lucide-react'
import { useOwnerTestNavOptional } from '../context/OwnerTestNavigationContext'
import {
  isTabItemActive,
  navigateToOwnerView,
  OWNER_VIEWS,
} from '../utils/ownerTestNav'
import { openOwnerAiChat } from '../utils/ownerCabinetChat'
import './OwnerFloatingMobileNav.css'

function navTabClass(active) {
  return `owner-float-nav__tab${active ? ' owner-float-nav__tab--active' : ''}`
}

function renderTabIcon(Icon, active) {
  return (
    <Icon
      size={22}
      strokeWidth={active ? 2.25 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    />
  )
}

export default function OwnerFloatingMobileNav({
  view: viewProp,
  goTo: goToProp,
  onOpenMenu,
  aiChatOpen: aiChatOpenProp,
  menuOpen = false,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const embeddedNav = useOwnerTestNavOptional()
  const [aiChatOpenLocal, setAiChatOpenLocal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onAi = (event) => setAiChatOpenLocal(Boolean(event.detail?.isOpen))
    window.addEventListener('aiChatStateChange', onAi)
    return () => window.removeEventListener('aiChatStateChange', onAi)
  }, [])

  const view = viewProp ?? embeddedNav?.view ?? OWNER_VIEWS.HOME
  const aiChatOpen = aiChatOpenProp ?? aiChatOpenLocal

  const goTo = useCallback(
    (nextView) => {
      if (goToProp) {
        goToProp(nextView)
        return
      }
      if (embeddedNav?.goTo) {
        embeddedNav.goTo(nextView)
        return
      }
      navigateToOwnerView(navigate, nextView)
    },
    [goToProp, embeddedNav, navigate]
  )

  const homeActive = isTabItemActive('home', view)
  const propertiesActive = isTabItemActive('properties', view)
  const aiActive = isTabItemActive('ai', view, { aiChatOpen })
  const moreActive = isTabItemActive('more', view, { menuOpen })

  const tabs = useMemo(
    () => [
      {
        id: 'home',
        label: t('ownerTest_tabAnalytics'),
        active: homeActive,
        ariaLabel: t('ownerTest_tabAnalytics'),
        onClick: () => goTo(OWNER_VIEWS.HOME),
        icon: renderTabIcon(LayoutDashboard, homeActive),
      },
      {
        id: 'properties',
        label: t('ownerTest_tabProperties'),
        active: propertiesActive,
        ariaLabel: t('ownerTest_tabProperties'),
        onClick: () => goTo(OWNER_VIEWS.PROPERTIES),
        icon: renderTabIcon(Building2, propertiesActive),
      },
      {
        id: 'ai',
        label: t('ownerTest_tabAi'),
        active: aiActive,
        ariaLabel: t('ownerTest_tabAi'),
        ariaPressed: aiChatOpen,
        onClick: () => openOwnerAiChat(),
        icon: renderTabIcon(Bot, aiActive),
      },
      {
        id: 'menu',
        label: t('ownerTest_tabMore'),
        active: moreActive,
        ariaLabel: t('ownerTest_ariaOpenMenu'),
        ariaExpanded: menuOpen,
        onClick: () => onOpenMenu?.(),
        icon: renderTabIcon(Menu, moreActive),
      },
    ],
    [
      t,
      homeActive,
      propertiesActive,
      aiActive,
      moreActive,
      aiChatOpen,
      menuOpen,
      goTo,
      onOpenMenu,
    ]
  )

  if (!mounted || menuOpen) return null

  return createPortal(
    <div className="owner-float-nav-shell" aria-label={t('ownerTest_ariaBottomNav')}>
      <nav className="owner-float-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={navTabClass(tab.active)}
            aria-label={tab.ariaLabel}
            aria-current={tab.active ? 'page' : undefined}
            aria-pressed={tab.ariaPressed}
            aria-expanded={tab.ariaExpanded}
            onClick={tab.onClick}
          >
            <span className="owner-float-nav__icon">{tab.icon}</span>
            <span className="owner-float-nav__label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>,
    document.body
  )
}
