import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiLogOut, FiPlus, FiTrash2, FiExternalLink } from 'react-icons/fi'
import {
  deleteMarketerArticle,
  fetchMarketerArticles,
  getMarketerToken,
  marketerLogin,
  marketerLogout,
  setMarketerToken,
} from '@/services/newsApi'
import GenerateNewsModal from '@/components/news/GenerateNewsModal'
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
        <p className="marketer-login__hint">Вход для публикации новостей на сайте</p>
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
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')

  const loadArticles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchMarketerArticles()
      setArticles(list)
    } catch (e) {
      if (e?.message === 'SESSION_EXPIRED') {
        setMarketerToken('')
        setAuthed(false)
      } else {
        setError(e?.message || 'Ошибка загрузки')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    scrollMainTo(0, 0)
  }, [])

  useEffect(() => {
    if (authed) loadArticles()
  }, [authed, loadArticles])

  const handleLogout = async () => {
    await marketerLogout()
    setAuthed(false)
    setArticles([])
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить эту новость с сайта?')) return
    try {
      await deleteMarketerArticle(id)
      await loadArticles()
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

  return (
    <div className="marketer-panel">
      <header className="marketer-panel__header">
        <div>
          <h1 className="marketer-panel__title">Панель маркетолога</h1>
          <p className="marketer-panel__subtitle">Генерация и публикация новостей</p>
        </div>
        <div className="marketer-panel__header-actions">
          <button
            type="button"
            className="marketer-panel__btn marketer-panel__btn--primary"
            onClick={() => setModalOpen(true)}
          >
            <FiPlus size={18} />
            Сгенерировать новость
          </button>
          <button type="button" className="marketer-panel__btn" onClick={handleLogout}>
            <FiLogOut size={18} />
            Выйти
          </button>
        </div>
      </header>

      {error ? <p className="marketer-panel__error">{error}</p> : null}

      <section className="marketer-panel__list-section">
        <h2 className="marketer-panel__list-title">Опубликованные материалы</h2>
        {loading && !articles.length ? (
          <p className="marketer-panel__muted">Загрузка…</p>
        ) : null}
        {!loading && !articles.length ? (
          <p className="marketer-panel__muted">Пока нет опубликованных новостей. Создайте первую через кнопку выше.</p>
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
                  onClick={() => handleDelete(article.id)}
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="marketer-panel__footer-link">
        <Link to="/news">Перейти на страницу новостей →</Link>
      </p>

      <GenerateNewsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPublished={() => loadArticles()}
      />
    </div>
  )
}
