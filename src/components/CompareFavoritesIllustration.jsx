/** Декоративная иллюстрация: два объекта и сравнение */
export default function CompareFavoritesIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <ellipse cx="100" cy="148" rx="76" ry="8" fill="#0099A9" fillOpacity="0.14" />
      <rect x="36" y="58" width="52" height="68" rx="8" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="112" y="58" width="52" height="68" rx="8" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="44" y="70" width="28" height="6" rx="3" fill="#e2e8f0" />
      <rect x="44" y="82" width="36" height="5" rx="2.5" fill="#f1f5f9" />
      <rect x="44" y="94" width="24" height="5" rx="2.5" fill="#f8fafc" />
      <rect x="120" y="70" width="28" height="6" rx="3" fill="#e2e8f0" />
      <rect x="120" y="82" width="36" height="5" rx="2.5" fill="#f1f5f9" />
      <rect x="120" y="94" width="24" height="5" rx="2.5" fill="#f8fafc" />
      <circle cx="100" cy="88" r="22" fill="url(#compare-fav-badge)" stroke="#0099A9" strokeWidth="2" />
      <path
        d="M90 88h8M100 78v20M110 88h-8"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M94 88h12M100 82v12"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <path
        d="M68 52l16 8M132 52l-16 8"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 3"
      />
      <rect x="42" y="108" width="18" height="10" rx="3" fill="#e6f6f8" />
      <rect x="126" y="108" width="18" height="10" rx="3" fill="#ffe4e6" />
      <path
        d="M48 113h6M132 113h6"
        stroke="#007580"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M135 113h3"
        stroke="#e11d48"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="56" cy="40" r="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="144" cy="44" r="7" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
      <defs>
        <linearGradient id="compare-fav-badge" x1="78" y1="66" x2="122" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#33adbb" />
          <stop offset="1" stopColor="#0099A9" />
        </linearGradient>
      </defs>
    </svg>
  )
}
