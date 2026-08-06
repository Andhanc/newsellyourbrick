import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX, FiCamera } from 'react-icons/fi'
import './PassportRecognitionModal.css'

const ALWAYS_EDITABLE_FIELDS = [
  { key: 'passportNumber', labelKey: 'buyerData_labelPassportNumber', autoComplete: 'off' },
  { key: 'identificationNumber', labelKey: 'buyerData_labelIdNumber', autoComplete: 'off' },
]

const OPTIONAL_EDITABLE_FIELDS = [
  { key: 'passportSeries', labelKey: 'buyerData_labelPassportSeries', autoComplete: 'off' },
  { key: 'firstName', labelKey: 'buyerData_labelFirstName', autoComplete: 'given-name' },
  { key: 'lastName', labelKey: 'buyerData_labelLastName', autoComplete: 'family-name' },
]

function buildDraftFromExtracted(extractedData) {
  const draft = {}
  for (const field of [...ALWAYS_EDITABLE_FIELDS, ...OPTIONAL_EDITABLE_FIELDS]) {
    const value = extractedData?.[field.key]
    draft[field.key] = typeof value === 'string' ? value : value == null ? '' : String(value)
  }
  return draft
}

const PassportRecognitionModal = ({
  isOpen,
  mode = 'confirm',
  onClose,
  onConfirm,
  onReject,
  onRetry,
  extractedData,
  isSaving = false,
}) => {
  const { t } = useTranslation()
  const formId = useId()
  const [draft, setDraft] = useState(() => buildDraftFromExtracted(extractedData))

  useEffect(() => {
    if (!isOpen) return
    setDraft(buildDraftFromExtracted(extractedData))
  }, [isOpen, extractedData])

  if (!isOpen || typeof document === 'undefined') return null

  const isNoticeMode = mode === 'not-document' || mode === 'unreadable'

  const handleReject = () => {
    if (isSaving) return
    onReject?.()
    onClose?.()
  }

  const handleRetry = () => {
    if (isSaving) return
    onRetry?.()
  }

  if (isNoticeMode) {
    const titleKey =
      mode === 'not-document' ? 'buyerData_passportNotDocTitle' : 'buyerData_passportUnreadableTitle'
    const textKey =
      mode === 'not-document' ? 'buyerData_passportNotDocText' : 'buyerData_passportUnreadableText'
    const tipKeys =
      mode === 'not-document'
        ? [
            'buyerData_passportNotDocTip1',
            'buyerData_passportNotDocTip2',
            'buyerData_passportNotDocTip3',
          ]
        : [
            'buyerData_passportUnreadableTip1',
            'buyerData_passportUnreadableTip2',
            'buyerData_passportUnreadableTip3',
          ]

    return createPortal(
      <div className="passport-recognition-modal-overlay" onClick={handleReject} role="presentation">
        <div
          className="passport-recognition-modal passport-recognition-modal--notice"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="passport-recognition-title"
        >
          <button
            type="button"
            className="passport-recognition-modal__close"
            onClick={handleReject}
            aria-label={t('buyerData_cancel')}
          >
            <FiX size={20} />
          </button>

          <div className="passport-recognition-modal__content passport-recognition-modal__content--notice">
            <div className="passport-recognition-modal__notice-icon" aria-hidden>
              <FiCamera size={28} strokeWidth={1.8} />
            </div>
            <p className="passport-recognition-modal__eyebrow">{t('buyerData_passportConfirmEyebrow')}</p>
            <h2 id="passport-recognition-title" className="passport-recognition-modal__title">
              {t(titleKey)}
            </h2>
            <p className="passport-recognition-modal__text">{t(textKey)}</p>

            <ul className="passport-recognition-modal__tips">
              {tipKeys.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>

            <div className="passport-recognition-modal__buttons">
              <button
                type="button"
                className="passport-recognition-modal__button passport-recognition-modal__button--primary"
                onClick={handleRetry}
              >
                {t('buyerData_passportNotDocRetry')}
              </button>
              <button
                type="button"
                className="passport-recognition-modal__button passport-recognition-modal__button--secondary"
                onClick={handleReject}
              >
                {t('buyerData_cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  const optionalFields = OPTIONAL_EDITABLE_FIELDS.filter((item) => {
    const original = extractedData?.[item.key]
    return typeof original === 'string' && original.trim()
  })
  const fields = [...ALWAYS_EDITABLE_FIELDS, ...optionalFields]

  const country = typeof extractedData?.issuingCountry === 'string' ? extractedData.issuingCountry.trim() : ''
  const documentType = typeof extractedData?.documentType === 'string' ? extractedData.documentType.trim() : ''
  const metaBits = [country, documentType && documentType !== 'unknown' ? documentType.replace(/_/g, ' ') : '']
    .filter(Boolean)
    .join(' · ')

  const hasAnyValue = fields.some((item) => String(draft[item.key] || '').trim())

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleConfirm = () => {
    if (isSaving || !hasAnyValue) return
    onConfirm?.({
      ...(extractedData || {}),
      ...draft,
      passportNumber: String(draft.passportNumber || '').trim(),
      identificationNumber: String(draft.identificationNumber || '').trim(),
      passportSeries: String(draft.passportSeries || '').trim(),
      firstName: String(draft.firstName || '').trim(),
      lastName: String(draft.lastName || '').trim(),
    })
  }

  return createPortal(
    <div className="passport-recognition-modal-overlay" onClick={handleReject} role="presentation">
      <div
        className="passport-recognition-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="passport-recognition-title"
      >
        <button
          type="button"
          className="passport-recognition-modal__close"
          onClick={handleReject}
          aria-label={t('buyerData_cancel')}
          disabled={isSaving}
        >
          <FiX size={20} />
        </button>

        <div className="passport-recognition-modal__content">
          <p className="passport-recognition-modal__eyebrow">{t('buyerData_passportConfirmEyebrow')}</p>
          <h2 id="passport-recognition-title" className="passport-recognition-modal__title">
            {t('buyerData_passportConfirmTitle')}
          </h2>
          <p className="passport-recognition-modal__text">{t('buyerData_passportConfirmText')}</p>
          {metaBits ? <p className="passport-recognition-modal__meta">{metaBits}</p> : null}

          <div className="passport-recognition-modal__data-preview">
            {fields.map((item) => {
              const inputId = `${formId}-${item.key}`
              return (
                <label key={item.key} className="data-preview-item" htmlFor={inputId}>
                  <span className="data-label">{t(item.labelKey)}</span>
                  <input
                    id={inputId}
                    className="passport-recognition-modal__input"
                    type="text"
                    value={draft[item.key] || ''}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    autoComplete={item.autoComplete}
                    spellCheck={false}
                    disabled={isSaving}
                  />
                </label>
              )
            })}
          </div>

          <p className="passport-recognition-modal__question">{t('buyerData_passportConfirmQuestion')}</p>

          <div className="passport-recognition-modal__buttons">
            <button
              type="button"
              className="passport-recognition-modal__button passport-recognition-modal__button--primary"
              onClick={handleConfirm}
              disabled={isSaving || !hasAnyValue}
            >
              {isSaving ? <span className="passport-recognition-modal__spinner" aria-hidden /> : null}
              {isSaving ? t('buyerData_saveInProgress') : t('buyerData_passportConfirmYes')}
            </button>
            <button
              type="button"
              className="passport-recognition-modal__button passport-recognition-modal__button--secondary"
              onClick={handleReject}
              disabled={isSaving}
            >
              {t('buyerData_passportConfirmNo')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default PassportRecognitionModal
