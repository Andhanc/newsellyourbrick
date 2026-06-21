import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import './OapAddPropertyJourneyProgress.css'

export default function OapAddPropertyJourneyProgress({ currentStep = 1, totalSteps = 7 }) {
  const { t } = useTranslation()
  const gradientId = useId()

  const safeTotal = Math.max(1, totalSteps)
  const safeStep = Math.min(Math.max(1, currentStep), safeTotal)

  const percent = useMemo(() => {
    if (safeTotal <= 1) return 0
    return Math.round(((safeStep - 1) / (safeTotal - 1)) * 100)
  }, [safeStep, safeTotal])

  const size = 54
  const stroke = 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div
      className="oap-journey-progress"
      role="status"
      aria-live="polite"
      aria-label={t('oap_journeyProgressAria', {
        percent,
        current: safeStep,
        total: safeTotal,
      })}
    >
      <div className="oap-journey-progress__card">
        <div className="oap-journey-progress__ring-wrap" aria-hidden="true">
          <svg
            className="oap-journey-progress__ring"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#53d8d3" />
                <stop offset="52%" stopColor="#0abab5" />
                <stop offset="100%" stopColor="#089a95" />
              </linearGradient>
            </defs>
            <circle
              className="oap-journey-progress__ring-track"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
            />
            <circle
              className="oap-journey-progress__ring-progress"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <span className="oap-journey-progress__percent">{percent}%</span>
        </div>

        <div className="oap-journey-progress__meta">
          <p className="oap-journey-progress__title">{t('oap_journeyProgressTitle')}</p>
          <div className="oap-journey-progress__step-row">
            <p className="oap-journey-progress__step">
              {t('oap_journeyProgressStep', { current: safeStep, total: safeTotal })}
            </p>
            <ul className="oap-journey-progress__steps" aria-hidden="true">
              {Array.from({ length: safeTotal }, (_, index) => {
                const stepNum = index + 1
                const isDone = stepNum < safeStep
                const isActive = stepNum === safeStep

                return (
                  <li
                    key={stepNum}
                    className={`oap-journey-progress__dot${isDone ? ' oap-journey-progress__dot--done' : ''}${isActive ? ' oap-journey-progress__dot--active' : ''}`}
                  />
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
