import { useState } from 'react'
import { FiX, FiLoader } from 'react-icons/fi'
import { generateNewsDraft, publishNewsDraft } from '@/services/newsApi'
import NewsArticleMeta from './NewsArticleMeta'
import NewsArticleBody from './NewsArticleBody'
import './GenerateNewsModal.css'

export default function GenerateNewsModal({ open, onClose, onPublished }) {
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState(null)
  const [step, setStep] = useState('prompt')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const reset = () => {
    setPrompt('')
    setDraft(null)
    setStep('prompt')
    setError('')
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleGenerate = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await generateNewsDraft(prompt)
      setDraft(result)
      setStep('preview')
    } catch (e) {
      const raw = e?.message || 'Ошибка генерации'
      const friendly =
        raw === 'SESSION_EXPIRED'
          ? 'Сессия истекла — войдите снова'
          : /aborted|timeout|timed out/i.test(raw)
            ? 'Генерация заняла слишком много времени. Сократите промпт или подождите ~15 сек и нажмите «Сгенерировать» снова.'
            : /JSON|json/i.test(raw)
              ? 'Ошибка формата ответа AI. В промпте укажите только тему статьи (2–5 предложений), без технических инструкций про фото — и повторите.'
              : raw
      setError(friendly)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!draft) return
    setError('')
    setLoading(true)
    try {
      const article = await publishNewsDraft(draft)
      onPublished?.(article)
      handleClose()
    } catch (e) {
      setError(e?.message === 'SESSION_EXPIRED' ? 'Сессия истекла — войдите снова' : e?.message || 'Ошибка публикации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gen-news-modal-overlay" role="presentation" onClick={handleClose}>
      <div
        className="gen-news-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gen-news-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="gen-news-modal__close"
          onClick={handleClose}
          aria-label="Закрыть"
        >
          <FiX size={22} />
        </button>

        <h2 id="gen-news-modal-title" className="gen-news-modal__title">
          {step === 'preview' ? 'Предпросмотр новости' : 'Сгенерировать новость'}
        </h2>

        {error ? <p className="gen-news-modal__error">{error}</p> : null}

        {step === 'prompt' ? (
          <>
            <label className="gen-news-modal__label" htmlFor="gen-news-prompt">
              Промпт для ИИ
            </label>
            <textarea
              id="gen-news-prompt"
              className="gen-news-modal__textarea"
              rows={6}
              placeholder="Кратко опишите тему (2–5 предложений). Длинные инструкции замедляют генерацию."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            {loading ? (
              <p className="gen-news-modal__hint">Генерация может занять 1–3 минуты, не закрывайте окно…</p>
            ) : null}
            <div className="gen-news-modal__actions">
              <button type="button" className="gen-news-modal__btn gen-news-modal__btn--ghost" onClick={handleClose}>
                Отмена
              </button>
              <button
                type="button"
                className="gen-news-modal__btn gen-news-modal__btn--primary"
                onClick={handleGenerate}
                disabled={loading || prompt.trim().length < 8}
              >
                {loading ? <FiLoader className="gen-news-modal__spin" size={18} /> : null}
                {loading ? 'Генерация…' : 'Сгенерировать'}
              </button>
            </div>
          </>
        ) : (
          <div className="gen-news-modal__preview">
            <div className="gen-news-modal__preview-image-wrap">
              <img src={draft?.image} alt="" className="gen-news-modal__preview-image" />
              <span className="gen-news-modal__preview-badge">{draft?.badge}</span>
            </div>
            <h3 className="gen-news-modal__preview-title">{draft?.title}</h3>
            <p className="gen-news-modal__preview-lead">{draft?.lead}</p>
            <NewsArticleMeta
              date="сегодня"
              views={0}
              comments={0}
              likes={0}
            />
            <p className="gen-news-modal__preview-excerpt">
              <strong>Карточка:</strong> {draft?.excerpt}
            </p>
            <div className="gen-news-modal__preview-body">
              <NewsArticleBody body={draft?.body} />
            </div>
            <div className="gen-news-modal__actions">
              <button
                type="button"
                className="gen-news-modal__btn gen-news-modal__btn--ghost"
                onClick={() => setStep('prompt')}
                disabled={loading}
              >
                Изменить промпт
              </button>
              <button
                type="button"
                className="gen-news-modal__btn gen-news-modal__btn--primary"
                onClick={handlePublish}
                disabled={loading}
              >
                {loading ? <FiLoader className="gen-news-modal__spin" size={18} /> : null}
                {loading ? 'Публикация…' : 'Опубликовать'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
