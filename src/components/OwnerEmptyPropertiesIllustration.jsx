/** Empty state: seller has no listings yet */
export default function OwnerEmptyPropertiesIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <ellipse cx="110" cy="138" rx="78" ry="7" fill="#4a90a2" fillOpacity="0.14" />
      <rect x="52" y="34" width="116" height="92" rx="14" fill="#ffffff" stroke="#e5e7eb" strokeWidth="2" />
      <path
        d="M52 58h116"
        stroke="#e5e7eb"
        strokeWidth="2"
      />
      <rect x="68" y="44" width="36" height="8" rx="4" fill="#e8f1f4" />
      <rect x="68" y="72" width="84" height="10" rx="5" fill="#f8fafc" />
      <rect x="68" y="88" width="64" height="8" rx="4" fill="#f1f5f9" />
      <rect x="68" y="102" width="72" height="8" rx="4" fill="#f1f5f9" />
      <rect
        x="68"
        y="72"
        width="84"
        height="38"
        rx="8"
        fill="#fafafa"
        stroke="#d1d5db"
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />
      <circle cx="152" cy="48" r="18" fill="#111827" />
      <path d="M152 40v16M144 48h16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
