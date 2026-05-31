import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FiLayers, FiMaximize2, FiX } from 'react-icons/fi'
import { createMarketerSiteAd } from '@/services/siteAdsApi'
import { SITE_AD_PAGES } from '@/utils/siteAdPages'
import {
  DEFAULT_SITE_AD_ICON,
  SITE_AD_ICONS,
  normalizeAdButtonUrl,
} from '@/utils/siteAdIcons'
import SiteAdIcon from '@/components/siteAds/SiteAdIcon'
import './CreateSiteAdModal.css'

const TYPE_OPTIONS = [
  {
    id: 'modal',
    label: 'Модальное окно',
    hint: 'Показывается один раз каждому пользователю',
    Icon: FiMaximize2,
  },
  {
    id: 'block',
    label: 'Рекламный блок',
    hint: 'Внизу экрана, пользователь может закрыть крестиком',
    Icon: FiLayers,
  },
]

export default function CreateSiteAdModal({ open, onClose, onCreated }) {
  const [type, setType] = useState('modal')
  const [icon, setIcon] = useState(DEFAULT_SITE_AD_ICON)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pages, setPages] = useState(['home'])
  const [buttonEnabled, setButtonEnabled] = useState(false)
  const [buttonUrl, setButtonUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const togglePage = (pageId) => {
    setPages((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId],
    )
  }

  const resetForm = () => {
    setType('modal')
    setIcon(DEFAULT_SITE_AD_ICON)
    setTitle('')
    setDescription('')
    setPages(['home'])
    setButtonEnabled(false)
    setButtonUrl('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (buttonEnabled && !buttonUrl.trim()) {
      setError('Укажите ссылку для кнопки')
      return
    }

    setLoading(true)
    try {
      await createMarketerSiteAd({
        type,
        icon,
        title: title.trim(),
        description: description.trim(),
        pages,
        buttonEnabled,
        buttonUrl: buttonEnabled ? normalizeAdButtonUrl(buttonUrl) : '',
      })
      resetForm()
      onCreated?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Не удалось создать рекламу')
    } finally {
      setLoading(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  const previewButtonUrl = buttonEnabled && buttonUrl.trim()
    ? normalizeAdButtonUrl(buttonUrl)
    : ''

  return createPortal(
    <div className="create-site-ad-modal" role="presentation">
      <div className="create-site-ad-modal__backdrop" onClick={handleClose} aria-hidden="true" />
      <div
        className="create-site-ad-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-site-ad-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="create-site-ad-modal__close"
          onClick={handleClose}
          aria-label="Закрыть"
        >
          <FiX size={20} />
        </button>

        <h2 id="create-site-ad-modal-title" className="create-site-ad-modal__title">
          Новая реклама
        </h2>
        <p className="create-site-ad-modal__subtitle">
          Выберите формат, иконку, текст и при необходимости кнопку со ссылкой
        </p>

        {error ? <p className="create-site-ad-modal__error">{error}</p> : null}

        <form className="create-site-ad-modal__form" onSubmit={handleSubmit} noValidate>
          <fieldset className="create-site-ad-modal__fieldset">
            <legend className="create-site-ad-modal__legend">Тип рекламы</legend>
            <div className="create-site-ad-modal__type-grid">
              {TYPE_OPTIONS.map(({ id, label, hint, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`create-site-ad-modal__type-card${type === id ? ' create-site-ad-modal__type-card--active' : ''}`}
                  onClick={() => setType(id)}
                >
                  <span className="create-site-ad-modal__type-icon">
                    <Icon size={20} />
                  </span>
                  <span className="create-site-ad-modal__type-label">{label}</span>
                  <span className="create-site-ad-modal__type-hint">{hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="create-site-ad-modal__fieldset">
            <legend className="create-site-ad-modal__legend">Иконка</legend>
            <div className="create-site-ad-modal__icon-grid">
              {SITE_AD_ICONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`create-site-ad-modal__icon-btn${icon === item.id ? ' create-site-ad-modal__icon-btn--active' : ''}`}
                  onClick={() => setIcon(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={icon === item.id}
                >
                  <SiteAdIcon iconId={item.id} size={20} />
                  <span className="create-site-ad-modal__icon-label">{item.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="create-site-ad-modal__label">
            Заголовок
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Скидка 20% на первую ставку"
              maxLength={120}
              required
            />
          </label>

          <label className="create-site-ad-modal__label">
            Описание
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Кратко опишите предложение для пользователей"
              rows={4}
              maxLength={500}
              required
            />
          </label>

          <fieldset className="create-site-ad-modal__fieldset">
            <legend className="create-site-ad-modal__legend">Страницы показа</legend>
            <div className="create-site-ad-modal__pages">
              {SITE_AD_PAGES.map((page) => (
                <label
                  key={page.id}
                  className={`create-site-ad-modal__page-chip${pages.includes(page.id) ? ' create-site-ad-modal__page-chip--active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={pages.includes(page.id)}
                    onChange={() => togglePage(page.id)}
                  />
                  <span>{page.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="create-site-ad-modal__fieldset">
            <legend className="create-site-ad-modal__legend">Кнопка</legend>
            <label className="create-site-ad-modal__toggle">
              <input
                type="checkbox"
                checked={buttonEnabled}
                onChange={(e) => setButtonEnabled(Boolean(e.target.checked))}
              />
              <span>Показать кнопку «Подробнее»</span>
            </label>
            {buttonEnabled ? (
              <label className="create-site-ad-modal__label create-site-ad-modal__label--nested">
                Ссылка кнопки
                <input
                  type="text"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="https://example.com или /auction"
                  maxLength={500}
                />
                <span className="create-site-ad-modal__field-hint">
                  Можно указать внутренний путь (/auction) или полный URL
                </span>
              </label>
            ) : null}
          </fieldset>

          <div className="create-site-ad-modal__preview-wrap">
            <p className="create-site-ad-modal__preview-label">Предпросмотр</p>
            <div className={`create-site-ad-modal__preview create-site-ad-modal__preview--${type}`}>
              <span className="create-site-ad-modal__preview-icon">
                <SiteAdIcon iconId={icon} size={24} />
              </span>
              {type === 'modal' ? (
                <span className="create-site-ad-modal__preview-badge">Специальное предложение</span>
              ) : (
                <span className="create-site-ad-modal__preview-block-label">Реклама</span>
              )}
              <strong>{title || 'Заголовок рекламы'}</strong>
              <p>{description || 'Описание появится здесь'}</p>
              {buttonEnabled ? (
                <span className="create-site-ad-modal__preview-cta">
                  Подробнее
                  {previewButtonUrl ? <small>{previewButtonUrl}</small> : null}
                </span>
              ) : null}
            </div>
          </div>

          <div className="create-site-ad-modal__actions">
            <button type="button" className="create-site-ad-modal__btn" onClick={handleClose}>
              Отмена
            </button>
            <button
              type="submit"
              className="create-site-ad-modal__btn create-site-ad-modal__btn--primary"
              disabled={loading || !pages.length || (buttonEnabled && !buttonUrl.trim())}
            >
              {loading ? 'Публикация…' : 'Опубликовать'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
