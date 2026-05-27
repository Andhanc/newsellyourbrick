/** Иллюстрация: доходность и умная панель инвестора */
export default function CompareInvestorProIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <ellipse cx="100" cy="148" rx="76" ry="8" fill="#8b5cf6" fillOpacity="0.16" />
      <rect x="32" y="88" width="136" height="44" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
      <path
        d="M44 116h24M76 108h20M108 112h16M136 104h20"
        stroke="#e2e8f0"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M48 112l20-28 18 14 26-36 32 50"
        stroke="url(#compare-inv-chart)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="112" r="4" fill="#0abab5" />
      <circle cx="68" cy="84" r="4" fill="#0abab5" />
      <circle cx="86" cy="98" r="4" fill="#0abab5" />
      <circle cx="112" cy="62" r="4" fill="#8b5cf6" />
      <circle cx="144" cy="112" r="5" fill="#7c3aed" />
      <rect x="118" y="36" width="56" height="40" rx="8" fill="url(#compare-inv-panel)" stroke="#a78bfa" strokeWidth="1.5" />
      <path
        d="M128 52h36M128 60h28M128 68h20"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <circle cx="148" cy="48" r="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
      <path
        d="M144 48h5c2 0 3 1 3 2.2 0 1-.8 1.8-2 1.9v.1c1.4.2 2.3 1.1 2.3 2.4 0 1.6-1.3 2.5-3.5 2.5h-5V48z"
        fill="#b45309"
      />
      <rect x="40" y="48" width="36" height="28" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M48 58h20M48 66h14" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M92 44l8 8 14-14"
        stroke="#0d9488"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="compare-inv-chart" x1="44" y1="110" x2="150" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#53d8d3" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="compare-inv-panel" x1="118" y1="36" x2="174" y2="76" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  )
}
