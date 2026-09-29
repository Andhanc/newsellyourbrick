import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, History, Plus, Download } from 'lucide-react'
import AuctionBidDrawer from '../../components/AuctionBidDrawer'
import { requestOpenLoginModal } from '../../utils/requestOpenLoginModal'
import { dealApi, downloadProjectDocument, uploadProjectDocument } from './api'
import './DevelopmentProjectResources.css'

export default function DevelopmentProjectResources({ project, owner, onChange }) {
  const { t, i18n } = useTranslation()
  const [section, setSection] = useState('documents')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const documents = project.documents || []
  const history = [
    ...(project.assetHistory || []).map((item, index) => ({
      key: `asset-${index}`, at: item.at,
      title: t(`develop.model_${item.model}`), note: item.reason,
    })),
    ...(project.history || []).map((item, index) => ({
      key: `stage-${index}`, at: item.at,
      title: t(`develop.stage_${item.stage}`), note: item.note,
    })),
  ]
  const show = (event, nextSection) => {
    event.currentTarget.focus({ preventScroll: true })
    setSection(nextSection)
    setError('')
    setOpen(true)
  }
  const download = async (doc) => {
    setError('')
    setBusy(true)
    try {
      await downloadProjectDocument(project.id, doc)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const upload = async (event) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setError('')
    setBusy(true)
    try {
      await uploadProjectDocument(project.id, file)
      onChange(await dealApi(`/projects/${project.id}`))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      input.value = ''
    }
  }
  return (
    <>
      <div className="dev-resource-cards">
        {[
          { key: 'documents', Icon: FileText, count: documents.length },
          { key: 'history', Icon: History, count: history.length },
        ].map(({ key, Icon, count }) => (
          <button
            key={key}
            type="button"
            className={`dev-resource-card dev-resource-card--${key}`}
            aria-haspopup="dialog"
            onClick={(event) => show(event, key)}
          >
            <span className="dev-resource-card__heading">
              <Icon size={22} aria-hidden="true" />
              <span>{t(`develop.${key}CardTitle`)}</span>
            </span>
            <span className="dev-resource-card__plus" aria-hidden="true"><Plus size={20} /></span>
            <span className="dev-resource-card__count">{count}</span>
            <span className="dev-resource-card__caption">{t(`develop.${key}CardDescription`)}</span>
          </button>
        ))}
      </div>
      <AuctionBidDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title={t(`develop.${section}`)}
      >
        <div className="dev-feature dev-resource-drawer">
          {error && (
            <div className="dev-error" role="alert">
              <p>{t(`develop.${error}`, { defaultValue: t('develop.serverError') })}</p>
              {error === 'loginRequired' && <button className="dev-button" onClick={() => { setOpen(false); requestOpenLoginModal() }}>{t('login')}</button>}
            </div>
          )}
          {section === 'documents' ? (
            <>
              <p className="dev-muted">{t('develop.documentAccessNote')}</p>
              {!documents.length && <p>{t('develop.emptyDocuments')}</p>}
              <div className="dev-resource-drawer__files">
                {documents.map((doc) => (
                  <button className="dev-resource-file" type="button" key={doc.id} disabled={busy} onClick={() => download(doc)}>
                    <FileText size={20} aria-hidden="true" />
                    <span>{doc.name}</span>
                    <Download size={18} aria-hidden="true" />
                  </button>
                ))}
              </div>
              {owner && (
                <label className="dev-resource-drawer__upload">
                  {t('develop.uploadDocument')}
                  <input type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={upload} />
                </label>
              )}
            </>
          ) : (
            <>
              {!history.length && <p>{t('develop.emptyHistory')}</p>}
              <ol className="dev-resource-timeline">
                {history.map((item) => (
                  <li key={item.key}>
                    <time dateTime={item.at}>{new Date(item.at).toLocaleDateString(i18n.language)}</time>
                    <strong>{item.title}</strong>
                    {item.note && <p>{item.note}</p>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </AuctionBidDrawer>
    </>
  )
}
