/** Empty state: no likes / engagement on analytics chart */
export default function OwnerEmptyLikesIllustration({ className = '' }) {
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
      <rect x="40" y="88" width="140" height="44" rx="12" fill="#ffffff" stroke="#e5e7eb" strokeWidth="2" />
      <path
        d="M52 118 L78 104 L98 112 L118 96 L138 108 L168 92"
        stroke="#e2e8f0"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 5"
      />
      <circle cx="78" cy="104" r="4" fill="#e2e8f0" />
      <circle cx="98" cy="112" r="4" fill="#e2e8f0" />
      <circle cx="118" cy="96" r="4" fill="#e2e8f0" />
      <circle cx="138" cy="108" r="4" fill="#e2e8f0" />
      <path
        d="M110 28c-8.8 0-16 7.2-16 16 0 12 16 28 16 28s16-16 16-28c0-8.8-7.2-16-16-16z"
        fill="#fff1f2"
        stroke="#fda4af"
        strokeWidth="2"
      />
      <path
        d="M98 44c0-6.6 5.4-12 12-12s12 5.4 12 12"
        stroke="#fda4af"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
