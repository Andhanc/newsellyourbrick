import { useState, useRef, useCallback } from 'react'
import {
  FileText,
  Upload,
  X,
  Check,
  FileCheck2,
  ShieldCheck,
  ScrollText,
  CloudUpload,
  Plus,
} from 'lucide-react'

const MAX_ADDITIONAL_DOCUMENTS = 5
const MAX_DOC_SIZE = 10 * 1024 * 1024

const REQUIRED_DOCS = [
  {
    key: 'ownership',
    label: 'Документ собственности',
    hint: 'Подтверждает право собственности на объект',
    Icon: ScrollText,
  },
  {
    key: 'noDebts',
    label: 'Справка об отсутствии обременений',
    hint: 'Об отсутствии залогов и ограничений',
    Icon: ShieldCheck,
  },
]

function isAcceptedDocument(file) {
  return file.type === 'application/pdf' || file.type.startsWith('image/')
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

  const requiredCount = REQUIRED_DOCS.filter((doc) => requiredDocuments[doc.key]).length
  const inputRefs = {
    ownership: ownershipInputRef,
    noDebts: noDebtsInputRef,
  }
  const extraFull = additionalDocuments.length >= MAX_ADDITIONAL_DOCUMENTS

  return (
    <section className="oap-documents-step" aria-labelledby="oap-documents-step-title">
      <header className="oap-documents-step__head">
        <span className="oap-documents-step__badge" aria-hidden>
          <FileCheck2 size={18} strokeWidth={1.85} />
        </span>
        <div className="oap-documents-step__head-text">
          <h2 id="oap-documents-step-title" className="oap-documents-step__title">
            Документы
          </h2>
          <p className="oap-documents-step__subtitle">
            Загрузите необходимые документы для публикации объекта
          </p>
        </div>
        <span
          className={`oap-documents-step__counter${requiredCount === 2 ? ' oap-documents-step__counter--done' : ''}`}
        >
          <Check size={13} aria-hidden />
          {requiredCount}/2
        </span>
      </header>

      {notice && (
        <p className="oap-documents-step__notice" role="status">
          {notice}
        </p>
      )}

      <div className="oap-documents-step__card">
        <h3 className="oap-documents-step__section-title">Основные документы</h3>

        <div className="oap-documents-step__main-grid">
          {REQUIRED_DOCS.map((doc) => {
            const uploaded = requiredDocuments[doc.key]
            const error = errors[doc.key]
            const DocIcon = doc.Icon

            return (
              <article
                key={doc.key}
                className={`oap-documents-step__main-card${uploaded ? ' oap-documents-step__main-card--done' : ''}${error ? ' oap-documents-step__main-card--error' : ''}`}
              >
                <span className="oap-documents-step__main-icon" aria-hidden>
                  <DocIcon size={20} strokeWidth={1.75} />
                </span>

                <h4 className="oap-documents-step__main-title">
                  {doc.label}
                  <span className="oap-documents-step__required-mark">*</span>
                </h4>
                <p className="oap-documents-step__main-hint">{doc.hint}</p>

                <input
                  ref={inputRefs[doc.key]}
                  type="file"
                  accept="application/pdf,image/*"
                  className="oap-documents-step__file-input"
                  onChange={(e) => handleRequiredUpload(doc.key, e)}
                />

                {uploaded ? (
                  <div className="oap-documents-step__main-file">
                    {uploaded.preview ? (
                      <img src={uploaded.preview} alt="" className="oap-documents-step__main-file-thumb" />
                    ) : (
                      <span className="oap-documents-step__main-file-thumb oap-documents-step__main-file-thumb--pdf">
                        <FileText size={14} aria-hidden />
                      </span>
                    )}
                    <span className="oap-documents-step__main-file-name" title={uploaded.name}>
                      {uploaded.name}
                    </span>
                    <button
                      type="button"
                      className="oap-documents-step__main-file-remove"
                      aria-label={`Удалить ${doc.label}`}
                      onClick={() => onRequiredRemove(doc.key)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="oap-documents-step__main-btn"
                    onClick={() => inputRefs[doc.key].current?.click()}
                  >
                    Загрузить документ
                  </button>
                )}

                <p className="oap-documents-step__formats">PDF, JPG, PNG до 10 МБ</p>
                {error && <p className="oap-documents-step__error">{error}</p>}
              </article>
            )
          })}
        </div>

        <div className="oap-documents-step__extra">
          <div className="oap-documents-step__extra-head">
            <h3 className="oap-documents-step__extra-title">
              Дополнительные документы
              <span className="oap-documents-step__extra-optional"> (необязательно)</span>
            </h3>
            <span className="oap-documents-step__extra-count">
              Загружено {additionalDocuments.length} из {MAX_ADDITIONAL_DOCUMENTS}
            </span>
          </div>

          <div
            className={`oap-documents-step__extra-drop${extraDragOver ? ' oap-documents-step__extra-drop--drag' : ''}${extraFull ? ' oap-documents-step__extra-drop--full' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              if (!extraFull) setExtraDragOver(true)
            }}
            onDragLeave={() => setExtraDragOver(false)}
            onDrop={handleExtraDrop}
          >
            <CloudUpload size={18} strokeWidth={1.75} aria-hidden />
            <p className="oap-documents-step__extra-drop-text">
              Перетащите файлы сюда или{' '}
              <button
                type="button"
                className="oap-documents-step__extra-drop-btn"
                onClick={() => additionalInputRef.current?.click()}
                disabled={extraFull}
              >
                выбрать файлы
              </button>
            </p>
            <p className="oap-documents-step__formats oap-documents-step__formats--center">
              PDF, JPG, PNG до 10 МБ каждый
            </p>
          </div>

          <input
            ref={additionalInputRef}
            type="file"
            accept="application/pdf,image/*"
            multiple
            className="oap-documents-step__file-input"
            onChange={handleAdditionalUpload}
          />

          <div className="oap-documents-step__slots">
            {Array.from({ length: MAX_ADDITIONAL_DOCUMENTS }).map((_, index) => {
              const doc = additionalDocuments[index]
              if (doc) {
                return (
                  <div key={doc.id} className="oap-documents-step__slot oap-documents-step__slot--filled">
                    {doc.type === 'image' && doc.url ? (
                      <img src={doc.url} alt="" className="oap-documents-step__slot-preview" />
                    ) : (
                      <FileText size={18} aria-hidden />
                    )}
                    <span className="oap-documents-step__slot-name" title={doc.name}>
                      {doc.name}
                    </span>
                    <button
                      type="button"
                      className="oap-documents-step__slot-remove"
                      aria-label={`Удалить ${doc.name}`}
                      onClick={() => onRemoveAdditional(doc.id)}
                    >
                      <X size={12} />
                    </button>
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
                  <FileText size={16} aria-hidden />
                  <span className="oap-documents-step__slot-plus">
                    <Plus size={10} strokeWidth={3} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
