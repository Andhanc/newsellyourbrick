import { useTranslation } from 'react-i18next'
import { Briefcase, Home, Plus, SlidersHorizontal } from 'lucide-react'
import OwnerAiTabIcon from './OwnerAiTabIcon'
import { isTabItemActive, OWNER_VIEWS } from '../utils/ownerTestNav'
import { openOwnerAiChat } from '../utils/ownerCabinetChat'

function navItemClass(active) {
  return `otc-float-nav__item${active ? ' otc-float-nav__item--active' : ''}`
}

export default function OwnerFloatingMobileNav({
  view,
  goTo,
  onOpenMenu,
  aiChatOpen = false,
  menuOpen = false,
}) {
  const { t } = useTranslation()
  const homeActive = isTabItemActive('home', view)
  const propertiesActive = isTabItemActive('properties', view)
  const aiActive = isTabItemActive('ai', view, { aiChatOpen })
  const moreActive = isTabItemActive('more', view, { menuOpen })

  return (
    <div
      className="otc-float-nav-shell otc-mobile-only"
      aria-label={t('ownerTest_ariaBottomNav')}
    >
      <nav className="otc-float-nav">
        <button
          type="button"
          className={navItemClass(homeActive)}
          aria-label={t('ownerTest_tabAnalytics')}
          aria-current={homeActive ? 'page' : undefined}
          onClick={() => goTo(OWNER_VIEWS.HOME)}
        >
          <Home size={20} strokeWidth={homeActive ? 2.25 : 2} aria-hidden />
        </button>

        <button
          type="button"
          className={navItemClass(propertiesActive)}
          aria-label={t('ownerTest_tabProperties')}
          aria-current={propertiesActive ? 'page' : undefined}
          onClick={() => goTo(OWNER_VIEWS.PROPERTIES)}
        >
          <Briefcase size={20} strokeWidth={propertiesActive ? 2.25 : 2} aria-hidden />
        </button>

        <button
          type="button"
          className="otc-float-nav__fab"
          aria-label={t('ownerTest_ariaAddProperty')}
          onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}
        >
          <Plus size={20} strokeWidth={2.5} aria-hidden />
        </button>

        <button
          type="button"
          className={`${navItemClass(aiActive)} otc-float-nav__ai`}
          aria-label={t('ownerTest_tabAi')}
          aria-pressed={aiChatOpen}
          onClick={() => openOwnerAiChat()}
        >
          <OwnerAiTabIcon size={20} active={aiActive} />
        </button>

        <button
          type="button"
          className={navItemClass(moreActive)}
          aria-expanded={menuOpen}
          aria-label={t('ownerTest_tabMore')}
          onClick={onOpenMenu}
        >
          <SlidersHorizontal size={20} strokeWidth={moreActive ? 2.25 : 2} aria-hidden />
        </button>
      </nav>
    </div>
  )
}
