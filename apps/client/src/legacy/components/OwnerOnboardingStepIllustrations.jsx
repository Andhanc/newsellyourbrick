/** Inline SVG hero art — renders instantly, no network fetch */

function StepIllustrationShell({ children, className = '', gradId = 'owner-onb-bg' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 390 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gradId} x1="195" y1="0" x2="195" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#faf8f5" />
        </linearGradient>
      </defs>
      <rect width="390" height="280" fill={`url(#${gradId})`} />
      {children}
    </svg>
  )
}

export function OwnerOnboardingStep1Illustration({ className = '' }) {
  return (
    <StepIllustrationShell className={className} gradId="owner-onb-bg-1">
      <ellipse cx="195" cy="252" rx="120" ry="10" fill="#0099a9" fillOpacity="0.12" />
      <rect x="48" y="48" width="294" height="176" rx="20" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="68" y="68" width="88" height="12" rx="6" fill="#e8f1f4" />
      <rect x="68" y="92" width="120" height="10" rx="5" fill="#f1f5f9" />
      <rect x="68" y="118" width="72" height="72" rx="14" fill="#f8fafc" stroke="#e5e7eb" strokeWidth="1.5" />
      <rect x="156" y="118" width="72" height="72" rx="14" fill="#f8fafc" stroke="#e5e7eb" strokeWidth="1.5" />
      <rect x="244" y="118" width="72" height="72" rx="14" fill="#f8fafc" stroke="#e5e7eb" strokeWidth="1.5" />
      <rect x="78" y="132" width="36" height="8" rx="4" fill="#e8f1f4" />
      <rect x="166" y="132" width="36" height="8" rx="4" fill="#fce7f3" />
      <rect x="254" y="132" width="36" height="8" rx="4" fill="#fef3c7" />
      <circle cx="104" cy="168" r="14" fill="#0099a9" fillOpacity="0.18" />
      <circle cx="192" cy="168" r="14" fill="#db2777" fillOpacity="0.16" />
      <circle cx="280" cy="168" r="14" fill="#f59e0b" fillOpacity="0.18" />
    </StepIllustrationShell>
  )
}

export function OwnerOnboardingStep2Illustration({ className = '' }) {
  return (
    <StepIllustrationShell className={className} gradId="owner-onb-bg-2">
      <ellipse cx="195" cy="252" rx="120" ry="10" fill="#0099a9" fillOpacity="0.12" />
      <rect x="56" y="56" width="278" height="160" rx="18" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="76" y="76" width="100" height="12" rx="6" fill="#e8f1f4" />
      <defs>
        <linearGradient id="owner-onb-chart-fill-2" x1="188" y1="96" x2="188" y2="188" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0099a9" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0099a9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M88 188 L128 148 L168 162 L208 118 L248 136 L288 96"
        stroke="#0099a9"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M88 188 L128 148 L168 162 L208 118 L248 136 L288 96 L288 188 L88 188 Z"
        fill="url(#owner-onb-chart-fill-2)"
      />
      <circle cx="128" cy="148" r="5" fill="#fff" stroke="#0099a9" strokeWidth="2" />
      <circle cx="208" cy="118" r="5" fill="#fff" stroke="#0099a9" strokeWidth="2" />
      <circle cx="288" cy="96" r="5" fill="#fff" stroke="#0099a9" strokeWidth="2" />
    </StepIllustrationShell>
  )
}

export function OwnerOnboardingStep3Illustration({ className = '' }) {
  return (
    <StepIllustrationShell className={className} gradId="owner-onb-bg-3">
      <ellipse cx="195" cy="252" rx="120" ry="10" fill="#0099a9" fillOpacity="0.12" />
      <rect x="72" y="44" width="246" height="168" rx="18" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="92" y="64" width="206" height="88" rx="12" fill="#f8fafc" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="6 5" />
      <circle cx="195" cy="108" r="22" fill="#111827" />
      <path d="M195 96v24M183 108h24" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="92" y="164" width="120" height="10" rx="5" fill="#f1f5f9" />
      <rect x="92" y="182" width="168" height="8" rx="4" fill="#e8f1f4" />
      <rect x="228" y="160" width="70" height="32" rx="10" fill="#0099a9" fillOpacity="0.15" />
    </StepIllustrationShell>
  )
}

export function OwnerOnboardingStep4Illustration({ className = '' }) {
  return (
    <StepIllustrationShell className={className} gradId="owner-onb-bg-4">
      <ellipse cx="195" cy="252" rx="120" ry="10" fill="#0099a9" fillOpacity="0.12" />
      <defs>
        <linearGradient id="owner-onb-star-4" x1="195" y1="52" x2="195" y2="224" gradientUnits="userSpaceOnUse">
          <stop stopColor="#33adbb" />
          <stop offset="1" stopColor="#0099a9" />
        </linearGradient>
      </defs>
      <path
        d="M195 52 L218 118 H288 L232 158 L252 224 L195 184 L138 224 L158 158 L102 118 H172 Z"
        fill="url(#owner-onb-star-4)"
        stroke="#0099a9"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="195" cy="132" r="28" fill="#fff" fillOpacity="0.92" />
      <path
        d="M182 132 L192 142 L210 120"
        stroke="#007d8a"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StepIllustrationShell>
  )
}

export const OWNER_ONBOARDING_ILLUSTRATIONS = [
  OwnerOnboardingStep1Illustration,
  OwnerOnboardingStep2Illustration,
  OwnerOnboardingStep3Illustration,
  OwnerOnboardingStep4Illustration,
]
