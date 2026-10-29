import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      const raw = e?.message || t('genNews_errGenerate')
      const friendly =
        raw === 'SESSION_EXPIRED'
          ? t('genNews_errSession')
          : /aborted|timeout|timed out/i.test(raw)
            ? t('genNews_errTimeout')
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
      setError(e?.message === 'SESSION_EXPIRED' ? t('genNews_errSession') : e?.message || t('genNews_errPublish'))
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
      setError(t('genNews_errQueryRequired'))
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
      setError(e?.message || t('genNews_errFindPhoto'))
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
      setError(e?.message || t('genNews_errSuggestQuery'))
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
      setError(e?.message || t('genNews_errGeneratePhoto'))
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
          aria-label={t('genNews_closeAria')}
        >
          <FiX size={22} />
        </button>

        <h2 id="gen-news-modal-title" className="gen-news-modal__title">
          {step === 'preview' ? t('genNews_titlePreview') : t('genNews_titleGenerate')}
        </h2>

        {error ? <p className="gen-news-modal__error">{error}</p> : null}

        {step === 'prompt' ? (
          <>
            <label className="gen-news-modal__label" htmlFor="gen-news-prompt">
              {t('genNews_promptLabel')}
            </label>
            <textarea
              id="gen-news-prompt"
              className="gen-news-modal__textarea"
              rows={6}
              placeholder={t('genNews_promptPlaceholder')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            {loading ? (
              <p className="gen-news-modal__hint">{t('genNews_generatingHint')}</p>
            ) : null}
            <div className="gen-news-modal__actions">
              <button type="button" className="gen-news-modal__btn gen-news-modal__btn--ghost" onClick={handleClose}>
                {t('genNews_cancel')}
              </button>
              <button
                type="button"
                className="gen-news-modal__btn gen-news-modal__btn--primary"
                onClick={handleGenerate}
                disabled={loading || prompt.trim().length < 8}
              >
                {loading ? <FiLoader className="gen-news-modal__spin" size={18} /> : null}
                {loading ? t('genNews_generating') : t('genNews_generate')}
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
                  {t('genNews_aiPickPhoto')}
                </button>
                <button
                  type="button"
                  className="gen-news-modal__image-btn"
                  onClick={() => handleSearchImages()}
                  disabled={imageLoading || loading}
                >
                  <FiRefreshCw size={16} />
                  {t('genNews_findOthers')}
                </button>
                <button
                  type="button"
                  className="gen-news-modal__image-btn gen-news-modal__image-btn--accent"
                  onClick={handleGenerateAiImage}
                  disabled={imageLoading || loading}
                >
                  <FiImage size={16} />
                  {t('genNews_generateAi')}
                </button>
              </div>

              <label className="gen-news-modal__label" htmlFor="gen-news-image-query">
                {t('genNews_imageQueryLabel')}
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
                  {t('genNews_search')}
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
                      title={t('genNews_selectCover')}
                    >
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <h3 className="gen-news-modal__preview-title">{draft?.title}</h3>
            <p className="gen-news-modal__preview-lead">{draft?.lead}</p>
            <NewsArticleMeta date={t('genNews_today')} views={0} />
            <p className="gen-news-modal__preview-excerpt">
              <strong>{t('genNews_cardLabel')}</strong> {draft?.excerpt}
            </p>
            <p className="gen-news-modal__preview-sections">
              <strong>{t('genNews_sectionsLabel')}</strong> {headingCount} {t('genNews_sectionsNeed')}
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
                {t('genNews_editPrompt')}
              </button>
              <button
                type="button"
                className="gen-news-modal__btn gen-news-modal__btn--primary"
                onClick={handlePublish}
                disabled={loading || imageLoading}
              >
                {loading ? <FiLoader className="gen-news-modal__spin" size={18} /> : null}
                {loading ? t('genNews_publishing') : t('genNews_publish')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
