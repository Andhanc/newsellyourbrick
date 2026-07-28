import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { getSiteAdPageLabel, SITE_AD_TYPE_LABELS } from '@/utils/siteAdPages'
import { SITE_AD_ICONS } from '@/utils/siteAdIcons'
import SiteAdIcon from '@/components/siteAds/SiteAdIcon'
import { scrollMainTo } from '@/utils/mainScroll'
import './MarketerPanel.css'

function MarketerLoginForm({ onSuccess }) {
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
      setError(err?.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="marketer-login">
      <form className="marketer-login__card" onSubmit={handleSubmit}>
        <h1 className="marketer-login__title">Панель маркетолога</h1>
        <p className="marketer-login__hint">Вход для публикации новостей и рекламы на сайте</p>
        {error ? <p className="marketer-login__error">{error}</p> : null}
        <label className="marketer-login__label">
          Логин
          <input
            type="text"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </label>
        <label className="marketer-login__label">
          Пароль
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="marketer-login__submit" disabled={loading}>
          {loading ? 'Вход…' : 'Войти'}
        </button>
        <Link to="/news" className="marketer-login__back">
          ← К новостям
        </Link>
      </form>
    </div>
  )
}

export default function MarketerPanel() {
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
      setError(e?.message || 'Ошибка загрузки')
    }
  }, [])

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
    if (!window.confirm('Удалить эту новость с сайта?')) return
    try {
      await deleteMarketerArticle(id)
      await loadArticles()
    } catch (e) {
      setError(e?.message || 'Не удалось удалить')
    }
  }

  const handleDeleteAd = async (id) => {
    if (!window.confirm('Удалить эту рекламу с сайта?')) return
    try {
      await deleteMarketerSiteAd(id)
      await loadAds()
    } catch (e) {
      setError(e?.message || 'Не удалось удалить')
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
          <h1 className="marketer-panel__title">Панель маркетолога</h1>
          <p className="marketer-panel__subtitle">
            {isNewsTab ? 'Генерация и публикация новостей' : 'Управление рекламой на сайте'}
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
              Сгенерировать новость
            </button>
          ) : (
            <button
              type="button"
              className="marketer-panel__btn marketer-panel__btn--primary"
              onClick={() => setAdModalOpen(true)}
            >
              <FiPlus size={18} />
              Создать рекламу
            </button>
          )}
          <button type="button" className="marketer-panel__btn" onClick={handleLogout}>
            <FiLogOut size={18} />
            Выйти
          </button>
        </div>
      </header>

      <nav className="marketer-panel__tabs" aria-label="Разделы панели">
        <button
          type="button"
          className={`marketer-panel__tab${isNewsTab ? ' marketer-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          <FiFileText size={16} />
          Новости
        </button>
        <button
          type="button"
          className={`marketer-panel__tab${!isNewsTab ? ' marketer-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('ads')}
        >
          <Megaphone size={16} strokeWidth={2} />
          Реклама
        </button>
      </nav>

      {error ? <p className="marketer-panel__error">{error}</p> : null}

      {isNewsTab ? (
        <section className="marketer-panel__list-section">
          <h2 className="marketer-panel__list-title">Опубликованные материалы</h2>
          {loading && !articles.length ? (
            <p className="marketer-panel__muted">Загрузка…</p>
          ) : null}
          {!loading && !articles.length ? (
            <p className="marketer-panel__muted">
              Пока нет опубликованных новостей. Создайте первую через кнопку выше.
            </p>
          ) : null}
          <ul className="marketer-panel__list">
            {articles.map((article) => (
              <li key={article.id} className="marketer-panel__item">
                <img src={article.image} alt="" className="marketer-panel__thumb" />
                <div className="marketer-panel__item-body">
                  <span className="marketer-panel__item-badge">{article.badge}</span>
                  <h3 className="marketer-panel__item-title">{article.title}</h3>
                  <p className="marketer-panel__item-meta">
                    {article.date} · {article.status === 'published' ? 'опубликовано' : article.status}
                  </p>
                </div>
                <div className="marketer-panel__item-actions">
                  {article.status === 'published' && article.slug ? (
                    <button
                      type="button"
                      className="marketer-panel__icon-btn"
                      title="Открыть на сайте"
                      onClick={() => navigate(`/news/${article.slug}`)}
                    >
                      <FiExternalLink size={18} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="marketer-panel__icon-btn marketer-panel__icon-btn--danger"
                    title="Удалить"
                    onClick={() => handleDeleteArticle(article.id)}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="marketer-panel__footer-link">
            <Link to="/news">Перейти на страницу новостей →</Link>
          </p>
        </section>
      ) : (
        <section className="marketer-panel__list-section">
          <h2 className="marketer-panel__list-title">Активная реклама</h2>
          {loading && !ads.length ? (
            <p className="marketer-panel__muted">Загрузка…</p>
          ) : null}
          {!loading && !ads.length ? (
            <p className="marketer-panel__muted">
              Рекламы пока нет. Создайте модальное окно или блок через кнопку выше.
            </p>
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
                    {SITE_AD_TYPE_LABELS[ad.type] || ad.type}
                    {' · '}
                    {SITE_AD_ICONS.find((i) => i.id === ad.icon)?.label || 'Мегафон'}
                  </span>
                  <h3 className="marketer-panel__item-title">{ad.title}</h3>
                  <p className="marketer-panel__item-description">{ad.description}</p>
                  <p className="marketer-panel__item-meta">
                    {Array.isArray(ad.pages)
                      ? ad.pages.map((p) => getSiteAdPageLabel(p)).join(' · ')
                      : ''}
                    {ad.buttonEnabled && ad.buttonUrl ? ` · Кнопка: ${ad.buttonUrl}` : ''}
                  </p>
                </div>
                <div className="marketer-panel__item-actions">
                  <button
                    type="button"
                    className="marketer-panel__icon-btn marketer-panel__icon-btn--danger"
                    title="Удалить"
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
