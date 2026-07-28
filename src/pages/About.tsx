'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiArrowUpRight } from 'react-icons/hi2';
import Header from '@/components/Header';
import { publicAsset } from '@/utils/publicAsset';
import { scrollMainTo } from '@/utils/mainScroll';
import './about-luxury.css';

const ASSETS = {
  hero: publicAsset('images/sellyourbrick/about-corporate/overview-hero-building.png'),
  analyticsTeam: publicAsset('images/sellyourbrick/about-corporate/analytics-team.png'),
  botanical: publicAsset('images/sellyourbrick/about-corporate/botanical-leaves.png'),
  meeting: publicAsset('images/sellyourbrick/about-corporate/enterprise-meeting.png'),
  blueLoop: publicAsset('images/sellyourbrick/about-corporate/blue-glass-loop.png'),
};

const analyticsCards = [
  {
    label: 'Всего инвестировано',
    eyebrow: 'капитал',
    value: '€41.5млн',
  },
  {
    label: 'Возвращено инвесторам',
    eyebrow: 'выплаты',
    value: '€24млн',
  },
];

const capabilities = [
  { label: 'Анализ и отбор объектов', active: true },
  { label: 'Инвестирование онлайн' },
  { label: 'Управление и доход' },
];

const metricCards = [
  {
    value: 131,
    suffix: '',
    label: 'Профинансированные проекты',
    text: 'Профинансированные проекты — реальные сделки и объекты, каждый проверен и одобрен до публикации на платформе.',
  },
  {
    value: 46,
    suffix: '',
    label: 'Завершённые выходы',
    text: 'Завершённые выходы — проекты полностью закрыты, капитал возвращён, прибыль распределена инвесторам.',
  },
];

const systemNotes = [
  {
    title: 'Актив в реестре',
    text: 'Каждая позиция привязана к конкретному объекту с юридическим титулом — не к обещанию в презентации.',
  },
  {
    title: 'Проверка до сделки',
    text: 'Due diligence, оценка и стресс-сценарии — до того, как проект появится у инвесторов.',
  },
];

const systemHighlights = [
  { label: 'Объект в реестре', detail: 'Юридический титул, а не презентация' },
  { label: 'Банковские выписки', detail: 'Возврат капитала подтверждается документами' },
  { label: 'Открытые риски', detail: 'Задержки публикуем так же, как успехи' },
];

const partnerNotes = [
  'Лицензированная компания',
  'SellYourBrick',
  'Прозрачная отчётность',
  'Защита капитала',
  'Проверенные объекты',
];

function ArrowBadge({ className = '', label = 'Подробнее' }: { className?: string; label?: string }) {
  return (
    <span
      className={`al-arrow-badge ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label || undefined}
    >
      <HiArrowUpRight aria-hidden strokeWidth={3} />
    </span>
  );
}

function CapabilitiesMenu() {
  const [activeIndex, setActiveIndex] = useState(
    Math.max(
      0,
      capabilities.findIndex((item) => item.active),
    ),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const arrowRef = useRef<HTMLButtonElement>(null);
  const [arrowOffset, setArrowOffset] = useState(0);

  const syncArrow = () => {
    const root = rootRef.current;
    const item = itemRefs.current[activeIndex];
    const arrow = arrowRef.current;
    if (!root || !item || !arrow) return;

    const rootTop = root.getBoundingClientRect().top;
    const itemBox = item.getBoundingClientRect();
    const arrowHeight = arrow.offsetHeight;
    setArrowOffset(itemBox.top - rootTop + (itemBox.height - arrowHeight) / 2);
  };

  useEffect(() => {
    syncArrow();

    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => syncArrow());
    observer.observe(root);
    itemRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, [activeIndex]);

  const selectNext = () => {
    setActiveIndex((current) => (current + 1) % capabilities.length);
  };

  return (
    <div
      className="al-capabilities"
      ref={rootRef}
      style={{ '--al-cap-arrow-y': `${arrowOffset}px` } as CSSProperties}
    >
      <button
        ref={arrowRef}
        type="button"
        className="al-capabilities__arrow"
        onClick={selectNext}
        aria-label="Следующий шаг процесса"
      >
        <HiArrowUpRight aria-hidden strokeWidth={2.6} />
      </button>
      <ul aria-labelledby="scale-title">
        {capabilities.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <li
              key={item.label}
              className={isActive ? 'is-active' : undefined}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
            >
              <button
                type="button"
                className="al-capabilities__item"
                aria-current={isActive ? 'step' : undefined}
                onClick={() => setActiveIndex(index)}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
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
      {display.toLocaleString('ru-RU')}
      {suffix}
    </strong>
  );
}

export default function About() {
  const location = useLocation();

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
    const timer = window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="al-page">
      <Header />

      <main>
        <section className="al-hero" id="about-intro" aria-labelledby="about-hero-title">
          <div className="al-shell al-hero__grid">
            <Reveal className="al-hero__visual" delay={0}>
              <img src={ASSETS.hero} alt="Современный жилой комплекс SellYourBrick" />
              <div className="al-hero__shade" aria-hidden />
              <ArrowBadge className="al-hero__arrow" />
            </Reveal>

            <Reveal className="al-hero__copy" delay={80}>
              <div className="al-hero__title-row">
                <p className="al-hero__eyebrow">О платформе</p>
                <h1 id="about-hero-title">
                  <span className="al-hero__brand">
                    <span>Sell</span>
                    <span className="al-hero__brand-accent">Your</span>
                    <span>Brick</span>
                  </span>
                </h1>
                <span className="al-pill al-hero__pill">Инвестиции</span>
              </div>
              <div className="al-hero__subcopy">
                <h2>Недвижимость без лишних барьеров</h2>
                <p>
                  Открываем доступ к премиальной недвижимости и сопровождаем сделку с прозрачными
                  условиями на каждом этапе.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="al-analytics" id="analytics" aria-labelledby="analytics-title">
          <div className="al-shell al-analytics__grid">
            <Reveal className="al-analytics__intro">
              <p>
                Мы работаем на рынке Испании и объединяем экспертизу в недвижимости, современные
                технологии и глубокое понимание локального рынка.
              </p>
              <ArrowBadge />
              <h2 id="analytics-title">Реальные цифры</h2>
            </Reveal>

            <Reveal className="al-analytics__cards" delay={90}>
              {analyticsCards.map((card) => (
                <article className="al-analytics-card" key={card.label}>
                  <ArrowBadge className="al-analytics-card__mark" label="" />
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
                <h2 id="partner-title">Надёжный партнёр</h2>
                <p>
                  Каждый инвестор входит в сделки с ясностью, а мы сопровождаем процесс от первого
                  шага до подписания документов.
                </p>
              </div>
              <img src={ASSETS.analyticsTeam} alt="Команда экспертов SellYourBrick" />
              <div className="al-partner-card__main">
                <ArrowBadge />
                <div>
                  <h3>SellYourBrick</h3>
                  <p>
                    Доступ к лучшим объектам, профессиональный анализ, прозрачная отчётность и
                    полное сопровождение на каждом этапе.
                  </p>
                </div>
              </div>
            </Reveal>
            <div className="al-partner__notes" aria-label="Гарантии платформы">
              {partnerNotes.map((note, index) => (
                <span
                  key={note}
                  className={index === 1 ? 'al-partner__notes-item is-accent' : 'al-partner__notes-item'}
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="al-scale" id="scale" aria-labelledby="scale-title">
          <div className="al-shell al-scale__grid">
            <Reveal className="al-scale__image-card">
              <img src={ASSETS.meeting} alt="Команда SellYourBrick на стратегической сессии" />
              <div className="al-scale__overlay">
                <h2 id="scale-title">Как это работает</h2>
                <strong>12–18%</strong>
                <p>Средняя годовая доходность по проектам платформы.</p>
              </div>
            </Reveal>

            <Reveal className="al-scale__copy" delay={120}>
              <p className="al-section-note">
                Простой процесс — надёжный результат: от анализа и отбора объектов до управления
                активом и регулярных выплат инвесторам.
              </p>
              <span className="al-code">6–18 мес.</span>
              <CapabilitiesMenu />
            </Reveal>
          </div>
        </section>

        <section className="al-metrics" aria-labelledby="metrics-title">
          <div className="al-shell">
            <Reveal className="al-metrics__intro">
              <h2 id="metrics-title">
                Мы не просто говорим о доходности.
                <span className="al-metrics__title-tail"> Мы её обеспечиваем.</span>
              </h2>
              <p>
                41 миллион евро в работе, 35 тысяч доверяющих инвесторов и десятки успешно
                завершённых проектов — цифры, которые подтверждаются банковскими выписками, а не
                презентациями.
              </p>
            </Reveal>

            <div className="al-metrics__grid">
              {metricCards.map((metric, index) => (
                <Reveal as="article" className="al-metric-card" delay={index * 90} key={metric.text}>
                  <div className="al-metric-card__value">
                    <AnimatedNumber value={metric.value} suffix={metric.suffix} />
                    <ArrowBadge />
                  </div>
                  <p>{metric.text}</p>
                </Reveal>
              ))}
            </div>

            <Reveal className="al-metrics__mobile" delay={90}>
              {metricCards.map((metric) => (
                <div className="al-metrics__mobile-item" key={metric.label}>
                  <div className="al-metrics__mobile-item__top">
                    <AnimatedNumber value={metric.value} suffix={metric.suffix} />
                    <ArrowBadge className="al-metrics__mobile-mark" label="" />
                  </div>
                  <p>{metric.text}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="al-systems" id="systems" aria-labelledby="systems-title">
          <div className="al-shell al-systems__grid">
            <Reveal className="al-systems__copy">
              {systemNotes.map((note) => (
                <article key={note.title}>
                  <h2 id={note.title === 'Актив в реестре' ? 'systems-title' : undefined}>{note.title}</h2>
                  <p>{note.text}</p>
                </article>
              ))}
              <div className="al-system-tags al-system-tags--desktop">
                <span>Испания · реестр</span>
                <span>SellYourBrick</span>
              </div>
            </Reveal>

            <div className="al-system-tags al-system-tags--mobile" aria-label="Метки платформы">
              <span>Испания · реестр</span>
              <span>SellYourBrick</span>
            </div>

            <Reveal className="al-system-visual" delay={120}>
              <img src={ASSETS.blueLoop} alt="" aria-hidden />
              <article className="al-system-card">
                <div className="al-system-card__head">
                  <h2>
                    Инвестируйте в
                    <br />
                    кирпичи, а не в
                    <br />
                    обещания
                  </h2>
                  <p>
                    Возврат капитала подтверждается банковскими выписками. Задержки и риски публикуем
                    так же открыто, как успехи.
                  </p>
                </div>
                <ul className="al-system-card__points">
                  {systemHighlights.map((item) => (
                    <li key={item.label}>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </li>
                  ))}
                </ul>
                <div className="al-system-card__footer">
                  <span>LTV 61.5%</span>
                </div>
                <ArrowBadge className="al-system-card__arrow" />
              </article>
            </Reveal>
          </div>
        </section>

        <section className="al-cta" id="contacts" aria-labelledby="cta-title">
          <div className="al-shell al-cta__inner">
            <Reveal className="al-cta__copy">
              <span className="al-pill al-pill--dark">Следующий шаг</span>
              <h2 id="cta-title">
                <span className="al-cta__title-lead">
                  Покупка или<span className="al-cta__title-mobile-break"><br /></span> продажа —
                </span>
                <br />
                <span className="al-cta__title-tail">на одной платформе</span>
              </h2>
              <p>
                Выберите раздел под вашу задачу. Регистрация бесплатна — сопровождаем сделку от
                первого шага до оформления документов.
              </p>
            </Reveal>
            <Reveal className="al-cta__actions" delay={90}>
              <Link className="al-primary-link" to="/buyer">
                Искать недвижимость
                <HiArrowUpRight aria-hidden />
              </Link>
              <Link className="al-secondary-link" to="/seller">
                Разместить объект
              </Link>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}
