import { useState } from 'react'
import { FiX, FiLoader, FiImage, FiRefreshCw, FiSearch } from 'react-icons/fi'
import {
  generateNewsDraft,
  publishNewsDraft,
  searchNewsCoverImages,
  suggestNewsImageQuery,
  generateNewsAiCover,
} from '@/services/newsApi'
import NewsArticleMeta from './NewsArticleMeta'
import NewsArticleBody from './NewsArticleBody'
import './GenerateNewsModal.css'

export default function GenerateNewsModal({ open, onClose, onPublished }) {
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState(null)
  const [step, setStep] = useState('prompt')
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageQuery, setImageQuery] = useState('')
  const [imageOptions, setImageOptions] = useState([])
  const [error, setError] = useState('')

  if (!open) return null

  const reset = () => {
    setPrompt('')
    setDraft(null)
    setStep('prompt')
    setError('')
    setLoading(false)
    setImageLoading(false)
    setImageQuery('')
    setImageOptions([])
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
      setImageQuery(result.imageSearchQuery || '')
      setImageOptions([])
      setStep('preview')
    } catch (e) {
      const raw = e?.message || 'Ошибка генерации'
      const friendly =
        raw === 'SESSION_EXPIRED'
          ? 'Сессия истекла — войдите снова'
          : /aborted|timeout|timed out/i.test(raw)
            ? 'Генерация заняла слишком много времени. Сократите промпт или подождите ~15 сек и нажмите «Сгенерировать» снова.'
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
      const article = await publishNewsDraft({
        ...draft,
        imageSearchQuery: imageQuery.trim() || draft.imageSearchQuery,
      })
      onPublished?.(article)
      handleClose()
    } catch (e) {
      setError(e?.message === 'SESSION_EXPIRED' ? 'Сессия истекла — войдите снова' : e?.message || 'Ошибка публикации')
    } finally {
      setLoading(false)
    }
  }

  const applyImage = (url) => {
    if (!url || !draft) return
    setDraft({ ...draft, image: url })
  }

  const handleSearchImages = async (queryOverride) => {
    if (!draft) return
    const query = String(queryOverride ?? imageQuery ?? draft.imageSearchQuery ?? '').trim()
    if (!query) {
      setError('Укажите запрос для поиска фото')
      return
    }
    setError('')
    setImageLoading(true)
    try {
      const images = await searchNewsCoverImages(query, 6)
      setImageOptions(images)
      if (images.length) applyImage(images[0])
      setImageQuery(query)
    } catch (e) {
      setError(e?.message || 'Не удалось найти фото')
    } finally {
      setImageLoading(false)
    }
  }

  const handleSuggestQuery = async () => {
    if (!draft) return
    setError('')
    setImageLoading(true)
    try {
      const meta = await suggestNewsImageQuery(draft)
      setImageQuery(meta.imageSearchQuery || '')
      setDraft({
        ...draft,
        imageSearchQuery: meta.imageSearchQuery || draft.imageSearchQuery,
        imagePrompt: meta.imagePrompt || draft.imagePrompt,
      })
      await handleSearchImages(meta.imageSearchQuery)
    } catch (e) {
      setError(e?.message || 'Не удалось подобрать запрос')
    } finally {
      setImageLoading(false)
    }
  }

  const handleGenerateAiImage = async () => {
    if (!draft) return
    setError('')
    setImageLoading(true)
    try {
      const result = await generateNewsAiCover({
        ...draft,
        imageSearchQuery: imageQuery.trim() || draft.imageSearchQuery,
      })
      setDraft({
        ...draft,
        image: result.image,
        imagePrompt: result.imagePrompt || draft.imagePrompt,
        imageSearchQuery: result.imageSearchQuery || draft.imageSearchQuery,
      })
      setImageQuery(result.imageSearchQuery || imageQuery)
      setImageOptions((prev) => [result.image, ...prev.filter((u) => u !== result.image)].slice(0, 6))
    } catch (e) {
      setError(e?.message || 'Не удалось сгенерировать фото')
    } finally {
      setImageLoading(false)
    }
  }

  const headingCount = draft?.headingCount ?? draft?.body?.filter((b) => b.type === 'h2').length ?? 0

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
              placeholder="Кратко опишите тему (2–5 предложений). ИИ создаст статью с 3–7 разделами и подберёт обложку."
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
            <div className="gen-news-modal__image-panel">
              <div className="gen-news-modal__preview-image-wrap">
                <img src={draft?.image} alt="" className="gen-news-modal__preview-image" />
                <span className="gen-news-modal__preview-badge">{draft?.badge}</span>
                {imageLoading ? (
                  <div className="gen-news-modal__image-loading">
                    <FiLoader className="gen-news-modal__spin" size={24} />
                  </div>
                ) : null}
              </div>

              <div className="gen-news-modal__image-toolbar">
                <button
                  type="button"
                  className="gen-news-modal__image-btn"
                  onClick={handleSuggestQuery}
                  disabled={imageLoading || loading}
                >
                  <FiSearch size={16} />
                  ИИ-подбор фото
                </button>
                <button
                  type="button"
                  className="gen-news-modal__image-btn"
                  onClick={() => handleSearchImages()}
                  disabled={imageLoading || loading}
                >
                  <FiRefreshCw size={16} />
                  Найти другие
                </button>
                <button
                  type="button"
                  className="gen-news-modal__image-btn gen-news-modal__image-btn--accent"
                  onClick={handleGenerateAiImage}
                  disabled={imageLoading || loading}
                >
                  <FiImage size={16} />
                  Сгенерировать ИИ
                </button>
              </div>

              <label className="gen-news-modal__label" htmlFor="gen-news-image-query">
                Запрос для поиска (English)
              </label>
              <div className="gen-news-modal__image-query-row">
                <input
                  id="gen-news-image-query"
                  type="text"
                  className="gen-news-modal__image-query-input"
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  placeholder="Barcelona architecture travel"
                  disabled={imageLoading || loading}
                />
                <button
                  type="button"
                  className="gen-news-modal__btn gen-news-modal__btn--ghost"
                  onClick={() => handleSearchImages(imageQuery)}
                  disabled={imageLoading || loading || !imageQuery.trim()}
                >
                  Искать
                </button>
              </div>

              {imageOptions.length > 1 ? (
                <div className="gen-news-modal__image-grid">
                  {imageOptions.map((url) => (
                    <button
                      key={url}
                      type="button"
                      className={`gen-news-modal__image-option${draft?.image === url ? ' gen-news-modal__image-option--active' : ''}`}
                      onClick={() => applyImage(url)}
                      title="Выбрать обложку"
                    >
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <h3 className="gen-news-modal__preview-title">{draft?.title}</h3>
            <p className="gen-news-modal__preview-lead">{draft?.lead}</p>
            <NewsArticleMeta date="сегодня" views={0} />
            <p className="gen-news-modal__preview-excerpt">
              <strong>Карточка:</strong> {draft?.excerpt}
            </p>
            <p className="gen-news-modal__preview-sections">
              <strong>Разделов:</strong> {headingCount} (нужно 3–7)
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
                disabled={loading || imageLoading}
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
