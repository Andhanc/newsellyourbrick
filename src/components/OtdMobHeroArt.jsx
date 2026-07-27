/** 3D clay-style geometry for test-drive mobile hero — true transparency, no image background. */
export default function OtdMobHeroArt({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="otd-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="otd-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="otd-charcoal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="otd-cube-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="otd-cube-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <filter id="otd-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#5b21b6" floodOpacity="0.14" />
        </filter>
      </defs>

      <ellipse cx="62" cy="102" rx="34" ry="7" fill="rgba(91, 33, 182, 0.1)" />

      <g filter="url(#otd-soft-shadow)">
        <ellipse cx="36" cy="58" rx="20" ry="18" stroke="url(#otd-orange)" strokeWidth="10" />
        <ellipse cx="68" cy="42" rx="17" ry="15" stroke="url(#otd-yellow)" strokeWidth="9" />
        <ellipse cx="58" cy="72" rx="15" ry="13" stroke="url(#otd-charcoal)" strokeWidth="8" />

        <rect x="18" y="24" width="16" height="16" rx="5" fill="url(#otd-cube-light)" />
        <rect x="78" y="52" width="22" height="22" rx="7" fill="url(#otd-cube-dark)" />
      </g>

      <ellipse cx="36" cy="54" rx="14" ry="5" fill="rgba(255, 255, 255, 0.35)" />
      <ellipse cx="68" cy="38" rx="11" ry="4" fill="rgba(255, 255, 255, 0.32)" />
      <rect x="20" y="26" width="7" height="4" rx="2" fill="rgba(255, 255, 255, 0.45)" />
    </svg>
  )
}
