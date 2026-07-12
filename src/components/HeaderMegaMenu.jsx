import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { SiteBrandIcon } from './SiteBrandLogo'
import './SiteBrandLogo.css'
import {
  FiBarChart2,
  FiHome,
  FiLayers,
  FiMenu,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '../utils/sectionRoutes'
import { getCabinetHomePath } from '../utils/cabinetRoutes'
import './HeaderMegaMenu.css'

const MOBILE_QUICK_COLUMN = {
  id: 'quick',
  titleKey: 'navSiteTitle',
  icon: FiMenu,
  links: [
    { labelKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
    { labelKey: 'favorites', path: '/favorites' },
    { labelKey: 'aiAssistant', action: 'ai' },
    { labelKey: 'map', path: '/map', requiresAuth: true },
  ],
}

const MEGA_COLUMNS = [
  {
    id: 'buy',
    titleKey: 'headerMegaBuy',
    icon: FiHome,
    links: [
      { labelKey: 'headerMegaBuyAuction', path: '/auction?filter=auction' },
      { labelKey: 'headerMegaBuyNow', path: '/auction?filter=buy_now' },
      { labelKey: 'mapLink', path: '/map', requiresAuth: true },
      { labelKey: 'favorites', path: '/favorites' },
    ],
  },
  {
    id: 'invest',
    titleKey: 'headerMegaInvest',
    icon: FiTrendingUp,
    links: [
      { labelKey: 'footerShares', path: CO_INVESTMENT_PATH },
      { labelKey: 'debtsTitle', path: '/debts' },
      { labelKey: 'calculator', path: '/calculator' },
      { labelKey: 'headerMegaCompare', path: '/compare' },
    ],
  },
  {
    id: 'services',
    titleKey: 'headerMegaServices',
    icon: FiLayers,
    links: [
      { labelKey: 'testDrive', path: TEST_DRIVE_PATH },
      { labelKey: 'aiAssistant', path: null, action: 'ai' },
      { labelKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
      { labelKey: 'headerMegaNews', path: '/news' },
    ],
  },
  {
    id: 'sellers',
    titleKey: 'headerMegaSellers',
    icon: FiBarChart2,
    links: [
      { labelKey: 'headerMegaListProperty', path: '/seller' },
      { labelKey: 'roleSwitch_sellerCabinet', path: getCabinetHomePath('seller'), requiresAuth: true },
      { labelKey: 'headerMegaAbout', path: '/about' },
      { labelKey: 'moreSections', path: '/sections' },
    ],
  },
]

export default function HeaderMegaMenu({
  onClose,
  openLoginOrNavigate,
  closeAfterNav,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLink = (link) => {
    if (link.action === 'ai') {
      window.dispatchEvent(new CustomEvent('openAIChat'))
      closeAfterNav?.()
      return
    }

    if (link.requiresAuth) {
      openLoginOrNavigate(link.path, true)
      return
    }

    navigate(link.path)
    closeAfterNav?.()
  }

  const renderColumn = (column) => {
    const Icon = column.icon
    return (
      <section
        key={column.id}
        id={`mega-${column.id}`}
        className={`header-mega-menu__column${column.id === 'quick' ? ' header-mega-menu__column--mobile-only' : ''}`}
        aria-labelledby={`mega-title-${column.id}`}
      >
        <div className="header-mega-menu__column-head">
          <span className="header-mega-menu__column-icon" aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
          <h3 id={`mega-title-${column.id}`} className="header-mega-menu__column-title">
            {t(column.titleKey)}
          </h3>
        </div>
        <ul id={`mega-links-${column.id}`} className="header-mega-menu__links">
          {column.links.map((link) => (
            <li key={link.labelKey}>
              <button type="button" className="header-mega-menu__link" onClick={() => handleLink(link)}>
                {t(link.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div className="header-mega-menu">
      <div className="header-mega-menu__mobile-top">
        <button
          type="button"
          className="header-mega-menu__brand site-brand site-brand--header"
          onClick={() => {
            navigate('/')
            closeAfterNav?.()
          }}
        >
          <SiteBrandIcon />
          <span className="site-brand__text">sellyourbrick</span>
        </button>
        <button
          type="button"
          className="header-mega-menu__close"
          onClick={onClose}
          aria-label={t('closeMenu')}
        >
          <FiX size={20} />
        </button>
      </div>

      <div className="header-mega-menu__scroll">
        <div className="header-mega-menu__grid">
        {renderColumn(MOBILE_QUICK_COLUMN)}
        {MEGA_COLUMNS.map((column) => renderColumn(column))}
        </div>
      </div>
    </div>
  )
}
