import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { FaApple, FaWhatsapp } from 'react-icons/fa'
import { MdSentimentDissatisfied } from 'react-icons/md'
import { FiX, FiChevronDown, FiCheck } from 'react-icons/fi'
import whatsappQR from '../../6019556644745841501.png'
import './Footer.css'
import { scrollMainTo } from '../utils/mainScroll'
import { navigateToWallet } from '../utils/walletNavigation'
import { isSiteUserSignedIn, routeRequiresSiteLogin } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { UI_LANGUAGES } from '../constants/uiLanguages'

const WHATSAPP_HREF = 'https://wa.me/447700183959'

const Footer = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoaded: userLoaded } = useUser()
  const languageDropdownRef = useRef(null)
  const [storeComingSoonOpen, setStoreComingSoonOpen] = useState(false)
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)

  const currentLanguage =
    UI_LANGUAGES.find((lang) => lang.code === (i18n.language || 'ru').split('-')[0]) ||
    UI_LANGUAGES[0]

  const handleLanguageChange = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode)
      setIsLanguageDropdownOpen(false)
    } catch (error) {
      console.error('Error changing language:', error)
    }
  }

  const scrollToTop = () => {
    scrollMainTo(0, 0, 'instant')
  }

  const openStoreComingSoon = () => setStoreComingSoonOpen(true)
  const closeStoreComingSoon = useCallback(() => setStoreComingSoonOpen(false), [])

  useEffect(() => {
    if (!storeComingSoonOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeStoreComingSoon()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [storeComingSoonOpen, closeStoreComingSoon])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setIsLanguageDropdownOpen(false)
      }
    }
    if (isLanguageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isLanguageDropdownOpen])

  const goWallet = () => {
    scrollToTop()
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    navigateToWallet(navigate, location.pathname)
  }

  const handleFooterProtectedNav = (to) => {
    scrollToTop()
    if (routeRequiresSiteLogin(to) && !isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    navigate(to)
  }

  /** @type {Array<Array<{ to?: string; onClick?: () => void; label: string }>>} */
  const desktopColumns = [
    [
      { to: '/', label: t('home') },
      { to: '/auction', label: t('auction') },
      { to: '/auction?filter=buy_now', label: t('buyNowSectionTitle') },
      { to: '/shares', label: t('shares') },
    ],
    [
      { to: '/debts', label: t('debtsTitle') },
      { to: '/favorites', label: t('footerLiked') },
      { to: '/compare', label: t('footerCompareObjects') },
      { to: '/chat?manager=1', label: t('chat') },
    ],
    [
      { to: '/map', label: t('mapLink') },
      { to: '/bonuses', label: t('bonuses') },
      { to: '/calculator', label: t('calculator') },
      { to: '/about#about-intro', label: t('aboutUs') },
    ],
    [
      { onClick: goWallet, label: t('wallet') },
      { to: '/profile', label: t('profile') },
      { to: '/about#about-for-investors', label: t('footerForInvestors') },
      { to: '/about#about-team', label: t('footerOurTeam') },
    ],
    [
      { to: '/subscriptions#subscriptions-pricing-section', label: t('tariffs') },
      { to: '/data#data-section-main', label: t('footerPersonalData') },
      { to: '/data#data-section-documents', label: t('footerDocumentsSection') },
      { to: '/chat?manager=1', label: t('footerTechSupport') },
    ],
  ]

  const allFooterLinks = desktopColumns.flat()
  const mobileCol1 = allFooterLinks.slice(0, 10)
  const mobileCol2 = allFooterLinks.slice(10)

  const renderLink = (item, i, keyPrefix) => {
    const key = `${keyPrefix}-${i}`
    if (item.onClick) {
      return (
        <button
          key={key}
          type="button"
          className="footer__menu-link"
          onClick={() => {
            item.onClick()
          }}
        >
          {item.label}
        </button>
      )
    }
    if (routeRequiresSiteLogin(item.to)) {
      return (
        <button
          key={key}
          type="button"
          className="footer__menu-link"
          onClick={() => handleFooterProtectedNav(item.to)}
        >
          {item.label}
        </button>
      )
    }
    return (
      <Link key={key} to={item.to} onClick={scrollToTop} className="footer__menu-link">
        {item.label}
      </Link>
    )
  }

  return (
    <footer id="site-footer" className="footer">
      <div className="footer__container">
        <div className="footer__upper">
          <div className="footer__upper-left">
            <div className="footer__nav-qr">
              <div className="footer__menus-inner">
                <div className="footer__menu footer__menu--desktop">
                  {desktopColumns.map((col, ci) => (
                    <div key={ci} className="footer__menu-column">
                      {col.map((item, i) => renderLink(item, i, `d${ci}`))}
                    </div>
                  ))}
                </div>

                <div className="footer__menu footer__menu--mobile">
                  <div className="footer__menu-column">{mobileCol1.map((item, i) => renderLink(item, i, 'm1'))}</div>
                  <div className="footer__menu-column">{mobileCol2.map((item, i) => renderLink(item, i, 'm2'))}</div>
                </div>
              </div>

              <div className="footer__whatsapp-qr">
                <img src={whatsappQR} alt="WhatsApp QR" className="footer__qr-image" />
              </div>

              <div className="footer__brand footer__brand--mobile">
                <div className="footer__brand-icon">
                  <span className="footer__brand-house" />
                </div>
                <span className="footer__brand-text">Sellyourbrick</span>
              </div>
            </div>
          </div>

          <div className="footer__upper-right">
            <div className="footer__store-buttons">
            <div className="footer__brand footer__brand--inline footer__brand--desktop-inline">
              <div className="footer__brand-icon">
                <span className="footer__brand-house" />
              </div>
              <span className="footer__brand-text">Sellyourbrick</span>
            </div>
            <button
              type="button"
              className="footer__store-btn"
              onClick={openStoreComingSoon}
              aria-label={t('downloadGooglePlay')}
            >
              <div className="footer__store-icon footer__store-icon--google">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z" fill="#4285F4"/>
                  <path d="M16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12Z" fill="#EA4335"/>
                  <path d="M6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" fill="#FBBC04"/>
                  <path d="M16.81 8.88L20.16 6.51C20.66 6.26 21 5.75 21 5.16V18.84C21 18.25 20.66 17.74 20.16 17.49L16.81 15.12L14.54 12.85L16.81 8.88Z" fill="#34A853"/>
                </svg>
              </div>
              <div className="footer__store-text">
                <span className="footer__store-name">Google Play</span>
              </div>
            </button>

            <button
              type="button"
              className="footer__store-btn"
              onClick={openStoreComingSoon}
              aria-label={`${t('downloadIn')} App Store`}
            >
              <div className="footer__store-icon">
                <FaApple size={18} />
              </div>
              <div className="footer__store-text">
                <span className="footer__store-name">App Store</span>
              </div>
            </button>

            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="footer__store-btn"
              aria-label="WhatsApp"
            >
              <div className="footer__store-icon footer__store-icon--whatsapp">
                <FaWhatsapp size={18} />
              </div>
              <div className="footer__store-text">
                <span className="footer__store-name">WhatsApp</span>
              </div>
            </a>

            <div className="footer__language-selector" ref={languageDropdownRef}>
              <button
                type="button"
                className="footer__language-selector-btn"
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                aria-label={t('selectLanguageAria')}
                aria-expanded={isLanguageDropdownOpen}
              >
                <span className={`footer__language-flag ${currentLanguage.flagClass}`} />
                <span className="footer__language-name">{currentLanguage.name}</span>
                <FiChevronDown
                  size={16}
                  className={`footer__language-chevron ${isLanguageDropdownOpen ? 'footer__language-chevron--open' : ''}`}
                />
              </button>
              {isLanguageDropdownOpen && (
                <div className="footer__language-dropdown">
                  {UI_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`footer__language-option ${(i18n.language || 'ru').split('-')[0] === lang.code ? 'footer__language-option--active' : ''}`}
                      onClick={() => handleLanguageChange(lang.code)}
                    >
                      <span className={`footer__language-flag ${lang.flagClass}`} />
                      <span className="footer__language-name">{lang.name}</span>
                      {(i18n.language || 'ru').split('-')[0] === lang.code && (
                        <FiCheck size={16} className="footer__language-check" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {storeComingSoonOpen && (
        <div
          className="footer-store-modal-overlay"
          role="presentation"
          onClick={closeStoreComingSoon}
        >
          <div
            className="footer-store-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-store-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="footer-store-modal__close"
              onClick={closeStoreComingSoon}
              aria-label={t('footerCloseModal')}
            >
              <FiX size={22} />
            </button>
            <MdSentimentDissatisfied className="footer-store-modal__icon" aria-hidden />
            <p id="footer-store-modal-title" className="footer-store-modal__title">
              {t('footerComingSoon')}
            </p>
          </div>
        </div>
      )}
    </footer>
  )
}

export default Footer
