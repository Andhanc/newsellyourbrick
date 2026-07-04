'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import {
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import {
  PiBank,
  PiCalendar,
  PiChartBar,
  PiChartLineUp,
  PiGavel,
  PiHandshake,
  PiHouseLine,
  PiMedal,
  PiShieldCheck,
  PiUserCircleGear,
  PiWallet,
} from 'react-icons/pi';
import Header from '@/components/Header';
import { useAnimatedCounter } from '@/components/about/hooks/useAnimatedCounter';
import { useInView } from '@/hooks/useInView';
import { publicAsset } from '@/utils/publicAsset';
import { getMainScrollEl, scrollMainElementIntoView, scrollMainTo } from '@/utils/mainScroll';
import './about-luxury.css';

const ASSETS = {
  hero: publicAsset('images/sellyourbrick/about/about-hero-spain.jpg'),
  platformBack: publicAsset('images/sellyourbrick/about/about-hero-villa.jpg'),
  platformFront: publicAsset('images/sellyourbrick/about/mission-villa.jpg'),
  cta: publicAsset('images/sellyourbrick/about/dubai-cta-ref.jpg'),
  resultFunded: publicAsset('images/sellyourbrick/about/about-result-funded.jpg'),
  resultInvested: publicAsset('images/sellyourbrick/about/about-result-invested.jpg'),
  resultExits: publicAsset('images/sellyourbrick/about/about-result-exits.jpg'),
  resultPayout: publicAsset('images/sellyourbrick/about/about-result-payout.jpg'),
  resultProjectSize: publicAsset('images/sellyourbrick/about/about-result-project-size.jpg'),
  resultLtv: publicAsset('images/sellyourbrick/about/about-result-ltv.jpg'),
  manifestoBricks: publicAsset('images/sellyourbrick/about/about-manifesto-bricks.jpg'),
};

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
  'Полное сопровождение на каждом этапе',
];

const auctionTimeline = [
  {
    icon: PiShieldCheck,
    title: 'Проверка',
    duration: '15 дней',
    text: 'Юридическая и техническая экспертиза объекта до публикации на платформе.',
  },
  {
    icon: PiCalendar,
    title: 'Публикация',
    duration: 'Старт',
    text: 'Лот выходит с прозрачными условиями, стартовой и минимальной ценой.',
  },
  {
    icon: PiGavel,
    title: 'Торги',
    duration: '3 месяца',
    text: 'Открытые ставки, таймер и полная история — без скрытых переговоров.',
  },
  {
    icon: PiHandshake,
    title: 'Победа',
    duration: 'Финал',
    text: 'Резерв 10% от выигрышной ставки и сопровождение до оформления сделки.',
  },
] as const;

const joinPaths = [
  {
    tone: 'buyer',
    icon: PiHandshake,
    kicker: 'Покупка',
    title: 'Найдите объект ниже рынка',
    text: 'Аукционы от 3 месяцев, прозрачные ставки и сопровождение менеджера до сделки.',
    perks: ['Аукцион и Buy Now', 'Депозит €3 000', 'Проверенные лоты'],
    to: '/buyer',
    cta: 'Искать недвижимость',
  },
  {
    tone: 'seller',
    icon: PiHouseLine,
    kicker: 'Продажа',
    title: 'Продайте по реальному спросу',
    text: '15 дней проверки объекта, затем открытые торги минимум 3 месяца — без скрытых переговоров.',
    perks: ['Проверка за 15 дней', 'Минимум 3 месяца торгов', 'Честная рыночная цена'],
    to: '/seller',
    cta: 'Разместить объект',
  },
] as const;

const joinTrust = [
  'Проверенные объекты',
  'Прозрачная отчётность',
  'Защита капитала',
] as const;

function PlatformVisual({ backSrc, frontSrc }: { backSrc: string; frontSrc: string }) {
  const visualRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const scrollRoot = getMainScrollEl();
    const visual = visualRef.current;
    const front = frontRef.current;
    if (!scrollRoot || !visual || !front || reduceMotion) return;

    const update = () => {
      const rootRect = scrollRoot.getBoundingClientRect();
      const rect = visual.getBoundingClientRect();
      const viewportH = rootRect.height;
      const traveled = viewportH * 0.82 - (rect.top - rootRect.top);
      const span = viewportH * 0.72 + rect.height * 0.45;
      const progress = Math.min(1, Math.max(0, traveled / span));
      const y = 18 - progress * 96;
      front.style.transform = `translate3d(0, ${y}px, 0)`;
    };

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    schedule();
    scrollRoot.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      scrollRoot.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
      front.style.transform = '';
    };
  }, [reduceMotion]);

  return (
    <div ref={visualRef} className="al-platform__visual" aria-hidden>
      <figure className="al-platform__photo al-platform__photo--back">
        <img src={backSrc} alt="" />
      </figure>
      <figure ref={frontRef} className="al-platform__photo al-platform__photo--front">
        <img src={frontSrc} alt="" />
      </figure>
    </div>
  );
}

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

function ProcessSteps({
  reduceMotion,
  onComplete,
}: {
  reduceMotion: boolean | null;
  onComplete?: () => void;
}) {
  const [shellRef, isInView] = useInView({
    rootMargin: '120px 0px',
    threshold: 0.1,
    once: true,
    useMainScrollRoot: true,
  });
  const [activeCount, setActiveCount] = useState(0);
  const [rail, setRail] = useState<{ top: number; left: number; width: number } | null>(null);
  const hasStartedRef = useRef(false);
  const completeRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const fireComplete = useCallback(() => {
    if (completeRef.current) return;
    completeRef.current = true;
    onComplete?.();
  }, [onComplete]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const updateRail = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const icons = shell.querySelectorAll<HTMLElement>('.al-step__icon');
    if (icons.length < 2) return;

    const shellRect = shell.getBoundingClientRect();
    const first = icons[0].getBoundingClientRect();
    const last = icons[icons.length - 1].getBoundingClientRect();

    setRail({
      top: first.top - shellRect.top + first.height / 2,
      left: first.left - shellRect.left + first.width / 2,
      width: last.left - first.left,
    });
  }, [shellRef]);

  const runStepSequence = useCallback(() => {
    clearTimers();
    setActiveCount(0);

    let step = 0;
    const revealNext = () => {
      step += 1;
      setActiveCount(step);
      if (step < processSteps.length) {
        timersRef.current.push(window.setTimeout(revealNext, 580));
      }
    };

    timersRef.current.push(window.setTimeout(revealNext, 180));
  }, [clearTimers]);

  useEffect(() => {
    if (!isInView || reduceMotion === null) return;

    if (reduceMotion) {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        clearTimers();
        setActiveCount(processSteps.length);
        fireComplete();
      }
      return;
    }

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const start = () => {
      updateRail();
      runStepSequence();
    };

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(start);
    });

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [isInView, reduceMotion, fireComplete, clearTimers, runStepSequence, updateRail]);

  useEffect(() => {
    if (activeCount !== processSteps.length) return;
    const timer = window.setTimeout(fireComplete, 580);
    return () => window.clearTimeout(timer);
  }, [activeCount, fireComplete]);

  useEffect(() => {
    updateRail();

    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateRail);
      return () => window.removeEventListener('resize', updateRail);
    }

    const observer = new ResizeObserver(() => updateRail());
    observer.observe(shell);
    window.addEventListener('resize', updateRail);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRail);
    };
  }, [shellRef, updateRail, activeCount]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const fillPercent =
    activeCount <= 1 ? 0 : ((activeCount - 1) / (processSteps.length - 1)) * 100;

  return (
    <div
      ref={shellRef}
      className={`al-steps-shell${activeCount > 0 ? ' is-started' : ''}`}
      data-active={activeCount}
    >
      <div
        className="al-steps__progress"
        aria-hidden
        style={
          rail
            ? {
                top: rail.top,
                left: rail.left,
                width: rail.width,
              }
            : undefined
        }
      >
        <span className="al-steps__progress-track" />
        <span className="al-steps__progress-fill" style={{ width: `${fillPercent}%` }} />
      </div>

      <div className="al-steps">
        {processSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index < activeCount;

          return (
            <article className={`al-step${isActive ? ' is-active' : ''}`} key={step.title}>
              <div className="al-step__head">
                <span className="al-step__number">{String(index + 1).padStart(2, '0')}</span>
                <div className="al-step__icon-wrap">
                  <span className="al-step__icon">
                    <Icon aria-hidden />
                  </span>
                </div>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const processMetrics = [
  {
    tone: 'term',
    icon: PiCalendar,
    min: 6,
    max: 18,
    suffix: ' мес.',
    label: 'средний срок инвестиций',
  },
  {
    tone: 'yield',
    icon: PiChartLineUp,
    min: 12,
    max: 18,
    suffix: '%',
    label: 'средняя годовая доходность',
  },
  {
    tone: 'growth',
    icon: PiChartBar,
    min: 40,
    max: null as number | null,
    suffix: '%+',
    label: 'потенциал роста',
  },
];

function ProcessMetricItem({
  metric,
  enabled,
  delay,
  reduceMotion,
}: {
  metric: (typeof processMetrics)[number];
  enabled: boolean;
  delay: number;
  reduceMotion: boolean | null;
}) {
  const [localEnabled, setLocalEnabled] = useState(false);
  const Icon = metric.icon;
  const minTarget = metric.min;
  const maxTarget = metric.max ?? metric.min;

  useEffect(() => {
    if (!enabled) {
      setLocalEnabled(false);
      return;
    }

    if (reduceMotion) {
      setLocalEnabled(true);
      return;
    }

    const timer = window.setTimeout(() => setLocalEnabled(true), delay);
    return () => window.clearTimeout(timer);
  }, [enabled, delay, reduceMotion]);

  const minValue = useAnimatedCounter(minTarget, localEnabled && !reduceMotion, { duration: 1300 });
  const maxValue = useAnimatedCounter(maxTarget, localEnabled && !reduceMotion, { duration: 1300 });

  const finalDisplay =
    metric.max != null
      ? `${metric.min}–${metric.max}${metric.suffix}`
      : `${metric.min}${metric.suffix}`;

  const animatedDisplay =
    metric.max != null
      ? `${Math.round(minValue)}–${Math.round(maxValue)}${metric.suffix}`
      : `${Math.round(minValue)}${metric.suffix}`;

  const display = !localEnabled ? '' : reduceMotion ? finalDisplay : animatedDisplay;

  return (
    <article
      className={`al-process-metric al-process-metric--${metric.tone}${localEnabled ? ' is-counting' : ' is-pending'}`}
    >
      <span className="al-process-metric__icon">
        <Icon aria-hidden size={22} />
      </span>
      <div className="al-process-metric__body">
        <strong className="al-process-metric__value" aria-live="polite">
          {display}
        </strong>
        <span className={`al-process-metric__label${localEnabled ? ' is-visible' : ''}`}>
          {metric.label}
        </span>
      </div>
    </article>
  );
}

function ProcessMetricsPanel({
  ready,
  reduceMotion,
}: {
  ready: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <aside
      className={`al-process-card${ready ? ' is-live' : ' is-waiting'}`}
      aria-label="Ожидаемые показатели"
    >
      <div className="al-process-card__glow" aria-hidden />
      <p className="al-process-card__eyebrow">Ожидаемые показатели</p>
      <div className="al-process-card__inner">
        {processMetrics.map((metric, index) => (
          <ProcessMetricItem
            key={metric.label}
            metric={metric}
            enabled={ready}
            delay={index * 140}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>
    </aside>
  );
}

function ResultsIntro({ reduceMotion }: { reduceMotion: boolean | null }) {
  const [ref, isInView] = useInView({ rootMargin: '60px', threshold: 0.15 });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (isInView) setRevealed(true);
  }, [isInView]);

  const isVisible = reduceMotion || revealed;

  return (
    <div ref={ref} className={`al-results__intro-grid${isVisible ? ' is-visible' : ''}`}>
      <div className="al-results__intro-main">
        <p className="al-kicker">Реальные цифры</p>
        <h2 id="results-title" className="al-results__headline">
          <span>Мы не просто говорим</span>
          <span>о доходности.</span>
          <span className="al-results__headline-accent">Мы её обеспечиваем.</span>
        </h2>
      </div>
    </div>
  );
}

const resultStats = [
  {
    tone: 'funded',
    icon: PiHandshake,
    image: ASSETS.resultFunded,
    imageAlt: 'Сделка по недвижимости на фоне испанской виллы',
    label: 'Профинансированные проекты',
    value: '131',
    text: 'Реальные сделки и реальные объекты. Каждый проверен, одобрен и доступен на платформе.',
  },
  {
    tone: 'invested',
    icon: FiBarChart2,
    image: ASSETS.resultInvested,
    imageAlt: 'Рост инвестированного капитала',
    label: 'Всего инвестировано',
    value: '€41.5',
    suffix: 'млн',
    text: '41 миллион евро в работе. Капитал, который инвесторы выбрали разместить у нас — и продолжают размещать.',
  },
  {
    tone: 'exits',
    icon: FiCheck,
    image: ASSETS.resultExits,
    imageAlt: 'Завершённый жилой проект на побережье Испании',
    label: 'Завершённые выходы',
    value: '46',
    text: '46 проектов полностью закрыты и выплачены. Капитал возвращён, прибыль распределена.',
  },
  {
    tone: 'payout',
    icon: PiWallet,
    image: ASSETS.resultPayout,
    imageAlt: 'Выплаты инвесторам',
    label: 'Возвращено инвесторам',
    value: '€24',
    suffix: 'млн',
    text: '€24 миллиона уже на ваших счетах. Деньги распределены — не обещание, а выписка из банка.',
  },
  {
    tone: 'project',
    icon: PiHouseLine,
    image: ASSETS.resultProjectSize,
    imageAlt: 'Средний проект — вилла среднего сегмента в Испании',
    label: 'Средний размер проекта',
    value: '€317',
    suffix: 'тыс.',
    text: 'Middle-market: достаточно крупный для серьёзной доходности и достаточно сфокусированный для точного управления.',
  },
  {
    tone: 'ltv',
    icon: FiShield,
    image: ASSETS.resultLtv,
    imageAlt: 'Защита капитала через залог недвижимости',
    label: 'Средний LTV',
    value: '61.5',
    suffix: '%',
    text: 'Вложения подкреплены недвижимостью стоимостью почти на 40% выше займа. Встроенная защита капитала.',
  },
];

function ResultStatCard({
  stat,
  index,
  reduceMotion,
}: {
  stat: (typeof resultStats)[number];
  index: number;
  reduceMotion: boolean | null;
}) {
  const [ref, isInView] = useInView({ rootMargin: '60px', threshold: 0.12 });
  const [revealed, setRevealed] = useState(false);
  const Icon = stat.icon;

  useEffect(() => {
    if (isInView) setRevealed(true);
  }, [isInView]);

  const isVisible = reduceMotion || revealed;

  return (
    <article
      ref={ref}
      className={`al-result-card al-result-card--${stat.tone}${isVisible ? ' is-visible' : ''}`}
      style={{ '--al-result-delay': `${index * 90}ms` } as CSSProperties}
    >
      <div className="al-result-card__media">
        <img src={stat.image} alt={stat.imageAlt} loading="lazy" />
        <div className="al-result-card__veil" aria-hidden />
        <span className="al-result-card__shine" aria-hidden />
        <span className="al-result-card__icon">
          <Icon aria-hidden />
        </span>
      </div>
      <div className="al-result-card__body">
        <p className="al-result-card__label">{stat.label}</p>
        <p className="al-result-card__value">
          <strong>{stat.value}</strong>
          {stat.suffix ? <span>{stat.suffix}</span> : null}
        </p>
        <p className="al-result-card__text">{stat.text}</p>
      </div>
    </article>
  );
}

const manifestoPrinciples = [
  {
    icon: PiHouseLine,
    title: 'Актив в реестре',
    text: 'Каждая позиция привязана к конкретному объекту с юридическим титулом — не к обещанию в презентации.',
  },
  {
    icon: PiShieldCheck,
    title: 'Проверка до сделки',
    text: 'Due diligence, оценка и стресс-сценарии — до того, как проект появится у инвесторов.',
  },
  {
    icon: PiChartLineUp,
    title: 'Отчётность без фильтров',
    text: 'Задержки и риски публикуем так же открыто, как успехи — прозрачность заслуживается делом.',
  },
  {
    icon: PiBank,
    title: 'Деньги со счёта',
    text: 'Возврат капитала подтверждается банковскими выписками, а не красивыми слайдами.',
  },
] as const;

function ManifestoPrinciple({
  item,
  index,
  reduceMotion,
}: {
  item: (typeof manifestoPrinciples)[number];
  index: number;
  reduceMotion: boolean | null;
}) {
  const [ref, isInView] = useInView({ rootMargin: '40px', threshold: 0.12 });
  const [revealed, setRevealed] = useState(false);
  const Icon = item.icon;

  useEffect(() => {
    if (isInView) setRevealed(true);
  }, [isInView]);

  const isVisible = reduceMotion || revealed;

  return (
    <li
      ref={ref}
      className={`al-manifesto-principle${isVisible ? ' is-visible' : ''}`}
      style={{ '--al-manifesto-delay': `${index * 80}ms` } as CSSProperties}
    >
      <span className="al-manifesto-principle__icon">
        <Icon aria-hidden size={28} />
      </span>
      <div>
        <strong>{item.title}</strong>
        <p>{item.text}</p>
      </div>
    </li>
  );
}

function AuctionTimelinePanel({ reduceMotion }: { reduceMotion: boolean | null }) {
  const [ref, isInView] = useInView({ rootMargin: '60px', threshold: 0.18 });
  const flowRef = useRef<HTMLOListElement>(null);
  const hasStartedRef = useRef(false);
  const [activeCount, setActiveCount] = useState(0);
  const [railHeight, setRailHeight] = useState(0);

  const updateRail = useCallback(() => {
    const flow = flowRef.current;
    if (!flow) return;

    const markers = flow.querySelectorAll<HTMLElement>('.al-auction-flow__marker');
    if (markers.length < 2 || activeCount < 2) {
      setRailHeight(0);
      return;
    }

    const flowRect = flow.getBoundingClientRect();
    const first = markers[0].getBoundingClientRect();
    const targetIndex = Math.min(activeCount - 1, markers.length - 1);
    const target = markers[targetIndex].getBoundingClientRect();
    const height = target.top - first.top + target.height / 2;

    setRailHeight(Math.max(0, height));
  }, [activeCount]);

  useEffect(() => {
    if (!isInView) return;

    if (reduceMotion) {
      setActiveCount(auctionTimeline.length);
      hasStartedRef.current = true;
      return;
    }

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const timers: number[] = [];
    let step = 0;

    const revealNext = () => {
      step += 1;
      setActiveCount(step);
      if (step < auctionTimeline.length) {
        timers.push(window.setTimeout(revealNext, 760));
      }
    };

    timers.push(window.setTimeout(revealNext, 220));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isInView, reduceMotion]);

  useEffect(() => {
    updateRail();

    const flow = flowRef.current;
    if (!flow || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateRail);
      return () => window.removeEventListener('resize', updateRail);
    }

    const observer = new ResizeObserver(() => updateRail());
    observer.observe(flow);
    window.addEventListener('resize', updateRail);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRail);
    };
  }, [activeCount, updateRail]);

  const isComplete = activeCount >= auctionTimeline.length;

  return (
    <div
      ref={ref}
      className={`al-auction-panel${activeCount > 0 ? ' is-started' : ''}${isComplete ? ' is-complete' : ''}`}
      aria-label="Как устроен аукцион"
    >
      <div className="al-auction-panel__intro">
        <p className="al-auction-panel__eyebrow">Этапы аукциона</p>
        <div className="al-auction-panel__duration" aria-hidden>
          <span className={activeCount >= 1 ? 'is-lit' : ''}>15 дней</span>
          <span className="al-auction-panel__duration-line">
            <span style={{ width: `${activeCount <= 1 ? 0 : Math.min(100, ((activeCount - 1) / 3) * 100)}%` }} />
          </span>
          <span className={activeCount >= 3 ? 'is-lit' : ''}>3 месяца</span>
        </div>
      </div>

      <ol className="al-auction-flow" ref={flowRef}>
        <span className="al-auction-flow__rail" aria-hidden>
          <span className="al-auction-flow__rail-fill" style={{ height: `${railHeight}px` }} />
        </span>

        {auctionTimeline.map((step, index) => {
          const Icon = step.icon;
          const isVisible = index < activeCount;
          const isCurrent = index === activeCount - 1;
          const isDone = index < activeCount - 1;

          return (
            <li
              className={`al-auction-flow__step${isVisible ? ' is-visible' : ''}${isCurrent ? ' is-current' : ''}${isDone ? ' is-done' : ''}`}
              key={step.title}
              style={{ '--al-auction-delay': `${index * 70}ms` } as CSSProperties}
            >
              <span className="al-auction-flow__index">{String(index + 1).padStart(2, '0')}</span>
              <span className="al-auction-flow__marker">
                <Icon aria-hidden />
              </span>
              <div className="al-auction-flow__body">
                <div className="al-auction-flow__head">
                  <strong>{step.title}</strong>
                  <span>{step.duration}</span>
                </div>
                <p>{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="al-auction-panel__footer">
        <span className="al-auction-panel__chip">
          <PiWallet aria-hidden />
          Депозит €3 000 для участия
        </span>
        <span className="al-auction-panel__chip">
          <FiCalendar aria-hidden />
          Напоминания по email и WhatsApp
        </span>
      </div>
    </div>
  );
}

function isPageReload() {
  if (typeof performance === 'undefined') return false;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === 'reload';
}

function scrollAboutToTop() {
  scrollMainTo(0, 0, 'instant');
}

export default function About() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [processMetricsReady, setProcessMetricsReady] = useState(false);

  useEffect(() => {
    setProcessMetricsReady(false);
  }, [location.key]);

  useEffect(() => {
    const previousRestoration = history.scrollRestoration;
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    scrollAboutToTop();
    const raf = requestAnimationFrame(scrollAboutToTop);
    const timers = [0, 50, 150, 350].map((delay) => window.setTimeout(scrollAboutToTop, delay));

    window.dispatchEvent(new Event('resetSection'));

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((timer) => window.clearTimeout(timer));
      if ('scrollRestoration' in history) {
        history.scrollRestoration = previousRestoration;
      }
    };
  }, []);

  useEffect(() => {
    if (!location.hash || isPageReload()) return;

    const timer = window.setTimeout(() => {
      const target = document.querySelector(location.hash);
      if (target instanceof HTMLElement) {
        scrollMainElementIntoView(target, { offset: 104, behavior: 'smooth' });
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="al-page">
      <Header />
      <main>
        <section className="al-hero" aria-labelledby="about-hero-title">
          <img className="al-hero__image" src={ASSETS.hero} alt="" aria-hidden />
          <div className="al-hero__veil" aria-hidden />
          <div className="al-shell al-hero__content">
            <div className="al-hero__copy">
              <h1 id="about-hero-title">
                <span className="al-hero__title-main">
                  Мы превращаем недвижимость Дубая в&nbsp;возможности
                </span>
                <span className="al-hero__title-accent">для каждого инвестора</span>
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
            <div className="al-platform__copy">
              <h2 id="platform-title">
                <span className="al-platform__title-line">SellYourBrick —</span>
                <span className="al-platform__title-line">недвижимость</span>
                <span className="al-platform__title-line">без лишних барьеров</span>
              </h2>
              <p className="al-platform__lead">
                Мы работаем на рынке Испании и объединяем экспертизу в недвижимости,
                современные технологии и глубокое понимание локального рынка, чтобы каждый
                инвестор мог входить в сделки с ясностью и получать максимальную выгоду.
              </p>

              <ul className="al-platform__benefits">
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

            <PlatformVisual backSrc={ASSETS.platformBack} frontSrc={ASSETS.platformFront} />
          </div>
        </section>

        <section className="al-process" id="process" aria-labelledby="process-title">
          <div className="al-shell al-process__grid">
            <div className="al-process__main">
              <p className="al-kicker">Как это работает</p>
              <h2 id="process-title">Простой процесс - надежный результат</h2>

              <ProcessSteps
                key={location.key}
                reduceMotion={reduceMotion}
                onComplete={() => setProcessMetricsReady(true)}
              />
            </div>

            <ProcessMetricsPanel ready={processMetricsReady} reduceMotion={reduceMotion} />
          </div>
        </section>

        <section className="al-results" id="results" aria-labelledby="results-title">
          <div className="al-shell al-results__intro">
            <ResultsIntro reduceMotion={reduceMotion} />
          </div>

          <div className="al-shell al-results__grid" aria-label="Ключевые показатели платформы">
            {resultStats.map((stat, index) => (
              <ResultStatCard
                key={stat.label}
                stat={stat}
                index={index}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </section>

        <section className="al-results-auction" aria-labelledby="auction-about-title">
          <div className="al-shell al-results-auction__grid">
            <div className="al-results-auction__copy">
              <p className="al-kicker">Аукцион</p>
              <h2 id="auction-about-title">Спрос определяет цену</h2>
              <p>
                На SellYourBrick аукцион — не гонка за секунды. Перед публикацией каждый объект
                проходит проверку до <strong>15 дней</strong>. Сами торги длятся минимум{' '}
                <strong>3 месяца</strong> — достаточно времени, чтобы покупатели изучили объект,
                сравнили условия и сделали осознанную ставку.
              </p>
              <p>
                Продавец видит реальный рыночный интерес, покупатель — честную динамику цены.
                Конкуренция работает на обе стороны сделки.
              </p>
              <Link className="al-results-auction__cta" to="/auction?filter=auction">
                Смотреть аукционы
                <FiArrowRight aria-hidden />
              </Link>
            </div>

            <AuctionTimelinePanel reduceMotion={reduceMotion} />
          </div>
        </section>

        <section className="al-results-manifesto" aria-labelledby="manifesto-title">
          <div className="al-shell al-results-manifesto__layout">
            <div className="al-results-manifesto__editorial">
              <p className="al-kicker">Наш принцип</p>
              <h2 id="manifesto-title" className="al-results-manifesto__headline">
                Инвестируйте в кирпичи,
                <span>а не в обещания</span>
              </h2>
              <p className="al-results-manifesto__lead">
                Мы в бизнесе недвижимости — значит, за каждой позицией стоит объект в реестре,
                а не слайд в презентации. Цифры выше уже показали масштаб. Здесь — как мы
                обеспечиваем доверие до первого евро.
              </p>

              <ul className="al-manifesto-principles" aria-label="Принципы платформы">
                {manifestoPrinciples.map((item, index) => (
                  <ManifestoPrinciple
                    key={item.title}
                    item={item}
                    index={index}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </ul>
            </div>

            <figure className="al-results-manifesto__figure">
              <img
                src={ASSETS.manifestoBricks}
                alt="Кирпичный фасад испанской недвижимости — твёрдый актив"
                loading="lazy"
              />
              <div className="al-results-manifesto__figure-veil" aria-hidden />
              <div className="al-results-manifesto__centerpiece" aria-hidden>
                <p className="al-results-manifesto__centerpiece-kicker">Испания · реестр</p>
                <p className="al-results-manifesto__centerpiece-title">
                  <span>Каждый кирпич</span>
                  <span className="is-accent">на своём месте</span>
                </p>
              </div>
              <blockquote className="al-results-manifesto__quote">
                <p>Меньше слов — больше результата.</p>
                <cite>SellYourBrick</cite>
              </blockquote>
            </figure>
          </div>
        </section>

        <section className="al-join" id="contacts" aria-labelledby="join-title">
          <img className="al-join__bg" src={ASSETS.cta} alt="" aria-hidden />
          <div className="al-join__veil" aria-hidden />

          <div className="al-shell al-join__inner">
            <div className="al-join__intro">
              <p className="al-kicker">Следующий шаг</p>
              <h2 id="join-title">Покупка или продажа — на одной платформе</h2>
              <p>
                Выберите раздел под вашу задачу. Регистрация бесплатна — сопровождаем сделку
                в Испании от первого шага до подписания документов.
              </p>
            </div>

            <div className="al-join__paths">
              {joinPaths.map((path) => {
                const Icon = path.icon;
                return (
                  <Link
                    key={path.tone}
                    className={`al-join-path al-join-path--${path.tone}`}
                    to={path.to}
                  >
                    <div className="al-join-path__head">
                      <span className="al-join-path__kicker">{path.kicker}</span>
                      <span className="al-join-path__icon">
                        <Icon aria-hidden />
                      </span>
                    </div>
                    <strong>{path.title}</strong>
                    <p>{path.text}</p>
                    <ul className="al-join-path__perks">
                      {path.perks.map((perk) => (
                        <li key={perk}>
                          <FiCheck aria-hidden />
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <span className="al-join-path__action">
                      {path.cta}
                      <FiArrowRight aria-hidden />
                    </span>
                  </Link>
                );
              })}
            </div>

            <ul className="al-join__trust" aria-label="Гарантии платформы">
              {joinTrust.map((item) => (
                <li key={item}>
                  <FiShield aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
