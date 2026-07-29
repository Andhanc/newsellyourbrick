export default function OwnerWalletMetricChart({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="owl-chart-area" x1="110" y1="8" x2="110" y2="124" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0066FF" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#3B82F6" stopOpacity="0.14" />
          <stop offset="1" stopColor="#0066FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="owl-chart-line" x1="12" y1="92" x2="206" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.45" stopColor="#2563EB" />
          <stop offset="1" stopColor="#0066FF" />
        </linearGradient>
        <filter id="owl-chart-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M8 96 C34 92, 52 76, 78 66 C104 56, 126 46, 148 36 C168 27, 186 20, 204 12 L204 124 L8 124 Z"
        fill="url(#owl-chart-area)"
      />

      <path
        d="M8 96 C34 92, 52 76, 78 66 C104 56, 126 46, 148 36 C168 27, 186 20, 204 12"
        stroke="url(#owl-chart-line)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#owl-chart-glow)"
      />

      <path
        d="M194 8 L206 12 L200 22"
        stroke="#0066FF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="204" cy="12" r="4.5" fill="#0066FF" />
      <circle cx="204" cy="12" r="2.2" fill="#EFF6FF" />
    </svg>
  )
}
