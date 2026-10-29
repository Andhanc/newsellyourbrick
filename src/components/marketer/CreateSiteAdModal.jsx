import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
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
    labelKey: 'createSiteAd_typeModal',
    hintKey: 'createSiteAd_typeModalHint',
    Icon: FiMaximize2,
  },
  {
    id: 'block',
    labelKey: 'createSiteAd_typeBlock',
    hintKey: 'createSiteAd_typeBlockHint',
    Icon: FiLayers,
  },
]

const PAGE_LABEL_KEYS = {
  home: 'createSiteAd_page_home',
  auction: 'createSiteAd_page_auction',
  shares: 'createSiteAd_page_shares',
  'test-drive': 'createSiteAd_page_testDrive',
  debts: 'createSiteAd_page_debts',
}

export default function CreateSiteAdModal({ open, onClose, onCreated }) {
  const { t } = useTranslation()
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
      setError(t('createSiteAd_errButtonUrl'))
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
      setError(err?.message || t('createSiteAd_errCreate'))
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
          aria-label={t('createSiteAd_closeAria')}
        >
          <FiX size={20} />
        </button>

        <h2 id="create-site-ad-modal-title" className="create-site-ad-modal__title">
          {t('createSiteAd_title')}
        </h2>
        <p className="create-site-ad-modal__subtitle">
          {t('createSiteAd_subtitle')}
        </p>

        {error ? <p className="create-site-ad-modal__error">{error}</p> : null}

        <form className="create-site-ad-modal__form" onSubmit={handleSubmit} noValidate>
          <fieldset className="create-site-ad-modal__fieldset">
            <legend className="create-site-ad-modal__legend">{t('createSiteAd_typeLegend')}</legend>
            <div className="create-site-ad-modal__type-grid">
              {TYPE_OPTIONS.map(({ id, labelKey, hintKey, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`create-site-ad-modal__type-card${type === id ? ' create-site-ad-modal__type-card--active' : ''}`}
                  onClick={() => setType(id)}
                >
                  <span className="create-site-ad-modal__type-icon">
                    <Icon size={20} />
                  </span>
                  <span className="create-site-ad-modal__type-label">{t(labelKey)}</span>
                  <span className="create-site-ad-modal__type-hint">{t(hintKey)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="create-site-ad-modal__fieldset">
            <legend className="create-site-ad-modal__legend">{t('createSiteAd_iconLegend')}</legend>
            <div className="create-site-ad-modal__icon-grid">
              {SITE_AD_ICONS.map((item) => {
                const iconLabel = t(`createSiteAd_icon_${item.id}`)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`create-site-ad-modal__icon-btn${icon === item.id ? ' create-site-ad-modal__icon-btn--active' : ''}`}
                    onClick={() => setIcon(item.id)}
                    title={iconLabel}
                    aria-label={iconLabel}
                    aria-pressed={icon === item.id}
                  >
                    <SiteAdIcon iconId={item.id} size={20} />
                    <span className="create-site-ad-modal__icon-label">{iconLabel}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className="create-site-ad-modal__label">
            {t('createSiteAd_titleLabel')}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('createSiteAd_titlePlaceholder')}
              maxLength={120}
              required
            />
          </label>

          <label className="create-site-ad-modal__label">
            {t('createSiteAd_descLabel')}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('createSiteAd_descPlaceholder')}
              rows={4}
              maxLength={500}
              required
            />
          </label>

          <fieldset className="create-site-ad-modal__fieldset">
            <legend className="create-site-ad-modal__legend">{t('createSiteAd_pagesLegend')}</legend>
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
                  <span>{t(PAGE_LABEL_KEYS[page.id] || page.id)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="create-site-ad-modal__fieldset">
            <legend className="create-site-ad-modal__legend">{t('createSiteAd_buttonLegend')}</legend>
            <label className="create-site-ad-modal__toggle">
              <input
                type="checkbox"
                checked={buttonEnabled}
                onChange={(e) => setButtonEnabled(Boolean(e.target.checked))}
              />
              <span>{t('createSiteAd_showButton')}</span>
            </label>
            {buttonEnabled ? (
              <label className="create-site-ad-modal__label create-site-ad-modal__label--nested">
                {t('createSiteAd_buttonUrl')}
                <input
                  type="text"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder={t('createSiteAd_buttonUrlPlaceholder')}
                  maxLength={500}
                />
                <span className="create-site-ad-modal__field-hint">
                  {t('createSiteAd_buttonUrlHint')}
                </span>
              </label>
            ) : null}
          </fieldset>

          <div className="create-site-ad-modal__preview-wrap">
            <p className="create-site-ad-modal__preview-label">{t('createSiteAd_preview')}</p>
            <div className={`create-site-ad-modal__preview create-site-ad-modal__preview--${type}`}>
              <span className="create-site-ad-modal__preview-icon">
                <SiteAdIcon iconId={icon} size={24} />
              </span>
              {type === 'modal' ? (
                <span className="create-site-ad-modal__preview-badge">{t('createSiteAd_previewBadge')}</span>
              ) : (
                <span className="create-site-ad-modal__preview-block-label">{t('createSiteAd_previewBlockLabel')}</span>
              )}
              <strong>{title || t('createSiteAd_previewTitleFallback')}</strong>
              <p>{description || t('createSiteAd_previewDescFallback')}</p>
              {buttonEnabled ? (
                <span className="create-site-ad-modal__preview-cta">
                  {t('createSiteAd_learnMore')}
                  {previewButtonUrl ? <small>{previewButtonUrl}</small> : null}
                </span>
              ) : null}
            </div>
          </div>

          <div className="create-site-ad-modal__actions">
            <button type="button" className="create-site-ad-modal__btn" onClick={handleClose}>
              {t('createSiteAd_cancel')}
            </button>
            <button
              type="submit"
              className="create-site-ad-modal__btn create-site-ad-modal__btn--primary"
              disabled={loading || !pages.length || (buttonEnabled && !buttonUrl.trim())}
            >
              {loading ? t('createSiteAd_publishing') : t('createSiteAd_publish')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
