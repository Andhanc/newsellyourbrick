import { useState, useRef, useCallback } from 'react'
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
} from 'lucide-react'
import { OAP_DOCUMENT_IMAGES } from './oapDocumentImages'
import './OwnerAddPropertyDocumentsStep.css'

const MAX_ADDITIONAL_DOCUMENTS = 5
const MAX_DOC_SIZE = 10 * 1024 * 1024
const DISPLAY_STEP = 7
const DISPLAY_TOTAL = 10

const REQUIRED_DOCS = [
  {
    key: 'ownership',
    label: 'Документ о праве собственности',
    hint: 'Подтверждает ваше право собственности на объект',
    iconTone: 'blue',
    Icon: FileText,
  },
  {
    key: 'noDebts',
    label: 'Справка об отсутствии обременений',
    hint: 'Подтверждает отсутствие залогов и ограничений',
    iconTone: 'green',
    Icon: ShieldCheck,
  },
]

const SIDEBAR_TIPS = [
  {
    tone: 'blue',
    Icon: FileText,
    title: 'Читаемые сканы',
    text: 'Загружайте PDF или чёткие фото — текст на всех страницах должен быть виден.',
  },
  {
    tone: 'green',
    Icon: CalendarCheck,
    title: 'Быстрая модерация',
    text: 'Полный пакет документов ускоряет проверку и публикацию объекта.',
  },
  {
    tone: 'purple',
    Icon: Lock,
    title: 'Конфиденциальность',
    text: 'Файлы шифруются и доступны только модераторам и проверенным покупателям.',
  },
]

function isAcceptedDocument(file) {
  return file.type === 'application/pdf' || file.type.startsWith('image/')
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export default function OwnerAddPropertyDocumentsStep({
  requiredDocuments,
  additionalDocuments,
  errors = {},
  onRequiredChange,
  onRequiredRemove,
  onAddAdditional,
  onRemoveAdditional,
}) {
  const ownershipInputRef = useRef(null)
  const noDebtsInputRef = useRef(null)
  const additionalInputRef = useRef(null)

  const [notice, setNotice] = useState('')
  const [extraDragOver, setExtraDragOver] = useState(false)

  const showNotice = useCallback((message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4000)
  }, [])

  const validateFile = useCallback(
    (file) => {
      if (!isAcceptedDocument(file)) {
        showNotice('Разрешены только PDF и изображения (JPG, PNG)')
        return false
      }
      if (file.size > MAX_DOC_SIZE) {
        showNotice(`«${file.name}» больше 10 МБ`)
        return false
      }
      return true
    },
    [showNotice]
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
        showNotice(`Максимум ${MAX_ADDITIONAL_DOCUMENTS} дополнительных документов`)
        return
      }

      const remaining = MAX_ADDITIONAL_DOCUMENTS - additionalDocuments.length
      const filesToAdd = files.slice(0, remaining)

      if (files.length > remaining) {
        showNotice(`Добавлено ${remaining} из ${files.length} — лимит ${MAX_ADDITIONAL_DOCUMENTS}`)
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
        reader.onerror = () => showNotice(`Не удалось прочитать «${file.name}»`)
        reader.readAsDataURL(file)
      })
    },
    [additionalDocuments.length, onAddAdditional, showNotice, validateFile]
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

  return (
    <section className="oap-documents-step" aria-labelledby="oap-documents-step-title">
      <div className="oap-documents-step__layout">
        <div className="oap-documents-step__main">
          <header className="oap-documents-step__page-head">
            <div className="oap-documents-step__page-head-row">
              <h2 id="oap-documents-step-title" className="oap-documents-step__title">
                Документы
              </h2>
              <span className="oap-documents-step__step-badge">
                Шаг {DISPLAY_STEP} из {DISPLAY_TOTAL}
              </span>
            </div>
            <p className="oap-documents-step__subtitle">
              Загрузите документы, подтверждающие право собственности и прозрачность сделки
            </p>
          </header>

          {notice && (
            <p className="oap-documents-step__notice" role="status">
              {notice}
            </p>
          )}

          <div className="oap-documents-step__section">
            <h3 className="oap-documents-step__section-title">Обязательные документы</h3>

            <div className="oap-documents-step__required-list">
              {REQUIRED_DOCS.map((doc) => {
                const uploaded = requiredDocuments[doc.key]
                const error = errors[doc.key]
                const DocIcon = doc.Icon

                return (
                  <article
                    key={doc.key}
                    className={`oap-documents-step__req-card${uploaded ? ' oap-documents-step__req-card--done' : ''}${error ? ' oap-documents-step__req-card--error' : ''}`}
                  >
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
                              {formatFileSize(uploaded.file?.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="oap-documents-step__req-file-remove"
                            aria-label={`Удалить ${doc.label}`}
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
                            Загрузить файл
                          </button>
                          <p className="oap-documents-step__formats">PDF, JPG, PNG до 10 МБ</p>
                        </>
                      )}
                      {error && <p className="oap-documents-step__error">{error}</p>}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="oap-documents-step__section">
            <h3 className="oap-documents-step__section-title">
              Дополнительные документы
              <span className="oap-documents-step__optional-mark"> (необязательно)</span>
            </h3>
            <p className="oap-documents-step__section-desc">
              Вы можете загрузить до {MAX_ADDITIONAL_DOCUMENTS} дополнительных документов
            </p>

            <input
              ref={additionalInputRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="oap-documents-step__file-input"
              onChange={handleAdditionalUpload}
            />

            <div
              className={`oap-documents-step__slots${extraDragOver ? ' oap-documents-step__slots--drag' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                if (!extraFull) setExtraDragOver(true)
              }}
              onDragLeave={() => setExtraDragOver(false)}
              onDrop={handleExtraDrop}
            >
              {Array.from({ length: MAX_ADDITIONAL_DOCUMENTS }).map((_, index) => {
                const doc = additionalDocuments[index]
                if (doc) {
                  return (
                    <div key={doc.id} className="oap-documents-step__slot oap-documents-step__slot--filled">
                      <button
                        type="button"
                        className="oap-documents-step__slot-remove"
                        aria-label={`Удалить ${doc.name}`}
                        onClick={() => onRemoveAdditional(doc.id)}
                      >
                        <X size={12} />
                      </button>
                      <span
                        className={`oap-documents-step__file-badge oap-documents-step__file-badge--${doc.type} oap-documents-step__file-badge--slot`}
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
                      <span className="oap-documents-step__slot-name" title={doc.name}>
                        {doc.name}
                      </span>
                      <span className="oap-documents-step__slot-size">
                        {formatFileSize(doc.file?.size)}
                      </span>
                    </div>
                  )
                }

                return (
                  <button
                    key={`empty-${index}`}
                    type="button"
                    className="oap-documents-step__slot oap-documents-step__slot--empty"
                    onClick={() => additionalInputRef.current?.click()}
                    disabled={extraFull}
                    aria-label={`Добавить документ ${index + 1}`}
                  >
                    <span className="oap-documents-step__slot-add-icon" aria-hidden>
                      <Plus size={22} strokeWidth={2} />
                    </span>
                    <span className="oap-documents-step__slot-add-label">Добавить документ</span>
                  </button>
                )
              })}
            </div>

            <p className="oap-documents-step__formats oap-documents-step__formats--block">
              PDF, JPG, PNG до 10 МБ на файл
            </p>
          </div>
        </div>

        <aside className="oap-documents-step__sidebar" aria-label="Подсказки и помощь">
          <div className="oap-documents-step__sidebar-hero">
            <img
              src={OAP_DOCUMENT_IMAGES.sidebarHero}
              alt=""
              className="oap-documents-step__sidebar-img"
            />
          </div>

          <div className="oap-documents-step__tips">
            <h3 className="oap-documents-step__tips-title">Подсказки</h3>
            <ul className="oap-documents-step__tips-list">
              {SIDEBAR_TIPS.map((tip) => {
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
            <h3 className="oap-documents-step__help-title">Нужна помощь?</h3>
            <p className="oap-documents-step__help-text">
              Если возникли вопросы по документам или загрузке файлов — напишите в поддержку.
            </p>
            <button type="button" className="oap-documents-step__help-btn">
              <Headphones size={16} aria-hidden />
              Связаться с поддержкой
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}
