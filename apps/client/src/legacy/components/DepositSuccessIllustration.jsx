/** Декоративная иллюстрация для drawer успешного пополнения депозита */
export default function DepositSuccessIllustration({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <ellipse cx="100" cy="148" rx="72" ry="8" fill="#0099A9" fillOpacity="0.12" />
      <circle cx="148" cy="44" r="22" fill="#e6f6f8" stroke="#0099A9" strokeWidth="2" />
      <path
        d="M140 44l6 6 14-14"
        stroke="#007580"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="58" r="14" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
      <path
        d="M46 58h4c2.2 0 3.5 1 3.5 2.4 0 1.2-.9 2-2.2 2.1v.1c1.6.2 2.7 1.2 2.7 2.6 0 1.8-1.5 2.8-4 2.8h-4.5V58zm3.6 3.8c1.3 0 2-.5 2-1.3 0-.8-.7-1.3-2-1.3h-1.6v2.6h1.6zm.2 4.2c1.4 0 2.2-.5 2.2-1.4 0-.9-.8-1.4-2.3-1.4H49v2.8h1z"
        fill="#b45309"
      />
      <path
        d="M88 128c0-22 8-38 24-48 10-6 22-8 32-6"
        stroke="#cbd5e1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M88 128c18 4 36 2 52-8"
        stroke="#cbd5e1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="100" cy="52" r="18" fill="#fde68a" />
      <path
        d="M82 52c0-10 8-18 18-18s18 8 18 18"
        fill="#1e293b"
      />
      <circle cx="94" cy="50" r="2" fill="#1e293b" />
      <circle cx="106" cy="50" r="2" fill="#1e293b" />
      <path
        d="M94 58c3 3 9 3 12 0"
        stroke="#1e293b"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M76 78c-4 6-6 14-6 22v28h60V100c0-8-2-16-6-22"
        fill="#33adbb"
      />
      <path
        d="M76 78h48c4 6 6 14 6 22v28H70V100c0-8 2-16 6-22z"
        fill="#0099A9"
      />
      <path
        d="M62 92c-8-2-14 4-14 12 0 6 4 10 10 12"
        stroke="#007580"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M138 88c8-2 14 4 14 12 0 6-4 10-10 12"
        stroke="#007580"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="86" y="118" width="28" height="18" rx="4" fill="#fff" fillOpacity="0.35" />
      <path
        d="M92 127h16M92 131h10"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
    </svg>
  )
}
