import {
  RiArrowUpLine,
  RiBuilding2Line,
  RiHandCoinLine,
  RiLineChartLine,
  RiNotification3Line,
  RiVipCrownLine,
} from 'react-icons/ri'
import './VipClubHeroScene.css'

const PROPERTY_IMAGE = '/images/vip-club/vip-cta-villa.png'

const dealAvatars = [
  '/images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg',
  '/images/external/photo-1494790108377-be9c29b29330-89f0c4a88f.jpg',
  '/images/external/photo-1507003211169-0a1dd7228f2d-94d7ce3808.jpg',
]

function MiniLineChart({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 120 36" fill="none" aria-hidden="true">
      <path
        d="M4 28 L24 22 L44 24 L64 14 L84 16 L104 8 L116 4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="116" cy="4" r="3" fill="currentColor" />
    </svg>
  )
}

function MiniBarChart({ className = '' }) {
  const bars = [18, 26, 22, 34, 28, 40]
  return (
    <svg className={className} viewBox="0 0 120 40" fill="none" aria-hidden="true">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={8 + i * 18}
          y={40 - h}
          width="10"
          height={h}
          rx="2"
          fill={i === bars.length - 1 ? 'currentColor' : 'rgba(0, 153, 169, 0.22)'}
        />
      ))}
    </svg>
  )
}

export default function VipClubHeroScene() {
  return (
    <div className="vip-club-hero-scene" aria-hidden="true">
      <article className="vip-club-hero-float vip-club-hero-float--objects">
        <span className="vip-club-hero-float__icon">
          <RiBuilding2Line />
        </span>
        <div>
          <span className="vip-club-hero-float__label">Объекты</span>
          <strong className="vip-club-hero-float__value">200+</strong>
        </div>
        <div className="vip-club-hero-float__bar">
          <span style={{ width: '68%' }} />
        </div>
        <span className="vip-club-hero-float__meta">68% закрытых лотов</span>
      </article>

      <article className="vip-club-hero-float vip-club-hero-float--income">
        <span className="vip-club-hero-float__icon">
          <RiHandCoinLine />
        </span>
        <div>
          <span className="vip-club-hero-float__label">Доход</span>
          <strong className="vip-club-hero-float__value">$560</strong>
        </div>
        <span className="vip-club-hero-float__delta">
          <RiArrowUpLine /> +18,7%
        </span>
      </article>

      <article className="vip-club-hero-float vip-club-hero-float--return">
        <span className="vip-club-hero-float__icon">
          <RiLineChartLine />
        </span>
        <strong className="vip-club-hero-float__value">12,4%</strong>
        <span className="vip-club-hero-float__label">доходность YTD</span>
        <MiniBarChart className="vip-club-hero-float__chart" />
      </article>

      <article className="vip-club-hero-float vip-club-hero-float--deals">
        <span className="vip-club-hero-float__icon">
          <RiVipCrownLine />
        </span>
        <div>
          <span className="vip-club-hero-float__label">Сделки</span>
          <strong className="vip-club-hero-float__value">95%</strong>
        </div>
        <span className="vip-club-hero-float__meta">успешных закрытий</span>
        <div className="vip-club-hero-float__avatars">
          {dealAvatars.map((src) => (
            <img key={src} src={src} alt="" />
          ))}
          <span>+127</span>
        </div>
      </article>

      <div className="vip-club-hero-phone">
        <div className="vip-club-hero-phone__shell">
          <div className="vip-club-hero-phone__island" />
          <div className="vip-club-hero-phone__screen">
            <header className="vip-club-hero-phone__header">
              <RiVipCrownLine aria-hidden />
              <span>VIP Club</span>
              <RiNotification3Line aria-hidden />
            </header>

            <div className="vip-club-hero-phone__property">
              <img src={PROPERTY_IMAGE} alt="" />
              <span className="vip-club-hero-phone__tag">Закрытый лот</span>
              <div className="vip-club-hero-phone__property-copy">
                <strong>Villa Azure</strong>
                <span>Costa del Sol, Spain</span>
              </div>
            </div>

            <div className="vip-club-hero-phone__portfolio">
              <span className="vip-club-hero-phone__portfolio-label">Портфель VIP</span>
              <div className="vip-club-hero-phone__portfolio-row">
                <strong>$2,4M</strong>
                <span>+12,4%</span>
              </div>
              <MiniLineChart className="vip-club-hero-phone__chart" />
            </div>

            <nav className="vip-club-hero-phone__nav">
              <span className="is-active">Обзор</span>
              <span>Портфель</span>
              <span>Сделки</span>
              <span>Профиль</span>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}
