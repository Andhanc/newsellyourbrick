/** Декоративная иллюстрация для drawer первого объекта в избранном */
export default function FirstFavoriteIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <ellipse cx="100" cy="148" rx="72" ry="8" fill="#fb7185" fillOpacity="0.18" />
      <rect x="58" y="72" width="84" height="58" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
      <path
        d="M58 86h84"
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      <rect x="68" y="96" width="36" height="8" rx="4" fill="#f1f5f9" />
      <rect x="68" y="110" width="52" height="6" rx="3" fill="#f8fafc" />
      <rect x="112" y="96" width="20" height="20" rx="4" fill="#ffe4e6" stroke="#fda4af" strokeWidth="1.5" />
      <path
        d="M100 38c-10-14-28-8-28 8 0 18 28 32 28 32s28-14 28-32c0-16-18-22-28-8z"
        fill="url(#first-fav-heart)"
        stroke="#e11d48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="44" cy="52" r="10" fill="#fff7ed" stroke="#fb923c" strokeWidth="1.5" />
      <path
        d="M40 52h3c1.6 0 2.5.8 2.5 1.8 0 1-.7 1.6-1.8 1.7v.1c1.2.1 2 1 2 2 0 1.4-1.2 2.2-3.2 2.2H40V52z"
        fill="#c2410c"
      />
      <circle cx="156" cy="64" r="12" fill="#e6f6f8" stroke="#0099A9" strokeWidth="1.5" />
      <path
        d="M150 64l4 4 8-8"
        stroke="#007580"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="first-fav-heart" x1="72" y1="30" x2="128" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fb7185" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
      </defs>
    </svg>
  )
}
