import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiLogOut, FiPlus, FiTrash2, FiExternalLink, FiFileText } from 'react-icons/fi'
import { Megaphone } from 'lucide-react'
import {
  deleteMarketerArticle,
  fetchMarketerArticles,
  getMarketerToken,
  marketerLogin,
  marketerLogout,
  setMarketerToken,
} from '@/services/newsApi'
import {
  deleteMarketerSiteAd,
  fetchMarketerSiteAds,
} from '@/services/siteAdsApi'
import GenerateNewsModal from '@/components/news/GenerateNewsModal'
import CreateSiteAdModal from '@/components/marketer/CreateSiteAdModal'
import { getSiteAdPageLabel, getSiteAdTypeLabel } from '@/utils/siteAdPages'
import { SITE_AD_ICONS } from '@/utils/siteAdIcons'
import SiteAdIcon from '@/components/siteAds/SiteAdIcon'
import { scrollMainTo } from '@/utils/mainScroll'
import './MarketerPanel.css'

function MarketerLoginForm({ onSuccess }) {
  const { t } = useTranslation()
  const [login, setLogin] = useState('manager')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await marketerLogin(login.trim(), password)
      onSuccess()
    } catch (err) {
      setError(err?.message || t('marketerPanel_loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="marketer-login">
      <form className="marketer-login__card" onSubmit={handleSubmit}>
        <h1 className="marketer-login__title">{t('marketerPanel_loginTitle')}</h1>
        <p className="marketer-login__hint">{t('marketerPanel_loginHint')}</p>
        {error ? <p className="marketer-login__error">{error}</p> : null}
        <label className="marketer-login__label">
          {t('marketerPanel_loginLabel')}
          <input
            type="text"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </label>
        <label className="marketer-login__label">
          {t('marketerPanel_passwordLabel')}
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="marketer-login__submit" disabled={loading}>
          {loading ? t('marketerPanel_loginSubmitting') : t('marketerPanel_loginSubmit')}
        </button>
        <Link to="/news" className="marketer-login__back">
          {t('marketerPanel_backToNews')}
        </Link>
      </form>
    </div>
  )
}

export default function MarketerPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [authed, setAuthed] = useState(() => Boolean(getMarketerToken()))
  const [activeTab, setActiveTab] = useState('news')
  const [articles, setArticles] = useState([])
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(false)
  const [newsModalOpen, setNewsModalOpen] = useState(false)
  const [adModalOpen, setAdModalOpen] = useState(false)
  const [error, setError] = useState('')

  const handleSessionError = useCallback((e) => {
    if (e?.message === 'SESSION_EXPIRED') {
      setMarketerToken('')
      setAuthed(false)
    } else {
      setError(e?.message || t('marketerPanel_loadError'))
    }
  }, [t])

  const loadArticles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchMarketerArticles()
      setArticles(list)
    } catch (e) {
      handleSessionError(e)
    } finally {
      setLoading(false)
    }
  }, [handleSessionError])

  const loadAds = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchMarketerSiteAds()
      setAds(list)
    } catch (e) {
      handleSessionError(e)
    } finally {
      setLoading(false)
    }
  }, [handleSessionError])

  useEffect(() => {
    scrollMainTo(0, 0)
  }, [])

  useEffect(() => {
    if (!authed) return
    if (activeTab === 'news') loadArticles()
    else loadAds()
  }, [authed, activeTab, loadArticles, loadAds])

  const handleLogout = async () => {
    await marketerLogout()
    setAuthed(false)
    setArticles([])
    setAds([])
  }

  const handleDeleteArticle = async (id) => {
    if (!window.confirm(t('marketerPanel_deleteNewsConfirm'))) return
    try {
      await deleteMarketerArticle(id)
      await loadArticles()
    } catch (e) {
      setError(e?.message || t('marketerPanel_deleteError'))
    }
  }

  const handleDeleteAd = async (id) => {
    if (!window.confirm(t('marketerPanel_deleteAdConfirm'))) return
    try {
      await deleteMarketerSiteAd(id)
      await loadAds()
    } catch (e) {
      setError(e?.message || t('marketerPanel_deleteError'))
    }
  }

  if (!authed) {
    return (
      <MarketerLoginForm
        onSuccess={() => {
          setAuthed(true)
        }}
      />
    )
  }

  const isNewsTab = activeTab === 'news'

  return (
    <div className="marketer-panel">
      <header className="marketer-panel__header">
        <div>
          <h1 className="marketer-panel__title">{t('marketerPanel_title')}</h1>
          <p className="marketer-panel__subtitle">
            {isNewsTab ? t('marketerPanel_subtitleNews') : t('marketerPanel_subtitleAds')}
          </p>
        </div>
        <div className="marketer-panel__header-actions">
          {isNewsTab ? (
            <button
              type="button"
              className="marketer-panel__btn marketer-panel__btn--primary"
              onClick={() => setNewsModalOpen(true)}
            >
              <FiPlus size={18} />
              {t('marketerPanel_generateNews')}
            </button>
          ) : (
            <button
              type="button"
              className="marketer-panel__btn marketer-panel__btn--primary"
              onClick={() => setAdModalOpen(true)}
            >
              <FiPlus size={18} />
              {t('marketerPanel_createAd')}
            </button>
          )}
          <button type="button" className="marketer-panel__btn" onClick={handleLogout}>
            <FiLogOut size={18} />
            {t('marketerPanel_logout')}
          </button>
        </div>
      </header>

      <nav className="marketer-panel__tabs" aria-label={t('marketerPanel_tabsAria')}>
        <button
          type="button"
          className={`marketer-panel__tab${isNewsTab ? ' marketer-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          <FiFileText size={16} />
          {t('marketerPanel_tabNews')}
        </button>
        <button
          type="button"
          className={`marketer-panel__tab${!isNewsTab ? ' marketer-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('ads')}
        >
          <Megaphone size={16} strokeWidth={2} />
          {t('marketerPanel_tabAds')}
        </button>
      </nav>

      {error ? <p className="marketer-panel__error">{error}</p> : null}

      {isNewsTab ? (
        <section className="marketer-panel__list-section">
          <h2 className="marketer-panel__list-title">{t('marketerPanel_publishedTitle')}</h2>
          {loading && !articles.length ? (
            <p className="marketer-panel__muted">{t('marketerPanel_loading')}</p>
          ) : null}
          {!loading && !articles.length ? (
            <p className="marketer-panel__muted">{t('marketerPanel_emptyNews')}</p>
          ) : null}
          <ul className="marketer-panel__list">
            {articles.map((article) => (
              <li key={article.id} className="marketer-panel__item">
                <img src={article.image} alt="" className="marketer-panel__thumb" />
                <div className="marketer-panel__item-body">
                  <span className="marketer-panel__item-badge">{article.badge}</span>
                  <h3 className="marketer-panel__item-title">{article.title}</h3>
                  <p className="marketer-panel__item-meta">
                    {article.date} ·{' '}
                    {article.status === 'published'
                      ? t('marketerPanel_statusPublished')
                      : article.status}
                  </p>
                </div>
                <div className="marketer-panel__item-actions">
                  {article.status === 'published' && article.slug ? (
                    <button
                      type="button"
                      className="marketer-panel__icon-btn"
                      title={t('marketerPanel_openOnSite')}
                      onClick={() => navigate(`/news/${article.slug}`)}
                    >
                      <FiExternalLink size={18} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="marketer-panel__icon-btn marketer-panel__icon-btn--danger"
                    title={t('marketerPanel_delete')}
                    onClick={() => handleDeleteArticle(article.id)}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="marketer-panel__footer-link">
            <Link to="/news">{t('marketerPanel_goToNewsPage')}</Link>
          </p>
        </section>
      ) : (
        <section className="marketer-panel__list-section">
          <h2 className="marketer-panel__list-title">{t('marketerPanel_activeAdsTitle')}</h2>
          {loading && !ads.length ? (
            <p className="marketer-panel__muted">{t('marketerPanel_loading')}</p>
          ) : null}
          {!loading && !ads.length ? (
            <p className="marketer-panel__muted">{t('marketerPanel_emptyAds')}</p>
          ) : null}
          <ul className="marketer-panel__list marketer-panel__list--ads">
            {ads.map((ad) => (
              <li
                key={ad.id}
                className={`marketer-panel__item marketer-panel__item--ad marketer-panel__item--ad-${ad.type}`}
              >
                <div className="marketer-panel__ad-type-icon marketer-panel__ad-type-icon--svg" aria-hidden="true">
                  <SiteAdIcon iconId={ad.icon} size={18} />
                </div>
                <div className="marketer-panel__item-body">
                  <span className="marketer-panel__item-badge">
                    {getSiteAdTypeLabel(ad.type, t)}
                    {' · '}
                    {(() => {
                      const icon = SITE_AD_ICONS.find((i) => i.id === ad.icon)
                      return icon?.labelKey ? t(icon.labelKey) : t('marketerPanel_iconMegaphone')
                    })()}
                  </span>
                  <h3 className="marketer-panel__item-title">{ad.title}</h3>
                  <p className="marketer-panel__item-description">{ad.description}</p>
                  <p className="marketer-panel__item-meta">
                    {Array.isArray(ad.pages)
                      ? ad.pages.map((p) => getSiteAdPageLabel(p, t)).join(' · ')
                      : ''}
                    {ad.buttonEnabled && ad.buttonUrl
                      ? t('marketerPanel_buttonMeta', { url: ad.buttonUrl })
                      : ''}
                  </p>
                </div>
                <div className="marketer-panel__item-actions">
                  <button
                    type="button"
                    className="marketer-panel__icon-btn marketer-panel__icon-btn--danger"
                    title={t('marketerPanel_delete')}
                    onClick={() => handleDeleteAd(ad.id)}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GenerateNewsModal
        open={newsModalOpen}
        onClose={() => setNewsModalOpen(false)}
        onPublished={() => loadArticles()}
      />

      <CreateSiteAdModal
        open={adModalOpen}
        onClose={() => setAdModalOpen(false)}
        onCreated={() => loadAds()}
      />
    </div>
  )
}
