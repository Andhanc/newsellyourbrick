import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi'
import { FaWhatsapp, FaTelegramPlane, FaInstagram, FaLinkedinIn } from 'react-icons/fa'
import { CO_INVESTMENT_PATH } from '../utils/sectionPaths'
import './InvestorFooter.css'

const COLUMN_DEFS = [
  {
    titleKey: 'footerColListings',
    links: [
      { labelKey: 'auction', to: '/auction?filter=auction' },
      { labelKey: 'headerMegaBuyNow', to: '/auction/buy-now' },
      { labelKey: 'shares', to: CO_INVESTMENT_PATH },
      { labelKey: 'debtsTitle', to: '/debts' },
      { labelKey: 'siteNavMapObjects', to: '/map' },
    ],
  },
  {
    titleKey: 'footerColCompany',
    links: [
      { labelKey: 'aboutUs', to: '/about#about-intro' },
      { labelKey: 'footerAllSections', to: '/sections' },
      { labelKey: 'news', to: '/news' },
      { labelKey: 'privateClubPageTitle', to: '/private-club' },
      { labelKey: 'tariffs', to: '/subscriptions#subscriptions-pricing-section' },
    ],
  },
  {
    titleKey: 'footerForInvestors',
    links: [
      { labelKey: 'investFooterHowToStart', to: '/about#about-intro' },
      { labelKey: 'calculator', to: '/calculator' },
      { labelKey: 'footerCompareObjects', to: '/compare' },
      { labelKey: 'favorites', to: '/favorites' },
    ],
  },
  {
    titleKey: 'chat',
    links: [
      { labelKey: 'investFooterWriteSupport', to: '/chat?manager=1' },
      { labelKey: 'investFooterSupport247', to: '/chat?manager=1' },
      { labelKey: 'becomeSeller', to: '/add-property' },
    ],
  },
]

const socials = [
  { labelKey: 'sectionsSocialWhatsapp', href: 'https://wa.me/447700183959', icon: FaWhatsapp },
  { labelKey: 'sectionsSocialTelegram', href: 'https://t.me/', icon: FaTelegramPlane },
  { labelKey: 'sectionsSocialInstagram', href: 'https://instagram.com/', icon: FaInstagram },
  { labelKey: 'investFooterLinkedIn', href: 'https://linkedin.com/', icon: FaLinkedinIn },
]

const currentYear = new Date().getFullYear()

export default function InvestorFooter() {
  const { t } = useTranslation()

  return (
    <footer className="invest-footer" aria-label={t('investFooterAria')}>
      <div className="invest-footer__inner">
        <div className="invest-footer__top">
          <div className="invest-footer__brand">
            <Link to="/" className="invest-footer__logo" aria-label={t('investFooterHomeAria')}>
              <span className="invest-footer__logo-mark" aria-hidden />
              <span className="invest-footer__logo-text">SellYourBrick</span>
            </Link>
            <p className="invest-footer__tagline">{t('investFooterTagline')}</p>

            <ul className="invest-footer__contacts">
              <li>
                <FiMail aria-hidden />
                <a href="mailto:hello@sellyourbrick.com">hello@sellyourbrick.com</a>
              </li>
              <li>
                <FiPhone aria-hidden />
                <a href="tel:+447700183959">+44 7700 183959</a>
              </li>
              <li>
                <FiMapPin aria-hidden />
                <span>Dubai · London · Lisbon</span>
              </li>
            </ul>

            <div className="invest-footer__socials">
              {socials.map(({ labelKey, href, icon: Icon }) => (
                <a
                  key={labelKey}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="invest-footer__social"
                  aria-label={t(labelKey)}
                >
                  <Icon aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <nav className="invest-footer__nav" aria-label={t('investFooterNavAria')}>
            {COLUMN_DEFS.map((column) => (
              <div className="invest-footer__col" key={column.titleKey}>
                <h3 className="invest-footer__col-title">{t(column.titleKey)}</h3>
                <ul className="invest-footer__list">
                  {column.links.map((link) => (
                    <li key={link.labelKey}>
                      <Link to={link.to} className="invest-footer__link">
                        {t(link.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="invest-footer__bottom">
          <p className="invest-footer__copy">{t('investFooterCopyright', { year: currentYear })}</p>
          <div className="invest-footer__legal">
            <Link to="/about#about-intro">{t('investFooterPrivacy')}</Link>
            <Link to="/about#about-intro">{t('investFooterTerms')}</Link>
            <Link to="/about#about-intro">{t('investFooterCookie')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
