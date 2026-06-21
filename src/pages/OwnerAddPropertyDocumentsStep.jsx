import { useState, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  FileText,
  CloudUpload,
  X,
  Plus,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  CalendarCheck,
  Headphones,
  AlertCircle,
  Files,
} from 'lucide-react'
import OapWizardSidebarImage from '../components/OapWizardSidebarImage'
import { OAP_DOCUMENT_IMAGES } from './oapDocumentImages'
import './OwnerAddPropertyDocumentsStep.css'

const MAX_ADDITIONAL_DOCUMENTS = 5
const MAX_DOC_SIZE = 10 * 1024 * 1024
const DISPLAY_STEP = 7
const DISPLAY_TOTAL = 10

const DEBT_RECOMMENDED_LABEL_KEYS = [
  'oap_documentsDebtCreditContract',
  'oap_documentsDebtMortgage',
  'oap_documentsDebtRegistry',
  'oap_documentsDebtAmount',
  'oap_documentsDebtValuation',
  'oap_documentsDebtCourtStatus',
]

function isDebtListingMode(listingMode) {
  return listingMode === 'debt' || listingMode === 'debt_auction'
}

function DocumentsSectionHead({ number, title, hint, badge }) {
  return (
    <header className="oap-documents-step__section-head oap-documents-step__section-head--numbered">
      <span className="oap-documents-step__section-num" aria-hidden>
        {String(number).padStart(2, '0')}
      </span>
      <div className="oap-documents-step__section-meta">
        <div className="oap-documents-step__section-title-row">
          <h3 className="oap-documents-step__section-title">{title}</h3>
          {badge}
        </div>
        {hint ? <p className="oap-documents-step__section-desc">{hint}</p> : null}
      </div>
    </header>
  )
}

function isAcceptedDocument(file) {
  return file.type === 'application/pdf' || file.type.startsWith('image/')
}

function formatFileSize(bytes, t) {
  if (!bytes) return ''
  if (bytes < 1024) return t('oap_fileSizeB', { size: bytes })
  if (bytes < 1024 * 1024) {
    return t('oap_fileSizeKB', { size: (bytes / 1024).toFixed(1) })
  }
  return t('oap_fileSizeMB', { size: (bytes / (1024 * 1024)).toFixed(1) })
}

function DocumentsJourneyGroupTitle({ title, optional = false }) {
  const { t } = useTranslation()

  return (
    <h3 className="oap-documents-step__journey-group-title">
      {title}
      {optional ? (
        <span className="oap-documents-step__optional-mark"> {t('oap_docsOptionalMark')}</span>
      ) : null}
    </h3>
  )
}

function DocumentsContent({
  embedded = false,
  journeyLayout = false,
  listingMode,
  requiredDocuments,
  additionalDocuments,
  errors = {},
  onRequiredChange,
  onRequiredRemove,
  onAddAdditional,
  onRemoveAdditional,
}) {
  const { t } = useTranslation()

  const standardRequiredDocs = useMemo(
    () => [
      {
        key: 'ownership',
        label: t('oap_documentsOwnership'),
        hint: t('oap_documentsOwnershipHint'),
        iconTone: 'tiffany',
        Icon: FileText,
      },
      {
        key: 'noDebts',
        label: t('oap_documentsNoEncumbrance'),
        hint: t('oap_documentsNoEncumbranceHint'),
        iconTone: 'tiffany-soft',
        Icon: ShieldCheck,
      },
    ],
    [t],
  )

  const ownershipInputRef = useRef(null)
  const noDebtsInputRef = useRef(null)
  const additionalInputRef = useRef(null)

  const [notice, setNotice] = useState('')
  const [extraDragOver, setExtraDragOver] = useState(false)

  const isDebtListing = isDebtListingMode(listingMode)
  const requiredDocs = isDebtListing ? [] : standardRequiredDocs

  const showNotice = useCallback((message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4000)
  }, [])

  const validateFile = useCallback(
    (file) => {
      if (!isAcceptedDocument(file)) {
        showNotice(t('oap_documentsPdfOnly'))
        return false
      }
      if (file.size > MAX_DOC_SIZE) {
        showNotice(t('oap_fileTooLarge', { name: file.name }))
        return false
      }
      return true
    },
    [showNotice, t]
  )

  const handleRequiredUpload = useCallback(
    (key, e) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!validateFile(file)) {
        e.target.value = ''
        return
      }

      const isImage = file.type.startsWith('image/')
      onRequiredChange(key, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        file,
        type: isImage ? 'image' : 'pdf',
        preview: isImage ? URL.createObjectURL(file) : '',
      })
      e.target.value = ''
    },
    [onRequiredChange, validateFile]
  )

  const processAdditionalFiles = useCallback(
    (files) => {
      if (!files.length) return

      if (additionalDocuments.length >= MAX_ADDITIONAL_DOCUMENTS) {
        showNotice(t('oap_docsMaxAdditional', { count: MAX_ADDITIONAL_DOCUMENTS }))
        return
      }

      const remaining = MAX_ADDITIONAL_DOCUMENTS - additionalDocuments.length
      const filesToAdd = files.slice(0, remaining)

      if (files.length > remaining) {
        showNotice(
          t('oap_docsAddedPartial', {
            added: remaining,
            total: files.length,
            max: MAX_ADDITIONAL_DOCUMENTS,
          })
        )
      }

      filesToAdd.forEach((file) => {
        if (!validateFile(file)) return

        const isImage = file.type.startsWith('image/')
        const reader = new FileReader()
        reader.onloadend = () => {
          onAddAdditional({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            file,
            type: isImage ? 'image' : 'pdf',
            url: reader.result,
          })
        }
        reader.onerror = () => showNotice(t('oap_fileReadError', { name: file.name }))
        reader.readAsDataURL(file)
      })
    },
    [additionalDocuments.length, onAddAdditional, showNotice, validateFile, t]
  )

  const handleAdditionalUpload = useCallback(
    (e) => {
      processAdditionalFiles(Array.from(e.target.files || []))
      e.target.value = ''
    },
    [processAdditionalFiles]
  )

  const handleExtraDrop = useCallback(
    (e) => {
      e.preventDefault()
      setExtraDragOver(false)
      if (additionalDocuments.length >= MAX_ADDITIONAL_DOCUMENTS) return
      processAdditionalFiles(Array.from(e.dataTransfer.files || []))
    },
    [additionalDocuments.length, processAdditionalFiles]
  )

  const inputRefs = {
    ownership: ownershipInputRef,
    noDebts: noDebtsInputRef,
  }
  const extraFull = additionalDocuments.length >= MAX_ADDITIONAL_DOCUMENTS

  const requiredSectionNumber = 1
  const additionalSectionNumber = 2
  const useSectionCard = embedded && !journeyLayout

  const additionalSection = (
    <div className={`oap-documents-step__section oap-documents-step__section--additional${useSectionCard ? ' oap-documents-step__card' : ''}`}>
      {journeyLayout ? (
        <DocumentsJourneyGroupTitle
          title={t('oap_documentsAdditionalTitle')}
          optional={!isDebtListing}
        />
      ) : embedded ? (
        <DocumentsSectionHead
          number={additionalSectionNumber}
          title={t('oap_documentsAdditionalTitle')}
          hint={
            isDebtListing
              ? t('oap_documentsDebtAdditionalHint')
              : t('oap_documentsAdditionalHint')
          }
        />
      ) : (
        <>
          <div className="oap-documents-step__section-head">
            <h3 className="oap-documents-step__section-title">
              {t('oap_documentsAdditionalTitle')}
              {!isDebtListing && (
                <span className="oap-documents-step__optional-mark">
                  {' '}
                  {t('oap_docsOptionalMark')}
                </span>
              )}
            </h3>
          </div>
          <p className="oap-documents-step__section-desc">
            {isDebtListing
              ? t('oap_documentsDebtAdditionalHint')
              : t('oap_documentsAdditionalHint')}
          </p>
        </>
      )}

      <input
        ref={additionalInputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="oap-documents-step__file-input"
        onChange={handleAdditionalUpload}
      />

      <div
        className={`oap-documents-step__gallery-row${extraDragOver ? ' oap-documents-step__gallery-row--drag' : ''}${embedded ? ' oap-documents-step__gallery-row--embedded' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!extraFull) setExtraDragOver(true)
        }}
        onDragLeave={() => setExtraDragOver(false)}
        onDrop={handleExtraDrop}
      >
        {!extraFull && (
          <button
            type="button"
            className="oap-documents-step__gallery-add"
            onClick={() => additionalInputRef.current?.click()}
            aria-label={t('oap_documentsAddDoc')}
          >
            <span className="oap-documents-step__gallery-add-icon" aria-hidden>
              <Plus size={embedded ? 20 : 22} strokeWidth={2} />
            </span>
            <span className="oap-documents-step__gallery-add-label">
              {embedded ? (
                <>
                  <span className="oap-documents-step__gallery-add-label-full">
                    {t('oap_documentsAddDoc')}
                  </span>
                  <span className="oap-documents-step__gallery-add-label-short" aria-hidden>
                    {t('oap_add')}
                  </span>
                </>
              ) : (
                t('oap_documentsAddDoc')
              )}
            </span>
          </button>
        )}

        {additionalDocuments.length > 0 && (
          <div className="oap-documents-step__gallery-track">
            {additionalDocuments.map((doc) => (
              <div key={doc.id} className="oap-documents-step__gallery-item">
                <button
                  type="button"
                  className="oap-documents-step__gallery-remove"
                  aria-label={t('oap_docsRemoveDoc', { name: doc.name })}
                  onClick={() => onRemoveAdditional(doc.id)}
                >
                  <X size={12} />
                </button>
                <span
                  className={`oap-documents-step__file-badge oap-documents-step__file-badge--${doc.type} oap-documents-step__file-badge--gallery`}
                  aria-hidden
                >
                  {doc.type === 'image' ? (
                    <>
                      <ImageIcon size={18} />
                      <span>IMG</span>
                    </>
                  ) : (
                    <>
                      <FileText size={18} />
                      <span>PDF</span>
                    </>
                  )}
                </span>
                <span className="oap-documents-step__gallery-name" title={doc.name}>
                  {doc.name}
                </span>
                <span className="oap-documents-step__gallery-size">
                  {formatFileSize(doc.file?.size, t)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="oap-documents-step__upload-note" role="note">
        <span className="oap-documents-step__upload-note-icon" aria-hidden>
          <Files size={16} strokeWidth={1.85} />
        </span>
        <p className="oap-documents-step__upload-note-text">
          {isDebtListing
            ? t('oap_docsMaxDebtFilesHint', { count: MAX_ADDITIONAL_DOCUMENTS })
            : t('oap_docsMaxFilesHint', { count: MAX_ADDITIONAL_DOCUMENTS })}
        </p>
      </div>
    </div>
  )

  const securityBanner = embedded && (
    journeyLayout ? (
      <div className="oap-documents-step__security" role="note">
        <span className="oap-documents-step__security-icon" aria-hidden>
          <Lock size={18} strokeWidth={1.85} />
        </span>
        <div>
          <strong className="oap-documents-step__security-title">{t('oap_docsSecurityTitle')}</strong>
          <p className="oap-documents-step__security-text">{t('oap_docsSecurityText')}</p>
        </div>
      </div>
    ) : (
      <div className="oap-documents-step__card oap-documents-step__card--security">
        <div className="oap-documents-step__security" role="note">
          <span className="oap-documents-step__security-icon" aria-hidden>
            <Lock size={18} strokeWidth={1.85} />
          </span>
          <div>
            <strong className="oap-documents-step__security-title">{t('oap_docsSecurityTitle')}</strong>
            <p className="oap-documents-step__security-text">{t('oap_docsSecurityText')}</p>
          </div>
        </div>
      </div>
    )
  )

  const body = (
    <>
      {notice && (
        <p className="oap-documents-step__notice" role="status">
          {notice}
        </p>
      )}

      {isDebtListing ? (
        <div className={`oap-documents-step__section oap-documents-step__section--debt${useSectionCard ? ' oap-documents-step__card' : ''}`}>
          {journeyLayout ? (
            <DocumentsJourneyGroupTitle title={t('oap_documentsDebtPackTitle')} />
          ) : embedded ? (
            <DocumentsSectionHead
              number={requiredSectionNumber}
              title={t('oap_documentsDebtPackTitle')}
              hint={t('oap_documentsDebtPackHint')}
            />
          ) : (
            <h3 className="oap-documents-step__section-title">{t('oap_documentsDebtPackTitle')}</h3>
          )}
          <div className="oap-documents-step__debt-note" role="note">
            <span className="oap-documents-step__debt-note-icon" aria-hidden>
              <AlertCircle size={18} strokeWidth={1.85} />
            </span>
            <div>
              <p className="oap-documents-step__debt-note-text">
                {t('oap_documentsDebtModeRequired', {
                  mode:
                    listingMode === 'debt_auction'
                      ? t('oap_documentsDebtModeDebtAuction')
                      : t('oap_documentsDebtModeDebt'),
                })}
              </p>
              <ul className="oap-documents-step__debt-note-list">
                {DEBT_RECOMMENDED_LABEL_KEYS.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className={`oap-documents-step__section oap-documents-step__section--required${useSectionCard ? ' oap-documents-step__card' : ''}`}>
          {journeyLayout ? (
            <DocumentsJourneyGroupTitle title={t('oap_documentsRequiredTitle')} />
          ) : embedded ? (
            <DocumentsSectionHead
              number={requiredSectionNumber}
              title={t('oap_documentsRequiredTitle')}
              hint={t('oap_documentsRequiredHint')}
            />
          ) : (
            <h3 className="oap-documents-step__section-title">{t('oap_documentsRequiredTitle')}</h3>
          )}

          <div className="oap-documents-step__required-list">
            {requiredDocs.map((doc) => {
              const uploaded = requiredDocuments[doc.key]
              const error = errors[doc.key]
              const DocIcon = doc.Icon

              return (
                <article
                  key={doc.key}
                  className={`oap-documents-step__req-card${uploaded ? ' oap-documents-step__req-card--done' : ''}${error ? ' oap-documents-step__req-card--error' : ''}`}
                >
                  <div className="oap-documents-step__req-top">
                    <span
                      className={`oap-documents-step__req-icon oap-documents-step__req-icon--${doc.iconTone}`}
                      aria-hidden
                    >
                      <DocIcon size={22} strokeWidth={1.75} />
                    </span>

                    <div className="oap-documents-step__req-content">
                      <h4 className="oap-documents-step__req-title">
                        {doc.label}
                        <span className="oap-documents-step__required-mark">*</span>
                      </h4>
                      <p className="oap-documents-step__req-hint">{doc.hint}</p>
                    </div>
                  </div>

                  <div className="oap-documents-step__req-action">
                    <input
                      ref={inputRefs[doc.key]}
                      type="file"
                      accept="application/pdf,image/*"
                      className="oap-documents-step__file-input"
                      onChange={(e) => handleRequiredUpload(doc.key, e)}
                    />

                    {uploaded ? (
                      <div className="oap-documents-step__req-file">
                        <span
                          className={`oap-documents-step__file-badge oap-documents-step__file-badge--${uploaded.type}`}
                          aria-hidden
                        >
                          {uploaded.type === 'image' ? (
                            <>
                              <ImageIcon size={15} />
                              <span>IMG</span>
                            </>
                          ) : (
                            <>
                              <FileText size={15} />
                              <span>PDF</span>
                            </>
                          )}
                        </span>
                        <div className="oap-documents-step__req-file-meta">
                          <span className="oap-documents-step__req-file-name" title={uploaded.name}>
                            {uploaded.name}
                          </span>
                          <span className="oap-documents-step__req-file-size">
                            {formatFileSize(uploaded.file?.size, t)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="oap-documents-step__req-file-remove"
                          aria-label={t('oap_docsRemoveDoc', { name: doc.label })}
                          onClick={() => onRequiredRemove(doc.key)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="oap-documents-step__upload-btn"
                          onClick={() => inputRefs[doc.key].current?.click()}
                        >
                          <CloudUpload size={16} aria-hidden />
                          {t('oap_docsUploadFile')}
                        </button>
                        <p className="oap-documents-step__formats">{t('oap_docsFormats')}</p>
                      </>
                    )}
                    {error && <p className="oap-documents-step__error">{error}</p>}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {additionalSection}
      {securityBanner}
    </>
  )

  if (embedded) {
    return (
      <div
        className={`oap-documents-step oap-documents-step--embedded${journeyLayout ? ' oap-documents-step--journey' : ''}`}
      >
        {body}
      </div>
    )
  }

  return body
}

export default function OwnerAddPropertyDocumentsStep(props) {
  const { t } = useTranslation()
  const { embedded = false, ...contentProps } = props

  const sidebarTips = useMemo(
    () => [
      {
        tone: 'tiffany',
        Icon: FileText,
        title: t('oap_documentsTipScansTitle'),
        text: t('oap_documentsTipScansText'),
      },
      {
        tone: 'tiffany-soft',
        Icon: CalendarCheck,
        title: t('oap_documentsTipModerationTitle'),
        text: t('oap_documentsTipModerationText'),
      },
      {
        tone: 'tiffany-muted',
        Icon: Lock,
        title: t('oap_documentsTipPrivacyTitle'),
        text: t('oap_documentsTipPrivacyText'),
      },
    ],
    [t],
  )

  if (embedded) {
    return <DocumentsContent embedded journeyLayout={props.journeyLayout} {...contentProps} />
  }

  return (
    <section className="oap-documents-step" aria-labelledby="oap-documents-step-title">
      <div className="oap-documents-step__layout">
        <div className="oap-documents-step__main">
          <header className="oap-documents-step__page-head">
            <div className="oap-documents-step__page-head-row">
              <h2 id="oap-documents-step-title" className="oap-documents-step__title">
                {t('oap_documentsVerificationTitle')}
              </h2>
              <span className="oap-documents-step__step-badge">
                {t('oap_wizardStepBadge', { current: DISPLAY_STEP, total: DISPLAY_TOTAL })}
              </span>
            </div>
            <p className="oap-documents-step__subtitle">{t('oap_documentsVerificationSubtitle')}</p>
          </header>

          <DocumentsContent {...contentProps} />
        </div>

        <aside className="oap-documents-step__sidebar" aria-label={t('oap_wizardTipsTitle')}>
          <div className="oap-documents-step__sidebar-hero">
            <OapWizardSidebarImage
              src={OAP_DOCUMENT_IMAGES.sidebarHero}
              className="oap-documents-step__sidebar-img"
            />
          </div>

          <div className="oap-documents-step__tips">
            <h3 className="oap-documents-step__tips-title">{t('oap_wizardTipsTitle')}</h3>
            <ul className="oap-documents-step__tips-list">
              {sidebarTips.map((tip) => {
                const TipIcon = tip.Icon
                return (
                  <li key={tip.title} className="oap-documents-step__tip-item">
                    <span
                      className={`oap-documents-step__tip-icon oap-documents-step__tip-icon--${tip.tone}`}
                      aria-hidden
                    >
                      <TipIcon size={16} strokeWidth={1.75} />
                    </span>
                    <div>
                      <strong>{tip.title}</strong>
                      <p>{tip.text}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="oap-documents-step__help">
            <h3 className="oap-documents-step__help-title">{t('oap_wizardSupportTitle')}</h3>
            <p className="oap-documents-step__help-text">{t('oap_wizardSupportText')}</p>
            <Link to="/chat?manager=1" className="oap-documents-step__help-btn">
              <Headphones size={16} aria-hidden />
              {t('oap_wizardSupportBtn')}
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}
