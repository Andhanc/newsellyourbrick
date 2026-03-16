import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiCheck, FiX, FiChevronDown, FiChevronUp, FiChevronRight,
  FiAlertCircle, FiFileText, FiFolder,
} from 'react-icons/fi'
import './AddPropertyProgress.css'

/**
 * Floating widget showing required debt document upload progress.
 * Only relevant on the 'documents' step for debt properties.
 *
 * Props:
 *   debtDocumentsByCategory – { catKey: [files] }
 *   requiredDebtDocs        – [{ id, label, categoryKey, docTitle }]
 *   onGoToDoc(categoryKey, docId) – navigate to document category + highlight doc
 *   isDebtProperty          – bool
 */
const AddPropertyProgress = ({
  debtDocumentsByCategory = {},
  requiredDebtDocs = [],
  onGoToDoc,
  isDebtProperty,
}) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible || !isDebtProperty) return null

  // ── Required debt documents ────────────────────────────────────────
  const docFields = requiredDebtDocs.map(doc => ({
    id: doc.id,
    label: doc.label,
    icon: <FiFileText size={14} />,
    categoryKey: doc.categoryKey,
    docIndex: doc.docIndex,
    // Проверяем конкретный слот документа по его индексу в категории
    filled: !!(debtDocumentsByCategory[doc.categoryKey]?.[doc.docIndex]),
  }))

  const filled = docFields.filter(f => f.filled)
  const missing = docFields.filter(f => !f.filled)
  const progress = docFields.length
    ? Math.round((filled.length / docFields.length) * 100)
    : 0

  const color = progress === 100 ? '#10b981' : progress >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`ap-progress ${isExpanded ? 'ap-progress--expanded' : ''}`}>
      {/* ── Header ── */}
      <div
        className="ap-progress__header"
        onClick={() => setIsExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') setIsExpanded(v => !v) }}
      >
        <div className="ap-progress__header-left">
          <div className="ap-progress__icon-wrap" style={{ borderColor: `${color}40`, background: `${color}12` }}>
            {progress === 100
              ? <FiCheck className="ap-progress__icon" style={{ color }} />
              : <FiAlertCircle className="ap-progress__icon" style={{ color }} />
            }
          </div>
          <div>
            <h4 className="ap-progress__title">
              {progress === 100 ? t('addPropertyDebtProgressAllUploaded') : t('addPropertyDebtProgressRequired')}
            </h4>
            <p className="ap-progress__subtitle">
              {t('addPropertyDebtProgressCount', { filled: filled.length, total: docFields.length })}
            </p>
          </div>
        </div>
        <div className="ap-progress__header-right">
          <div className="ap-progress__circle">
            <svg viewBox="0 0 40 40" className="ap-progress__svg">
              <circle cx="20" cy="20" r="17" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="17" fill="none"
                stroke={color} strokeWidth="3"
                strokeDasharray={`${progress * 106.8 / 100} 106.8`}
                transform="rotate(-90 20 20)"
              />
            </svg>
            <span className="ap-progress__percent" style={{ color }}>{progress}%</span>
          </div>
          <button
            className="ap-progress__toggle"
            onClick={e => { e.stopPropagation(); setIsExpanded(v => !v) }}
            aria-label={t('addPropertyExpand')}
          >
            {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
          </button>
          <button
            className="ap-progress__close"
            onClick={e => { e.stopPropagation(); setIsVisible(false) }}
            aria-label={t('addPropertyProgressClose')}
          >
            <FiX size={16} />
          </button>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {isExpanded && (
        <div className="ap-progress__body">
          {/* Progress bar */}
          <div className="ap-progress__bar-track">
            <div className="ap-progress__bar-fill" style={{ width: `${progress}%`, backgroundColor: color }} />
          </div>

          {/* ── Uploaded docs ── */}
          {filled.length > 0 && (
            <Section title={t('addPropertyDebtProgressUploaded', { count: filled.length })} type="success" icon={<FiFolder size={14} />}>
              {filled.map(f => (
                <Item key={f.id} field={f} variant="filled" />
              ))}
            </Section>
          )}

          {/* ── Missing docs ── */}
          {missing.length > 0 && (
            <Section title={t('addPropertyDebtProgressMissing', { count: missing.length })} type="warning" icon={<FiFolder size={14} />}>
              {missing.map(f => (
                <Item
                  key={f.id}
                  field={f}
                  variant="missing"
                  onClick={() => onGoToDoc && onGoToDoc(f.categoryKey, f.id)}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

const Section = ({ title, type, icon, children }) => (
  <div className="ap-progress__section">
    <div className={`ap-progress__section-header ap-progress__section-header--${type}`}>
      {type === 'success' ? <FiCheck size={13} /> : <FiX size={13} />}
      {icon && <span style={{ marginLeft: 2 }}>{icon}</span>}
      <span>{title}</span>
    </div>
    <ul className="ap-progress__list">{children}</ul>
  </div>
)

const Item = ({ field, variant, onClick }) => (
  <li
    className={`ap-progress__item ap-progress__item--${variant} ${onClick ? 'ap-progress__item--clickable' : ''}`}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
  >
    <span className="ap-progress__item-icon">{field.icon}</span>
    <span className="ap-progress__item-label">{field.label}</span>
    {variant === 'filled'
      ? <FiCheck className="ap-progress__item-check" size={13} />
      : onClick && <FiChevronRight className="ap-progress__item-chevron" size={15} />
    }
  </li>
)

export default AddPropertyProgress
