'use client';

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCheck,
  FiMenu,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import {
  PiBank,
  PiChartLineUp,
  PiHandshake,
  PiHouseLine,
  PiMedal,
  PiShieldCheck,
  PiUserCircleGear,
  PiWallet,
} from 'react-icons/pi';
import { publicAsset } from '@/utils/publicAsset';
import { CO_INVESTMENT_PATH } from '@/utils/sectionRoutes';
import { scrollMainTo } from '@/utils/mainScroll';
import './about-luxury.css';

const ASSETS = {
  hero: publicAsset('images/sellyourbrick/about/dubai-hero-ref.jpg'),
  market: publicAsset('images/sellyourbrick/about/dubai-market-ref.jpg'),
  process: publicAsset('images/sellyourbrick/about/dubai-process-ref.jpg'),
  burj: publicAsset('images/sellyourbrick/about/dubai-burj-ref.jpg'),
  cta: publicAsset('images/sellyourbrick/about/dubai-cta-ref.jpg'),
  teamAlex: publicAsset('images/sellyourbrick/about/team-alex.jpg'),
  teamMaria: publicAsset('images/sellyourbrick/about/team-maria.jpg'),
  teamDmitry: publicAsset('images/sellyourbrick/about/team-dmitry.jpg'),
};

const navItems = [
  { label: 'Инвестиционные стратегии', to: CO_INVESTMENT_PATH },
  { label: 'Как это работает', to: '#process' },
  { label: 'Калькулятор', to: '/calculator' },
  { label: 'О нас', to: '/about', active: true },
  { label: 'Контакты', to: '#contacts' },
];

const heroStats = [
  { icon: FiBarChart2, value: '€41.5м+', label: 'инвестировано всего' },
  { icon: FiUsers, value: '24м+', label: 'выплачено инвесторам' },
  { icon: FiShield, value: '46', label: 'проектов успешно завершено' },
  { icon: PiHandshake, value: '35к+', label: 'доверяющих инвесторов' },
];

const trustItems = [
  { icon: PiMedal, title: 'Лицензированная', text: 'компания в ОАЭ' },
  { icon: PiBank, title: 'Регулируется', text: 'международными стандартами' },
  { icon: PiShieldCheck, title: 'Прозрачность', text: 'на всех этапах' },
  { icon: PiWallet, title: 'Выплаты отчеты', text: 'и собственности' },
  { icon: FiShield, title: 'Защита капитала', text: 'и управление рисками' },
];

const platformBenefits = [
  'Доступ к лучшим объектам на рынке',
  'Профессиональный анализ и управление',
  'Прозрачная отчетность и выплаты',
  'Фокус на долгосрочной доходности',
];

const processSteps = [
  {
    icon: PiHouseLine,
    title: 'Анализ и отбор',
    text: 'Наши эксперты отбирают лучшие объекты с описанием потенциальной доходности.',
  },
  {
    icon: PiChartLineUp,
    title: 'Инвестирование',
    text: 'Вы инвестируете онлайн от минимальной суммы с полным юридическим оформлением.',
  },
  {
    icon: PiUserCircleGear,
    title: 'Управление',
    text: 'Мы берем на себя все процессы: строительство, аренду, управление и контроль.',
  },
  {
    icon: FiUsers,
    title: 'Доход',
    text: 'Вы получаете регулярный доход от аренды и рост стоимости актива.',
  },
];

const dubaiReasons = [
  ['Стабильная экономика', 'и политическая безопасность'],
  ['Налоговые преимущества', '0% на доход и прирост капитала'],
  ['Высокий спрос', 'со стороны арендаторов'],
  ['Мировой центр', 'бизнеса и туризма'],
];

const team = [
  {
    name: 'Александр Петров',
    role: 'CEO & Co-Founder',
    text: 'Более 10 лет в инвестициях и управлении активами',
    image: ASSETS.teamAlex,
  },
  {
    name: 'Мария Иванова',
    role: 'Head of Investments',
    text: 'Эксперт в недвижимости и структурировании сделок',
    image: ASSETS.teamMaria,
  },
  {
    name: 'Дмитрий Смирнов',
    role: 'Head of Asset Management',
    text: 'Опыт в управлении проектами недвижимости в Дубае',
    image: ASSETS.teamDmitry,
  },
];

export default function About() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('al-about-route');
    scrollMainTo(0, 0);
    window.dispatchEvent(new Event('resetSection'));
    return () => {
      document.body.classList.remove('al-about-route');
    };
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    setMobileMenuOpen(false);
    const timer = window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="al-page">
      <header className="al-topbar" aria-label="Основная навигация">
        <div className="al-shell al-topbar__inner">
          <Link className="al-logo" to="/" aria-label="Sell Your Brick">
            <span>SELL YOUR</span>
            <strong>YOURBRICK</strong>
          </Link>

          <nav className="al-nav" aria-label="Разделы страницы">
            {navItems.map((item) => (
              <Link key={item.label} className={item.active ? 'is-active' : undefined} to={item.to}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="al-topbar__actions">
            <Link className="al-auth al-auth--login" to="/profile">
              Войти
            </Link>
            <Link className="al-auth al-auth--register" to="/profile">
              Регистрация
            </Link>
          </div>

          <button
            className="al-mobile-menu"
            type="button"
            aria-label="Открыть меню"
            aria-expanded={mobileMenuOpen}
            aria-controls="about-mobile-menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <FiMenu aria-hidden />
          </button>
        </div>

        <div
          id="about-mobile-menu"
          className={`al-mobile-panel${mobileMenuOpen ? ' is-open' : ''}`}
          hidden={!mobileMenuOpen}
        >
          <div className="al-shell">
            {navItems.map((item) => (
              <Link
                key={item.label}
                className={item.active ? 'is-active' : undefined}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="al-mobile-panel__actions">
              <Link className="al-auth al-auth--login" to="/profile" onClick={() => setMobileMenuOpen(false)}>
                Войти
              </Link>
              <Link className="al-auth al-auth--register" to="/profile" onClick={() => setMobileMenuOpen(false)}>
                Регистрация
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="al-hero" aria-labelledby="about-hero-title">
          <img className="al-hero__image" src={ASSETS.hero} alt="" aria-hidden />
          <div className="al-hero__veil" aria-hidden />
          <div className="al-shell al-hero__content">
            <div className="al-hero__copy">
              <h1 id="about-hero-title">
                Мы превращаем недвижимость Дубая в возможности{' '}
                <span>для каждого инвестора</span>
              </h1>
              <p>
                SellYourBrick - инвестиционная платформа, которая открывает доступ к
                премиальной недвижимости Дубая и обеспечивает стабильный доход с
                максимальной прозрачностью.
              </p>
            </div>

            <div className="al-hero__stats" aria-label="Ключевые показатели">
              {heroStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <article className="al-hero-stat" key={stat.value}>
                    <Icon aria-hidden />
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="al-trust" aria-label="Гарантии платформы">
          <div className="al-shell al-trust__bar">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <article className="al-trust__item" key={item.title}>
                  <span className="al-icon-ring">
                    <Icon aria-hidden />
                  </span>
                  <p>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="al-platform" id="about-intro" aria-labelledby="platform-title">
          <div className="al-shell al-platform__grid">
            <div className="al-copy-block">
              <p className="al-kicker">О платформе</p>
              <h2 id="platform-title">
                SellYourBrick - мост между инвесторами и премиальной недвижимостью Дубая
              </h2>
              <p>
                Мы объединяем экспертизу в недвижимости, современные технологии и
                глубокое понимание рынка, чтобы каждый инвестор мог получать
                максимальную выгоду.
              </p>

              <ul className="al-check-list">
                {platformBenefits.map((benefit) => (
                  <li key={benefit}>
                    <span>
                      <FiCheck aria-hidden />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <figure className="al-market-card">
              <img src={ASSETS.market} alt="Небоскребы Дубая и отчет по рынку недвижимости" />
            </figure>
          </div>
        </section>

        <section className="al-process" id="process" aria-labelledby="process-title">
          <div className="al-shell al-process__grid">
            <div className="al-process__main">
              <p className="al-kicker">Как это работает</p>
              <h2 id="process-title">Простой процесс - надежный результат</h2>

              <div className="al-steps">
                {processSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <article className="al-step" key={step.title}>
                      <span className="al-step__number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="al-step__icon">
                        <Icon aria-hidden />
                      </span>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="al-process-card" aria-label="Ожидаемые показатели">
              <img src={ASSETS.process} alt="Интерьер с бассейном и видом на Дубай" />
            </aside>
          </div>
        </section>

        <section className="al-dubai-team" aria-labelledby="dubai-title">
          <div className="al-shell al-dubai-team__grid">
            <div className="al-dubai-card">
              <div className="al-dubai-card__list">
                <h2 id="dubai-title">Почему Дубай?</h2>
                {dubaiReasons.map(([title, text]) => (
                  <article key={title}>
                    <span>
                      <PiShieldCheck aria-hidden />
                    </span>
                    <p>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </p>
                  </article>
                ))}
              </div>
              <img src={ASSETS.burj} alt="Вид на Burj Al Arab и береговую линию Дубая" />
            </div>

            <div className="al-team" id="about-agents">
              <p className="al-kicker">Наша команда</p>
              <h2>Эксперты с международным опытом</h2>

              <div className="al-team__grid">
                {team.map((member) => (
                  <article className="al-member" key={member.name}>
                    <img src={member.image} alt={member.name} />
                    <div>
                      <h3>{member.name}</h3>
                      <p>{member.role}</p>
                      <span>{member.text}</span>
                      <a href="https://www.linkedin.com" aria-label={`${member.name} в LinkedIn`}>
                        in
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="al-cta" id="contacts" aria-labelledby="cta-title">
          <img src={ASSETS.cta} alt="" aria-hidden />
          <div className="al-shell al-cta__content">
            <p className="al-kicker">Станьте частью будущего</p>
            <h2 id="cta-title">Присоединяйтесь к сообществу умных инвесторов</h2>
            <p>Мы объединяем капитал с возможностями и создаем реальные результаты.</p>
            <Link className="al-gold-btn" to={CO_INVESTMENT_PATH}>
              Начать инвестировать
              <FiArrowRight aria-hidden />
            </Link>
          </div>
        </section>

        <section className="al-footer-proof" aria-label="Финальные преимущества">
          <div className="al-shell al-footer-proof__grid">
            {[
              ['Проверенные сделки', 'Каждый объект проходит строгий отбор и юридическую проверку.'],
              ['Прозрачность', 'Все данные открыты: от плана до финансового результата.'],
              ['Стабильный доход', 'Стратегия с фокусом на возврат капитала и прибыль.'],
              ['Защита капитала', 'Комплексный анализ и управление рисками.'],
            ].map(([title, text]) => (
              <article key={title}>
                <FiBriefcase aria-hidden />
                <p>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
