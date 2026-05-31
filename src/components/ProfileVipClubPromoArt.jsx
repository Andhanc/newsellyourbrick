/** Декоративная иллюстрация VIP-клуба (line-art, как на референс-баннере). */
export default function ProfileVipClubPromoArt({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* звёзды */}
      <g className="profile-vip-club-promo-art__float profile-vip-club-promo-art__float--1">
        <path
          d="M42 28l2.2 6.8H51l-5.6 4.1 2.1 6.8L42 41.6l-5.5 4.1 2.1-6.8-5.6-4.1h6.8L42 28z"
          fill="#f0fdfa"
          stroke="#134e4a"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </g>
      <g className="profile-vip-club-promo-art__float profile-vip-club-promo-art__float--2">
        <path
          d="M268 36l1.6 4.9h5.1l-4.1 3 1.6 4.9-4.2-3-4.1 3 1.5-4.9-4-3h5l1.6-4.9z"
          fill="#ecfeff"
          stroke="#134e4a"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>

      {/* ключ */}
      <g className="profile-vip-club-promo-art__float profile-vip-club-promo-art__float--3" transform="translate(228 118) rotate(-18)">
        <circle cx="14" cy="14" r="11" fill="#f0fdfa" stroke="#134e4a" strokeWidth="1.8" />
        <circle cx="14" cy="14" r="4.5" fill="#99f6e4" stroke="#134e4a" strokeWidth="1.4" />
        <rect x="22" y="11" width="34" height="6" rx="3" fill="#ccfbf1" stroke="#134e4a" strokeWidth="1.6" />
        <rect x="48" y="8" width="5" height="12" rx="2" fill="#f0fdfa" stroke="#134e4a" strokeWidth="1.4" />
        <rect x="40" y="8" width="5" height="9" rx="2" fill="#f0fdfa" stroke="#134e4a" strokeWidth="1.4" />
      </g>

      {/* билет / пропуск */}
      <g className="profile-vip-club-promo-art__float profile-vip-club-promo-art__float--4" transform="translate(52 112) rotate(12)">
        <rect x="0" y="0" width="54" height="34" rx="6" fill="#ecfeff" stroke="#134e4a" strokeWidth="1.8" />
        <path d="M18 0v34" stroke="#134e4a" strokeWidth="1.4" strokeDasharray="3 3" />
        <circle cx="9" cy="17" r="3" fill="#5eead4" stroke="#134e4a" strokeWidth="1.2" />
        <rect x="24" y="10" width="22" height="4" rx="2" fill="#99f6e4" />
        <rect x="24" y="18" width="16" height="3" rx="1.5" fill="#ccfbf1" stroke="#134e4a" strokeWidth="1" />
      </g>

      {/* медаль VIP — центральный элемент */}
      <g className="profile-vip-club-promo-art__hero" transform="translate(118 18) rotate(-8)">
        <path
          d="M52 98c-2 14-8 26-18 36l-6 22 14-10 10 8 10-8 14 10-6-22c-10-10-16-22-18-36z"
          fill="#f0fdfa"
          stroke="#134e4a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M34 98c0-22 18-40 40-40s40 18 40 40-18 40-40 40-40-18-40-40z"
          fill="#ecfeff"
          stroke="#134e4a"
          strokeWidth="2.2"
        />
        <circle cx="74" cy="98" r="28" fill="#ccfbf1" stroke="#134e4a" strokeWidth="2" />
        <path
          d="M74 78l5.4 11 12.2 1.8-8.8 8.6 2.1 12.1-10.9-5.7-10.9 5.7 2.1-12.1-8.8-8.6 12.2-1.8L74 78z"
          fill="#5eead4"
          stroke="#134e4a"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M64 128h20l-4 18-6-4-6 4-4-18z"
          fill="#99f6e4"
          stroke="#134e4a"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </g>

      {/* блик */}
      <ellipse cx="200" cy="42" rx="36" ry="14" fill="white" opacity="0.14" />
    </svg>
  )
}
