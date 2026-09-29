import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Presentation, Upload, X } from 'lucide-react'
import { readDocumentDataUrl, validatePresentation } from '../utils/propertyPresentation'
import './PropertyPresentationUpload.css'

export default function PropertyPresentationUpload({ document, onChange, onRemove }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const validationError = validatePresentation(file)
    setError(validationError ? t(validationError) : '')
    if (validationError) return
    setLoading(true)
    try {
      const url = await readDocumentDataUrl(file)
      onChange({ id: `presentation-${Date.now()}`, name: file.name, file, url, type: 'pdf', kind: 'presentation' })
    } catch {
      setError(t('oap_fileReadError', { name: file.name }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="property-presentation-upload">
      <div className="property-presentation-upload__heading">
        <span className="property-presentation-upload__icon" aria-hidden><Presentation size={24} /></span>
        <div>
          <h3>{t('propertyPresentationTitle')}</h3>
          <span className="property-presentation-upload__optional">{t('oap_docsOptionalMark')}</span>
        </div>
      </div>
      <p className="property-presentation-upload__hint">{t('propertyPresentationHint')}</p>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={upload} hidden aria-label={t('propertyPresentationUpload')} />
      {document && (
        <div className="property-presentation-upload__file">
          <span className="property-presentation-upload__format">PDF</span>
          <span className="property-presentation-upload__filename" title={document.name}>{document.name}</span>
          <button type="button" disabled={loading} onClick={onRemove} aria-label={t('oap_docsRemoveDoc', { name: t('propertyPresentationTitle') })}><X size={18} /></button>
        </div>
      )}
      <div className="property-presentation-upload__actions">
        <button type="button" className="property-presentation-upload__button" disabled={loading} onClick={() => inputRef.current?.click()}>
          <Upload size={17} aria-hidden />
          {t(loading ? 'propertyPresentationLoading' : document ? 'propertyPresentationReplace' : 'propertyPresentationUpload')}
        </button>
        <span className="property-presentation-upload__formats">{t('propertyPresentationFormats')}</span>
      </div>
      {error && <p className="property-presentation-upload__error" role="alert">{error}</p>}
    </section>
  )
}
