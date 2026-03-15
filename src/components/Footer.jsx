import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiChevronDown, FiCheck } from 'react-icons/fi'
import { FaApple, FaWhatsapp } from 'react-icons/fa'
import whatsappQR from '../../6019556644745841501.png'
import './Footer.css'

const Footer = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)
  const languageDropdownRef = useRef(null)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Мгновенная прокрутка при переходе на новую страницу
    })
  }

  const languages = [
    { code: 'ru', name: 'Русский', flagClass: 'footer__flag--ru' },
    { code: 'en', name: 'English', flagClass: 'footer__flag--gb' },
    { code: 'de', name: 'Deutsch', flagClass: 'footer__flag--de' },
    { code: 'es', name: 'Español', flagClass: 'footer__flag--es' },
    { code: 'fr', name: 'Français', flagClass: 'footer__flag--fr' },
    { code: 'sv', name: 'Svenska', flagClass: 'footer__flag--sv' },
  ]

  const handleLanguageChange = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode)
      setIsLanguageDropdownOpen(false)
    } catch (error) {
      console.error('Error changing language:', error)
    }
  }

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

  const handleDownloadApp = (platform) => {
    if (platform === 'android') {
      window.open('https://play.google.com/store/apps', '_blank')
    } else if (platform === 'ios') {
      window.open('https://apps.apple.com/', '_blank')
    }
  }

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setIsLanguageDropdownOpen(false)
      }
    }

    if (isLanguageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isLanguageDropdownOpen])

  return (
    <footer className="footer">
      <div className="footer__container">
        {/* Верхний блок ссылок, как на ЦИАН — по колонкам */}
        <div className="footer__menu">
          <div className="footer__menu-column">
            <Link to="/" onClick={scrollToTop} className="footer__menu-link">{t('home') || 'Главная'}</Link>
            <Link to="/about" onClick={scrollToTop} className="footer__menu-link">{t('aboutUs') || 'О нас'}</Link>
            <Link to="/map" onClick={scrollToTop} className="footer__menu-link">{t('mapLink')}</Link>
            <Link to="/subscriptions" onClick={scrollToTop} className="footer__menu-link">{t('tariffs')}</Link>
            <Link to="/bonuses" onClick={scrollToTop} className="footer__menu-link">Бонусы</Link>
            <Link to="/shares" onClick={scrollToTop} className="footer__menu-link">Доли</Link>
            <Link to="/debts" onClick={scrollToTop} className="footer__menu-link">Долги</Link>
            <Link to="/calculator" onClick={scrollToTop} className="footer__menu-link">💰 Калькулятор доходности</Link>
          </div>
          <div className="footer__menu-column">
            <Link to="/auction" onClick={scrollToTop} className="footer__menu-link">{t('auction')}</Link>
            <Link to="/data" onClick={scrollToTop} className="footer__menu-link">{t('legalDocs')}</Link>
            <button type="button" className="footer__menu-link">{t('advertising')}</button>
          </div>
          <div className="footer__menu-column">
            <button type="button" className="footer__menu-link">{t('career')}</button>
            <Link to="/map" onClick={scrollToTop} className="footer__menu-link">{t('mapSearch')}</Link>
            <button type="button" className="footer__menu-link">{t('promotion')}</button>
          </div>
          <div className="footer__menu-column">
            <button type="button" className="footer__menu-link">{t('investors')}</button>
            <button type="button" className="footer__menu-link">{t('vacancies')}</button>
            <button type="button" className="footer__menu-link">{t('tvAdvertising')}</button>
          </div>
          <div className="footer__menu-column">
            <Link to="/chat" onClick={scrollToTop} className="footer__menu-link">{t('help')}</Link>
            <Link to="/jeton" onClick={scrollToTop} className="footer__menu-link">Jeton</Link>
            <button type="button" className="footer__menu-link">{t('superAgents')}</button>
            <button type="button" className="footer__menu-link">{t('mortgage')}</button>
          </div>
        </div>

        {/* Текстовый блок описания сервиса */}
        <div className="footer__description">
          <p className="footer__description-text">
            {t('footerDescription')}{' '}
            <button type="button" className="footer__description-link">{t('userAgreementLink')}</button>{' '}
            {t('and')}{' '}
            <button type="button" className="footer__description-link">{t('privacyPolicyLink')}</button>{' '}
            Sellyourbrick. {t('payingForServices')}{' '}
            <button type="button" className="footer__description-link">{t('licenseAgreement')}</button>.
          </p>
          <p className="footer__description-text">
            {t('recommendationTechDescription')}{' '}
            <button type="button" className="footer__description-link">{t('recommendationTech')}</button>.
          </p>
        </div>

        {/* Нижняя полоса с логотипом и кнопками, как на скрине */}
        <div className="footer__bottom">
          <div className="footer__brand">
            <div className="footer__brand-icon">
              <span className="footer__brand-house" />
            </div>
            <span className="footer__brand-text">Sellyourbrick</span>
          </div>

          <div className="footer__bottom-links">
            <button type="button" className="footer__bottom-link">Мобильная версия сайта</button>
            <button type="button" className="footer__bottom-link">О приложении</button>
          </div>

          <div className="footer__whatsapp-qr">
            <img 
              src={whatsappQR}
              alt="WhatsApp QR код" 
              className="footer__qr-image"
            />
          </div>

          <div className="footer__store-buttons">
            <button
              type="button"
              className="footer__store-btn"
              onClick={() => handleDownloadApp('android')}
              aria-label="Скачать из Google Play"
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
              onClick={() => handleDownloadApp('ios')}
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
              href="https://wa.me/447700183959"
              target="_blank"
              rel="noopener noreferrer"
              className="footer__store-btn"
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
                aria-label="Выбрать язык"
              >
                <span className={`footer__language-flag ${currentLanguage.flagClass}`}></span>
                <span className="footer__language-name">{currentLanguage.name}</span>
                <FiChevronDown 
                  size={16} 
                  className={`footer__language-chevron ${isLanguageDropdownOpen ? 'footer__language-chevron--open' : ''}`}
                />
              </button>
              {isLanguageDropdownOpen && (
                <div className="footer__language-dropdown">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`footer__language-option ${i18n.language === lang.code ? 'footer__language-option--active' : ''}`}
                      onClick={() => handleLanguageChange(lang.code)}
                    >
                      <span className={`footer__language-flag ${lang.flagClass}`}></span>
                      <span className="footer__language-name">{lang.name}</span>
                      {i18n.language === lang.code && <FiCheck size={16} className="footer__language-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

