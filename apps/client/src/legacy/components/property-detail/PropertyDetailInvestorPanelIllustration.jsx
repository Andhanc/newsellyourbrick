import { useTranslation } from 'react-i18next'

/** Мини-превью Умной панели инвестора — визуал как на /calculator */
export default function PropertyDetailInvestorPanelIllustration({ className = '' }) {
  const { t } = useTranslation()

  return (
    <svg
      className={className}
      viewBox="0 0 320 188"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pdx-inv-bg" x1="0" y1="0" x2="320" y2="188" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0a0e27" />
          <stop offset="0.45" stopColor="#12162e" />
          <stop offset="1" stopColor="#1a1f3a" />
        </linearGradient>
        <linearGradient id="pdx-inv-chart" x1="48" y1="132" x2="272" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4a96a6" />
          <stop offset="0.55" stopColor="#3f8798" />
          <stop offset="1" stopColor="#5aa5b5" />
        </linearGradient>
        <linearGradient id="pdx-inv-area" x1="160" y1="72" x2="160" y2="148" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4a96a6" stopOpacity="0.28" />
          <stop offset="1" stopColor="#4a96a6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pdx-inv-stat-a" x1="18" y1="18" x2="98" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" stopOpacity="0.28" />
          <stop offset="1" stopColor="#4a96a6" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="pdx-inv-stat-b" x1="104" y1="18" x2="184" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4a96a6" stopOpacity="0.22" />
          <stop offset="1" stopColor="#3f8798" stopOpacity="0.1" />
        </linearGradient>
        <filter id="pdx-inv-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#4a96a6" floodOpacity="0.24" />
        </filter>
      </defs>

      <rect width="320" height="188" fill="url(#pdx-inv-bg)" />
      <circle cx="48" cy="36" r="52" fill="#4a96a6" fillOpacity="0.13" />
      <circle cx="278" cy="156" r="58" fill="#3f8798" fillOpacity="0.11" />

      {/* KPI cards */}
      <rect x="14" y="14" width="78" height="50" rx="10" fill="url(#pdx-inv-stat-a)" stroke="rgba(255,255,255,0.1)" />
      <text x="24" y="30" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewRoi')}
      </text>
      <text x="24" y="52" fill="#ffffff" fontSize="17" fontWeight="800" fontFamily="Montserrat, sans-serif">
        12.4%
      </text>

      <rect x="100" y="14" width="78" height="50" rx="10" fill="url(#pdx-inv-stat-b)" stroke="rgba(255,255,255,0.1)" />
      <text x="110" y="30" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewNet')}
      </text>
      <text x="110" y="52" fill="#cce9ed" fontSize="17" fontWeight="800" fontFamily="Montserrat, sans-serif">
        9.8%
      </text>

      <rect x="186" y="14" width="120" height="50" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
      <text x="196" y="30" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewPayback')}
      </text>
      <text x="196" y="52" fill="#99f6e4" fontSize="17" fontWeight="800" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewPaybackValue')}
      </text>

      {/* Chart panel */}
      <g filter="url(#pdx-inv-glow)">
        <rect x="14" y="72" width="292" height="102" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
      </g>

      <text x="26" y="88" fill="rgba(255,255,255,0.72)" fontSize="8.5" fontWeight="700" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewForecast')}
      </text>

      <rect x="226" y="78" width="34" height="14" rx="7" fill="rgba(74,150,166,0.42)" stroke="rgba(142,181,196,0.5)" />
      <text x="233" y="88" fill="#ffffff" fontSize="7" fontWeight="700" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewIncome')}
      </text>
      <rect x="264" y="78" width="34" height="14" rx="7" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" />
      <text x="269" y="88" fill="rgba(255,255,255,0.45)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewExpense')}
      </text>

      {/* Grid + axis labels */}
      <line x1="48" y1="104" x2="296" y2="104" stroke="rgba(255,255,255,0.06)" />
      <line x1="48" y1="122" x2="296" y2="122" stroke="rgba(255,255,255,0.06)" />
      <line x1="48" y1="140" x2="296" y2="140" stroke="rgba(255,255,255,0.06)" />
      <line x1="48" y1="158" x2="296" y2="158" stroke="rgba(255,255,255,0.08)" />

      <text x="26" y="108" fill="rgba(255,255,255,0.32)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        12%
      </text>
      <text x="26" y="126" fill="rgba(255,255,255,0.32)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        8%
      </text>
      <text x="26" y="144" fill="rgba(255,255,255,0.32)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        4%
      </text>
      <text x="30" y="162" fill="rgba(255,255,255,0.32)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        0
      </text>

      <text x="72" y="168" fill="rgba(255,255,255,0.35)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewYear1')}
      </text>
      <text x="132" y="168" fill="rgba(255,255,255,0.35)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewYear3')}
      </text>
      <text x="192" y="168" fill="rgba(255,255,255,0.35)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewYear5')}
      </text>
      <text x="268" y="168" fill="rgba(255,255,255,0.35)" fontSize="7" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewYear7')}
      </text>

      {/* Area + line */}
      <path
        d="M52 148 C78 138, 98 142, 118 128 S168 108, 198 114 S248 92, 288 78 L288 158 L52 158 Z"
        fill="url(#pdx-inv-area)"
      />
      <path
        d="M52 148 C78 138, 98 142, 118 128 S168 108, 198 114 S248 92, 288 78"
        stroke="url(#pdx-inv-chart)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="148" r="3" fill="#5aa5b5" />
      <circle cx="118" cy="128" r="3" fill="#4a96a6" />
      <circle cx="198" cy="114" r="3" fill="#3f8798" />
      <circle cx="288" cy="78" r="3.5" fill="#e3f0f3" stroke="#ffffff" strokeOpacity="0.35" />

      {/* Legend */}
      <circle cx="228" cy="166" r="2.5" fill="#5aa5b5" />
      <text x="234" y="169" fill="rgba(255,255,255,0.45)" fontSize="6.5" fontWeight="600" fontFamily="Montserrat, sans-serif">
        {t('propertyDetailInvestorPromoPreviewLegend')}
      </text>
    </svg>
  )
}
