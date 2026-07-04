/** Иллюстрация: календарь бронирования проживания (тест-драйв) */
export default function TestDrivePromoIllustration({ className = '' }) {
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

      {/* Календарь — главный акцент */}
      <rect x="44" y="36" width="112" height="100" rx="14" fill="#fff" stroke="#0099A9" strokeWidth="2" />
      <rect x="44" y="36" width="112" height="28" rx="14" fill="url(#td-cal-header)" />
      <rect x="44" y="58" width="112" height="6" fill="#007d8a" />

      <path
        d="M68 50v-10M88 50v-10M112 50v-10M132 50v-10"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Сетка дней */}
      {[0, 1, 2, 3, 4, 5, 6].map((col) => (
        <rect
          key={`d-${col}`}
          x={54 + col * 14}
          y={72}
          width="10"
          height="8"
          rx="2"
          fill="#f1f5f9"
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((col) => (
        <rect
          key={`d2-${col}`}
          x={54 + col * 14}
          y={84}
          width="10"
          height="8"
          rx="2"
          fill={col >= 1 && col <= 5 ? '#cce9ed' : '#f1f5f9'}
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((col) => (
        <rect
          key={`d3-${col}`}
          x={54 + col * 14}
          y={96}
          width="10"
          height="8"
          rx="2"
          fill={col >= 1 && col <= 4 ? '#5eead4' : '#f1f5f9'}
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((col) => (
        <rect
          key={`d4-${col}`}
          x={54 + col * 14}
          y={108}
          width="10"
          height="8"
          rx="2"
          fill={col >= 1 && col <= 2 ? '#2dd4bf' : '#f1f5f9'}
        />
      ))}

      {/* Диапазон 5–21 */}
      <rect x="62" y="118" width="76" height="12" rx="6" fill="#e6f6f8" stroke="#0099A9" strokeWidth="1.2" />
      <text
        x="100"
        y="127"
        textAnchor="middle"
        fill="#00605a"
        fontSize="9"
        fontFamily="Montserrat, system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="0.04em"
      >
        5 – 21
      </text>

      <circle cx="158" cy="52" r="14" fill="#e6f6f8" stroke="#0099A9" strokeWidth="1.5" />
      <path
        d="M152 52l4 4 9-10"
        stroke="#007580"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <defs>
        <linearGradient id="td-cal-header" x1="44" y1="36" x2="156" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#33adbb" />
          <stop offset="1" stopColor="#0099A9" />
        </linearGradient>
      </defs>
    </svg>
  )
}
