/** Кастомные иконки фич тарифов продавца — градиентные SVG в стиле премиум-прайсинга */

const ICON_GRADIENT = { a: '#64748b', b: '#1e293b' }

const TIER_RANK = {
  standard: 1,
  pro: 2,
  institutional: 3,
}

function IconPaths({ name }) {
  switch (name) {
    case 'listings':
      return (
        <>
          <path
            d="M5 20V9l7-4 7 4v11"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </>
      )
    case 'stats':
      return (
        <>
          <path d="M5 19V11M10 19V7M15 19V13M20 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="5" cy="11" r="1.5" fill="currentColor" />
          <circle cx="10" cy="7" r="1.5" fill="currentColor" />
          <circle cx="15" cy="13" r="1.5" fill="currentColor" />
          <circle cx="20" cy="5" r="1.5" fill="currentColor" />
        </>
      )
    case 'support':
      return (
        <>
          <path
            d="M5 14a7 7 0 0114 0v2.5a1.5 1.5 0 01-1.5 1.5H14l-3 3v-3H6.5A1.5 1.5 0 015 16.5V14z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9.5 12.5h.01M14.5 12.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )
    case 'promote':
      return (
        <>
          <path
            d="M5 15l14-6-6 14-2-5-6-3z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M13 9l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="7" cy="17" r="1.2" fill="currentColor" opacity="0.6" />
        </>
      )
    case 'unlimited':
      return (
        <>
          <path
            d="M6.5 12c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5-2.5 5.5-5.5 5.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M17.5 12c0 3-2.5 5.5-5.5 5.5S6.5 15 6.5 12"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      )
    case 'analytics':
      return (
        <>
          <path
            d="M4 18h16M7 16l3-5 3 3 4-7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="16" r="1.4" fill="currentColor" />
          <circle cx="10" cy="11" r="1.4" fill="currentColor" />
          <circle cx="13" cy="14" r="1.4" fill="currentColor" />
          <circle cx="17" cy="7" r="1.4" fill="currentColor" />
        </>
      )
    case 'boost':
      return (
        <>
          <path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z" fill="currentColor" opacity="0.9" />
          <path d="M19 14l.9 2.2L22 17l-2.1.8L19 20l-.9-2.2L16 17l2.1-.8L19 14z" fill="currentColor" opacity="0.55" />
        </>
      )
    case 'manager':
      return (
        <>
          <circle cx="12" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M5.5 19.5c.8-3 3.2-4.8 6.5-4.8s5.7 1.8 6.5 4.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M17.5 7.5l1.5 1.5 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
    case 'allPro':
      return (
        <>
          <path
            d="M12 4l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.2l5-.7L12 4z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12.5" r="2" fill="currentColor" opacity="0.35" />
        </>
      )
    case 'custom':
      return (
        <>
          <path
            d="M8 8h8v8H8z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            rx="1.5"
          />
          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
          <circle cx="17.5" cy="6.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M16.8 6.5h1.4M17.5 5.8v1.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </>
      )
    case 'concierge':
      return (
        <>
          <rect x="5" y="8" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9 8V6.5A3 3 0 0115 6.5V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8.5 13h7M8.5 16h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
        </>
      )
    default:
      return (
        <path d="M8 12.5l2.5 2.5L16.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )
  }
}

export function OwnerPlanTierEmblem({ tier }) {
  const rank = TIER_RANK[tier] || 1

  return (
    <span className={`ost-plan-emblem ost-plan-emblem--${tier}`} aria-hidden>
      <span className="ost-plan-emblem__rank">{rank}</span>
    </span>
  )
}

export default function OwnerPlanFeatureIcon({ name, tier = 'standard', inverted = false }) {
  const gradId = `ost-feat-grad-${name}`

  return (
    <span
      className={`ost-plan-feat-icon ost-plan-feat-icon--${tier}${inverted ? ' ost-plan-feat-icon--inverted' : ''}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
        {!inverted ? (
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={ICON_GRADIENT.a} />
              <stop offset="100%" stopColor={ICON_GRADIENT.b} />
            </linearGradient>
          </defs>
        ) : null}
        <g style={{ color: inverted ? '#ffffff' : `url(#${gradId})` }}>
          <IconPaths name={name} />
        </g>
      </svg>
    </span>
  )
}
