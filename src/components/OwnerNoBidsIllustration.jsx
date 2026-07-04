/** Empty state: no bids on owner listings yet */
export default function OwnerNoBidsIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <ellipse cx="110" cy="138" rx="78" ry="7" fill="#0099A9" fillOpacity="0.14" />

      <rect x="46" y="28" width="128" height="102" rx="16" fill="#ffffff" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="46" y="28" width="128" height="34" rx="16" fill="url(#owner-no-bids-header)" />
      <rect x="46" y="54" width="128" height="8" fill="#007d8a" />

      <g transform="translate(62 40)">
        <rect x="0" y="7" width="16" height="6" rx="3" fill="#ffffff" fillOpacity="0.95" />
        <rect x="6" y="2" width="4" height="16" rx="2" fill="#ffffff" fillOpacity="0.85" />
        <rect x="4" y="16" width="8" height="4" rx="2" fill="#ffffff" fillOpacity="0.7" />
      </g>

      <rect x="92" y="38" width="44" height="10" rx="5" fill="#ffffff" fillOpacity="0.22" />
      <rect x="98" y="41" width="18" height="4" rx="2" fill="#ffffff" fillOpacity="0.85" />
      <rect x="120" y="41" width="10" height="4" rx="2" fill="#ffffff" fillOpacity="0.55" />

      <circle cx="154" cy="45" r="15" fill="#ffffff" fillOpacity="0.18" stroke="#ffffff" strokeWidth="2" />
      <text
        x="154"
        y="51"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="18"
        fontFamily="Montserrat, system-ui, sans-serif"
        fontWeight="700"
      >
        0
      </text>

      <rect x="58" y="72" width="36" height="36" rx="8" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1.5" />
      <path
        d="M68 92h16M76 84v16"
        stroke="#cbd5e1"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <rect x="102" y="76" width="60" height="8" rx="4" fill="#f8fafc" />
      <rect x="102" y="88" width="44" height="6" rx="3" fill="#f1f5f9" />
      <rect x="102" y="98" width="52" height="6" rx="3" fill="#e6f6f8" />

      <rect x="58" y="118" width="104" height="10" rx="5" fill="#fafafa" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="5 4" />
      <rect x="58" y="132" width="104" height="10" rx="5" fill="#fafafa" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="5 4" />

      <defs>
        <linearGradient id="owner-no-bids-header" x1="46" y1="28" x2="174" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#33adbb" />
          <stop offset="1" stopColor="#0099A9" />
        </linearGradient>
      </defs>
    </svg>
  )
}
