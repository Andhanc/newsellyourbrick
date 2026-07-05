'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HiArrowUpRight,
  HiBars3,
  HiChartBarSquare,
  HiCheckCircle,
  HiGlobeAlt,
  HiShieldCheck,
  HiSparkles,
  HiXMark,
} from 'react-icons/hi2';
import { publicAsset } from '@/utils/publicAsset';
import { CO_INVESTMENT_PATH } from '@/utils/sectionRoutes';
import { scrollMainTo } from '@/utils/mainScroll';
import './about-luxury.css';

const ASSETS = {
  hero: publicAsset('images/sellyourbrick/about-corporate/overview-hero-building.png'),
  analyticsTeam: publicAsset('images/sellyourbrick/about-corporate/analytics-team.png'),
  workshopTeam: publicAsset('images/sellyourbrick/about-corporate/workshop-team.png'),
  botanical: publicAsset('images/sellyourbrick/about-corporate/botanical-leaves.png'),
  meeting: publicAsset('images/sellyourbrick/about-corporate/enterprise-meeting.png'),
  blueLoop: publicAsset('images/sellyourbrick/about-corporate/blue-glass-loop.png'),
};

const navItems = [
  { label: 'Overview', to: '#overview' },
  { label: 'Analytics', to: '#analytics' },
  { label: 'Scale', to: '#scale' },
  { label: 'Systems', to: '#systems' },
  { label: 'Contact', to: '#contacts' },
];

const analyticsCards = [
  {
    label: 'Average ROI',
    eyebrow: '09-02',
    value: '2.50x',
    image: ASSETS.analyticsTeam,
  },
  {
    label: 'Monthly Users',
    eyebrow: '09-11',
    value: '75,00+',
    image: ASSETS.workshopTeam,
  },
];

const capabilities = [
  { label: 'Global Scalability', active: true },
  { label: 'Smart Analytics' },
  { label: 'Efficient Workflows' },
];

const metricCards = [
  {
    value: 150,
    suffix: '+',
    text: 'We are a forward-thinking company focused on delivering scalable, efficient, and impactful solutions.',
  },
  {
    value: 1200,
    suffix: '+',
    text: 'Our operating model connects data, capital, and property workflows into one measurable ecosystem.',
  },
];

const systemNotes = [
  {
    title: 'Smart System',
    text: 'Our approach combines strategic thinking with modern tools to deliver impactful results.',
  },
  {
    title: 'Cost Efficiency',
    text: 'We design lean workflows that reduce friction and keep every stakeholder aligned.',
  },
];

function ArrowBadge({ className = '', label = 'Explore' }: { className?: string; label?: string }) {
  return (
    <span className={`al-arrow-badge ${className}`} aria-label={label}>
      <HiArrowUpRight aria-hidden />
    </span>
  );
}

function Reveal({
  as: Tag = 'div',
  className = '',
  delay = 0,
  children,
}: {
  as?: ElementType;
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <Tag className={`al-reveal ${className}`} style={{ '--al-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLStrongElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const start = performance.now();
        const duration = 1400;

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - (1 - progress) ** 3;
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value]);

  return (
    <strong ref={ref}>
      {display.toLocaleString('en-US')}
      {suffix}
    </strong>
  );
}

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
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.al-reveal'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!location.hash) return undefined;
    setMobileMenuOpen(false);
    const timer = window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="al-page">
      <header className="al-topbar" aria-label="About page navigation">
        <div className="al-shell al-topbar__inner">
          <Link className="al-logo" to="/" aria-label="Sell Your Brick">
            <span>SELL YOUR</span>
            <strong>BRICK</strong>
          </Link>

          <nav className="al-nav" aria-label="Page sections">
            {navItems.map((item) => (
              <a key={item.label} href={item.to}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="al-topbar__actions">
            <Link className="al-auth al-auth--login" to="/profile">
              Log in
            </Link>
            <Link className="al-auth al-auth--register" to={CO_INVESTMENT_PATH}>
              Start
            </Link>
          </div>

          <button
            className="al-mobile-menu"
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="about-mobile-menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <HiXMark aria-hidden /> : <HiBars3 aria-hidden />}
          </button>
        </div>

        <div
          id="about-mobile-menu"
          className={`al-mobile-panel${mobileMenuOpen ? ' is-open' : ''}`}
          hidden={!mobileMenuOpen}
        >
          <div className="al-shell">
            {navItems.map((item) => (
              <a key={item.label} href={item.to} onClick={() => setMobileMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <div className="al-mobile-panel__actions">
              <Link className="al-auth al-auth--login" to="/profile" onClick={() => setMobileMenuOpen(false)}>
                Log in
              </Link>
              <Link className="al-auth al-auth--register" to={CO_INVESTMENT_PATH} onClick={() => setMobileMenuOpen(false)}>
                Start
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="al-hero" id="overview" aria-labelledby="about-hero-title">
          <div className="al-shell al-hero__grid">
            <Reveal className="al-hero__copy">
              <div className="al-hero__title-row">
                <h1 id="about-hero-title">Corporate Overview</h1>
                <span className="al-pill">Company</span>
              </div>
              <div className="al-hero__subcopy">
                <h2>Global Reach</h2>
                <p>Our expertise allows us to streamline operations and unlock new opportunities.</p>
              </div>
            </Reveal>

            <Reveal className="al-hero__visual" delay={120}>
              <img src={ASSETS.hero} alt="Modern residential tower with soft green foreground leaves" />
              <ArrowBadge className="al-hero__arrow" />
            </Reveal>
          </div>
        </section>

        <section className="al-analytics" id="analytics" aria-labelledby="analytics-title">
          <div className="al-shell al-analytics__grid">
            <Reveal className="al-analytics__intro">
              <p>Our approach combines strategic thinking with modern tools to deliver impactful results.</p>
              <ArrowBadge />
              <h2 id="analytics-title">Smart Analytics</h2>
            </Reveal>

            <Reveal className="al-analytics__cards" delay={90}>
              {analyticsCards.map((card) => (
                <article className="al-analytics-card" key={card.label}>
                  <img src={card.image} alt="" aria-hidden />
                  <div>
                    <span>{card.label}</span>
                    <small>{card.eyebrow}</small>
                    <strong>{card.value}</strong>
                  </div>
                </article>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="al-partner" aria-labelledby="partner-title">
          <div className="al-shell al-partner__stage">
            <img className="al-partner__plant" src={ASSETS.botanical} alt="" aria-hidden />
            <Reveal className="al-partner-card">
              <div className="al-partner-card__top">
                <h2 id="partner-title">Trusted Partner</h2>
                <p>Collaborating with partners to create measurable outcomes.</p>
              </div>
              <img src={ASSETS.analyticsTeam} alt="Strategy team portrait" />
              <div className="al-partner-card__main">
                <ArrowBadge />
                <div>
                  <h3>Enterprise Overview</h3>
                  <p>Empowering businesses with modern technology.</p>
                </div>
              </div>
            </Reveal>
            <div className="al-partner__notes" aria-label="Operating highlights">
              <span>Smart Systems</span>
              <strong>The Overview</strong>
              <span>Business Insights</span>
              <span>24/7 Support</span>
              <strong>Secure Systems</strong>
            </div>
          </div>
        </section>

        <section className="al-scale" id="scale" aria-labelledby="scale-title">
          <div className="al-shell al-scale__grid">
            <Reveal className="al-scale__image-card">
              <img src={ASSETS.meeting} alt="Business team reviewing enterprise strategy" />
              <div className="al-scale__overlay">
                <h2>Enterprise Overview</h2>
                <strong>2.5x</strong>
                <p>Empowering businesses with modern technology.</p>
              </div>
            </Reveal>

            <Reveal className="al-scale__copy" delay={120}>
              <p className="al-section-note">
                We are a forward-thinking company focused on delivering scalable, efficient, and impactful solutions
                across industries by integrating
              </p>
              <span className="al-code">09-02</span>
              <div className="al-capabilities">
                <HiArrowUpRight aria-hidden />
                <ul aria-labelledby="scale-title">
                  {capabilities.map((item) => (
                    <li key={item.label} id={item.active ? 'scale-title' : undefined} className={item.active ? 'is-active' : undefined}>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="al-metrics" aria-labelledby="metrics-title">
          <div className="al-shell">
            <Reveal className="al-metrics__intro">
              <h2 id="metrics-title">Driving Innovation Through Scalable Solutions</h2>
              <p>
                We are a forward-thinking company focused on delivering scalable, efficient, and impactful solutions
                across industries by integrating strategy, design, and advanced technology into a unified ecosystem
                that drives measurable growth and long-term value.
              </p>
            </Reveal>

            <div className="al-metrics__grid">
              {metricCards.map((metric, index) => (
                <Reveal as="article" className="al-metric-card" delay={index * 90} key={metric.value}>
                  <div className="al-metric-card__value">
                    <AnimatedNumber value={metric.value} suffix={metric.suffix} />
                    <ArrowBadge />
                  </div>
                  <p>{metric.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="al-systems" id="systems" aria-labelledby="systems-title">
          <div className="al-shell al-systems__grid">
            <Reveal className="al-systems__copy">
              {systemNotes.map((note) => (
                <article key={note.title}>
                  <h2 id={note.title === 'Smart System' ? 'systems-title' : undefined}>{note.title}</h2>
                  <p>{note.text}</p>
                </article>
              ))}
              <div className="al-system-tags">
                <span>Company</span>
                <span>Updated 2026</span>
              </div>
            </Reveal>

            <Reveal className="al-system-visual" delay={120}>
              <img src={ASSETS.blueLoop} alt="" aria-hidden />
              <article className="al-system-card">
                <h2>User-centered Design</h2>
                <p>Our approach combines strategic thinking with modern tools to deliver impactful results.</p>
                <div className="al-system-card__footer">
                  <ArrowBadge />
                  <span>09-02</span>
                </div>
              </article>
            </Reveal>
          </div>
        </section>

        <section className="al-cta" id="contacts" aria-labelledby="cta-title">
          <div className="al-shell al-cta__inner">
            <Reveal className="al-cta__copy">
              <span className="al-pill al-pill--dark">Corporate systems</span>
              <h2 id="cta-title">Build a smarter property investment workflow.</h2>
              <p>Connect analytics, operational discipline, and scalable acquisition tools inside one modern platform.</p>
            </Reveal>
            <Reveal className="al-cta__actions" delay={90}>
              <Link className="al-primary-link" to={CO_INVESTMENT_PATH}>
                Start investing
                <HiArrowUpRight aria-hidden />
              </Link>
              <Link className="al-secondary-link" to="/seller">
                For sellers
              </Link>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}
