import { useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, ChevronUp, CircleAlert } from 'lucide-react'
import { useOwnerTestProfileOptional } from '../context/OwnerTestProfileContext'
import { useOwnerTestNavOptional } from '../context/OwnerTestNavigationContext'
import { OWNER_VIEWS } from '../utils/ownerTestNav'
import { getOwnerProfileCompletion } from '../utils/ownerTestProfile'
import './OwnerProfileCompletionBanner.css'

const RING_SIZES = { sidebar: 40, card: 50 }

function ProgressRing({ pct, size }) {
  const gradId = useId()
  const center = size / 2
  const strokeWidth = size >= 48 ? 3.5 : 3
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius
  const dash = (pct / 100) * circumference
  const complete = pct >= 100

  return (
    <div className="owner-pc__ring-wrap" style={{ width: size, height: size }} aria-hidden>
      <svg className="owner-pc__ring" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ba3b2" />
            <stop offset="100%" stopColor="#3a7586" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(15, 23, 42, 0.07)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={complete ? '#4a90a2' : `url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span className={`owner-pc__ring-label${size >= 48 ? ' owner-pc__ring-label--md' : ''}`}>
        {pct}%
      </span>
    </div>
  )
}

/**
 * @param {'sidebar' | 'card'} variant — компактный блок в меню или карточка на странице профиля
 * @param {() => void} [onNavigate] — закрыть мобильное меню
 * @param {(fieldKey: string) => void} [onMissingFieldClick] — клик по незаполненному полю
 */
export default function OwnerProfileCompletionBanner({
  variant = 'sidebar',
  className = '',
  onNavigate,
  onMissingFieldClick,
}) {
  const { t } = useTranslation()
  const profileCtx = useOwnerTestProfileOptional()
  const nav = useOwnerTestNavOptional()
  const [expanded, setExpanded] = useState(false)

  const profile = profileCtx?.profile
  const loading = profileCtx?.loading ?? false
  const { filled, total, pct, rows } = getOwnerProfileCompletion(profile)

  const ringSize = RING_SIZES[variant] || RING_SIZES.sidebar
  const title = t('ownerTest_profileCompleteTitle')
  const meta = t('ownerTest_profileCompleteMeta', { filled, total })
  const toggleLabel = expanded
    ? t('ownerTest_profileCompleteCollapse')
    : t('ownerTest_profileCompleteExpand')

  const handleToggle = useCallback(() => {
    setExpanded((value) => !value)
  }, [])

  const handleMissingClick = useCallback(
    (fieldKey) => {
      onNavigate?.()
      if (onMissingFieldClick) {
        onMissingFieldClick(fieldKey)
        return
      }
      if (nav?.goTo) {
        nav.goTo(OWNER_VIEWS.PROFILE, { highlight: fieldKey })
      }
    },
    [nav, onNavigate, onMissingFieldClick]
  )

  if (loading || !profile || pct >= 100) return null

  const missingRows = rows.filter((row) => !row.filled)
  const classNames = [
    'owner-pc',
    `owner-pc--${variant}`,
    expanded ? 'owner-pc--expanded' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classNames}>
      <button
        type="button"
        className="owner-pc__header"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-label={`${title}, ${pct}%${missingRows.length > 0 ? `, ${t('ownerTest_profileCompleteRemaining', { count: missingRows.length })}` : ''}, ${toggleLabel}`}
      >
        <ProgressRing pct={pct} size={ringSize} />
        <span className="owner-pc__summary">
          <span className="owner-pc__title">{title}</span>
          <span className="owner-pc__meta">{meta}</span>
        </span>
        <span className="owner-pc__header-actions">
          {missingRows.length > 0 ? (
            <span className="owner-pc__alert" title={t('ownerTest_profileCompleteMissingHint')} aria-hidden>
              <CircleAlert size={15} strokeWidth={2.25} />
            </span>
          ) : null}
          {expanded ? (
            <ChevronUp size={15} className="owner-pc__chev" aria-hidden />
          ) : (
            <ChevronDown size={15} className="owner-pc__chev" aria-hidden />
          )}
        </span>
      </button>

      {expanded ? (
        <ul className="owner-pc__list">
          {rows.map((row) => (
            <li key={row.key}>
              {row.filled ? (
                <span className="owner-pc__row owner-pc__row--done" title={row.label}>
                  <Check size={11} className="owner-pc__icon-ok" aria-hidden />
                  <span className="owner-pc__row-label">{row.label}</span>
                </span>
              ) : (
                <button
                  type="button"
                  className="owner-pc__row owner-pc__row--missing"
                  title={row.label}
                  onClick={() => handleMissingClick(row.key)}
                >
                  <span className="owner-pc__dot-miss" aria-hidden />
                  <span className="owner-pc__row-label">{row.label}</span>
                </button>
              )}
            </li>
          ))}
          {missingRows.length > 0 ? (
            <li className="owner-pc__hint">{t('ownerTest_profileCompleteRemaining', { count: missingRows.length })}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
