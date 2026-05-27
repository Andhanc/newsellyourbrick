import { useId } from 'react'

/** Компактная иллюстрация для промо-блока «Рассчитать доходность» */
export default function PropertyYieldPromoIllustration({ className = '' }) {
  const uid = useId().replace(/:/g, '')

  return (
    <svg
      className={className}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <rect
        x="10"
        y="18"
        width="52"
        height="38"
        rx="10"
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth="1.5"
      />
      <path
        d="M18 48h36"
        stroke="#f1f5f9"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="20" y="44" width="7" height="8" rx="2" fill="#ccfbf1" />
      <rect x="30" y="38" width="7" height="14" rx="2" fill="#99f6e4" />
      <rect x="40" y="32" width="7" height="20" rx="2" fill="#5eead4" />
      <rect x="50" y="26" width="7" height="26" rx="2" fill="#0abab5" />
      <path
        d="M19 46 L29 40 L39 36 L53 24"
        stroke={`url(#${uid}-trend)`}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="46" r="2.5" fill="#0abab5" />
      <circle cx="29" cy="40" r="2.5" fill="#14b8a6" />
      <circle cx="39" cy="36" r="2.5" fill="#2dd4bf" />
      <circle cx="53" cy="24" r="3" fill="#7c3aed" stroke="#fff" strokeWidth="1.5" />
      <g transform="translate(46, 8)">
        <circle cx="12" cy="12" r="12" fill={`url(#${uid}-coin)`} stroke="#fbbf24" strokeWidth="1.5" />
        <text
          x="12"
          y="16.5"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#92400e"
          fontFamily="Montserrat, system-ui, sans-serif"
        >
          %
        </text>
      </g>
      <defs>
        <linearGradient id={`${uid}-trend`} x1="19" y1="46" x2="53" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0abab5" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={`${uid}-coin`} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef9c3" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
    </svg>
  )
}
