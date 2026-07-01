import { Link } from 'react-router-dom'
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi'
import { FaWhatsapp, FaTelegramPlane, FaInstagram, FaLinkedinIn } from 'react-icons/fa'
import { CO_INVESTMENT_PATH } from '../utils/sectionPaths'
import './InvestorFooter.css'

const columns = [
  {
    title: 'Объекты',
    links: [
      { label: 'Аукцион', to: '/auction?filter=auction' },
      { label: 'Купить сейчас', to: '/auction?filter=buy_now' },
      { label: 'Доли', to: CO_INVESTMENT_PATH },
      { label: 'Долги', to: '/debts' },
      { label: 'Карта объектов', to: '/map' },
    ],
  },
  {
    title: 'Компания',
    links: [
      { label: 'О нас', to: '/about#about-intro' },
      { label: 'Все разделы', to: '/sections' },
      { label: 'Новости', to: '/news' },
      { label: 'Частный клуб', to: '/private-club' },
      { label: 'Тарифы', to: '/subscriptions#subscriptions-pricing-section' },
    ],
  },
  {
    title: 'Инвесторам',
    links: [
      { label: 'Как начать', to: '/about#about-intro' },
      { label: 'Калькулятор доходности', to: '/calculator' },
      { label: 'Сравнение объектов', to: '/compare' },
      { label: 'Избранное', to: '/favorites' },
    ],
  },
  {
    title: 'Поддержка',
    links: [
      { label: 'Чат с менеджером', to: '/chat?manager=1' },
      { label: 'Техподдержка 24/7', to: '/chat?manager=1' },
      { label: 'Стать продавцом', to: '/add-property' },
    ],
  },
]

const socials = [
  { label: 'WhatsApp', href: 'https://wa.me/447700183959', icon: FaWhatsapp },
  { label: 'Telegram', href: 'https://t.me/', icon: FaTelegramPlane },
  { label: 'Instagram', href: 'https://instagram.com/', icon: FaInstagram },
  { label: 'LinkedIn', href: 'https://linkedin.com/', icon: FaLinkedinIn },
]

const currentYear = new Date().getFullYear()

export default function InvestorFooter() {
  return (
    <footer className="invest-footer" aria-label="Подвал сайта">
      <div className="invest-footer__inner">
        <div className="invest-footer__top">
          <div className="invest-footer__brand">
            <Link to="/" className="invest-footer__logo" aria-label="SellYourBrick — на главную">
              <span className="invest-footer__logo-mark" aria-hidden />
              <span className="invest-footer__logo-text">SellYourBrick</span>
            </Link>
            <p className="invest-footer__tagline">
              Инвестиционная платформа недвижимости: аукционы, доли и долговые инструменты
              с проверенной доходностью в 25+ странах.
            </p>

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
              {socials.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="invest-footer__social"
                  aria-label={label}
                >
                  <Icon aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <nav className="invest-footer__nav" aria-label="Разделы сайта">
            {columns.map((column) => (
              <div className="invest-footer__col" key={column.title}>
                <h3 className="invest-footer__col-title">{column.title}</h3>
                <ul className="invest-footer__list">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="invest-footer__link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="invest-footer__bottom">
          <p className="invest-footer__copy">© {currentYear} SellYourBrick. Все права защищены.</p>
          <div className="invest-footer__legal">
            <Link to="/about#about-intro">Политика конфиденциальности</Link>
            <Link to="/about#about-intro">Условия использования</Link>
            <Link to="/about#about-intro">Cookie</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
