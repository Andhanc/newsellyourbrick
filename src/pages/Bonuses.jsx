import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronDown, FiCheck, FiGift, FiExternalLink } from 'react-icons/fi'
import { FaInstagram, FaTiktok } from 'react-icons/fa'
import Header from '../components/Header'
import { getUserData } from '../services/authService'
import './Bonuses.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const TASKS = [
  {
    id: 1,
    title: 'Пост в Instagram с хештегом #sellyoubrick',
    icon: FaInstagram,
    promoCode: 'BONUS-INSTA-10',
    steps: [
      'Создайте пост про Sellyourbrick (фото или карусель).',
      'Добавьте в описание хештег #sellyoubrick.',
      'Опубликуйте пост и скопируйте ссылку на него.',
      'Вставьте ссылку ниже и нажмите «Проверить».',
    ],
    linkPlaceholder: 'https://www.instagram.com/p/...',
    linkHint: 'Ссылка на ваш пост в Instagram',
  },
  {
    id: 2,
    title: 'Видео в TikTok с хештегом #sellyoubrick',
    icon: FaTiktok,
    promoCode: 'BONUS-TIKTOK-10',
    steps: [
      'Снимите короткое видео про Sellyourbrick или недвижимость.',
      'Добавьте хештег #sellyoubrick в описание.',
      'Опубликуйте видео и скопируйте ссылку.',
      'Вставьте ссылку ниже и нажмите «Проверить».',
    ],
    linkPlaceholder: 'https://www.tiktok.com/@username/video/...',
    linkHint: 'Ссылка на ваше видео в TikTok',
  },
  {
    id: 3,
    title: 'Ссылка на нас в описании профиля',
    icon: FaInstagram,
    promoCode: 'BONUS-BIO-15',
    steps: [
      'Откройте профиль в Instagram или TikTok.',
      'Добавьте в описание профиля (bio) ссылку на Sellyourbrick.',
      'Сохраните изменения.',
      'Вставьте ссылку на ваш профиль ниже и нажмите «Проверить».',
    ],
    linkPlaceholder: 'https://www.instagram.com/yourprofile/ или https://www.tiktok.com/@yourprofile',
    linkHint: 'Ссылка на ваш профиль (Instagram или TikTok)',
  },
  {
    id: 4,
    title: 'Ссылка на нас в посте в Instagram',
    icon: FaInstagram,
    promoCode: 'BONUS-LINK-15',
    steps: [
      'Опубликуйте пост в Instagram (сторис или лента).',
      'Добавьте в пост ссылку на Sellyourbrick (в подписи или кнопка).',
      'Скопируйте ссылку на этот пост.',
      'Вставьте ссылку ниже и нажмите «Проверить».',
    ],
    linkPlaceholder: 'https://www.instagram.com/p/...',
    linkHint: 'Ссылка на пост со ссылкой на нас',
  },
]

const Bonuses = () => {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [submissions, setSubmissions] = useState({})
  const [expandedTask, setExpandedTask] = useState(null)
  const [linkInputs, setLinkInputs] = useState({})
  const [submitting, setSubmitting] = useState(null)
  const [celebratingTask, setCelebratingTask] = useState(null)
  const [error, setError] = useState(null)
  const celebratedRef = useRef(false)

  useEffect(() => {
    const userData = getUserData()
    const dbUserId = localStorage.getItem('userId')
    if (userData?.id || dbUserId) {
      setUserId(userData?.id ?? dbUserId)
    } else {
      navigate('/profile')
    }
  }, [navigate])

  useEffect(() => {
    if (userId) loadSubmissions()
  }, [userId])

  const loadSubmissions = async () => {
    if (!userId) return
    try {
      const res = await fetch(`${API_BASE_URL}/bonus-submissions/user/${userId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          const byTask = {}
          data.data.forEach((s) => {
            const current = byTask[s.task_id]
            const order = { approved: 3, pending: 2, rejected: 1 }
            if (!current || (order[s.status] || 0) > (order[current.status] || 0)) {
              byTask[s.task_id] = { status: s.status, link: s.link, promo_code: s.promo_code, id: s.id }
            }
          })
          setSubmissions(byTask)
        }
      }
    } catch (e) {
      console.error('Load bonus submissions:', e)
    }
  }

  const handleSubmit = async (taskId) => {
    const link = (linkInputs[taskId] || '').trim()
    if (!link) {
      setError('Вставьте ссылку на пост или профиль.')
      return
    }
    const task = TASKS.find((t) => t.id === taskId)
    if (!task) return
    if (!/^https?:\/\/.+/i.test(link)) {
      setError('Введите корректную ссылку (начинается с https://).')
      return
    }
    setError(null)
    setSubmitting(taskId)
    try {
      const res = await fetch(`${API_BASE_URL}/bonus-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          task_id: taskId,
          link,
          promo_code: task.promoCode,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setLinkInputs((prev) => ({ ...prev, [taskId]: '' }))
        await loadSubmissions()
        setExpandedTask(null)
      } else {
        setError(data.message || 'Не удалось отправить заявку.')
      }
    } catch (e) {
      setError('Ошибка сети. Попробуйте позже.')
    } finally {
      setSubmitting(null)
    }
  }

  const getTaskStatus = (taskId) => submissions[taskId]?.status || null

  useEffect(() => {
    if (celebratedRef.current || Object.keys(submissions).length === 0 || !userId) return
    const approved = TASKS.find((t) => submissions[t.id]?.status === 'approved')
    if (approved) {
      celebratedRef.current = true
      setCelebratingTask(approved.id)
      const t = setTimeout(() => setCelebratingTask(null), 2600)
      return () => clearTimeout(t)
    }
  }, [submissions, userId])

  if (!userId) return null

  return (
    <div className="bonuses-page">
      <Header />
      <div className="bonuses-page__bg" />
      <main className="bonuses-container">
        <div className="bonuses-header">
          <div className="bonuses-header__icon">
            <FiGift size={32} />
          </div>
          <h1 className="bonuses-header__title">Бонусные задания</h1>
          <p className="bonuses-header__subtitle">
            Выполняйте задания и получайте промокоды. Пришлите ссылку — мы проверим и одобрим заявку.
          </p>
        </div>

        {error && <div className="bonuses-error" role="alert">{error}</div>}

        <div className="bonuses-tasks">
          {TASKS.map((task) => {
            const status = getTaskStatus(task.id)
            const Icon = task.icon
            const isExpanded = expandedTask === task.id
            const isApproved = status === 'approved'
            const isPending = status === 'pending'
            const submission = submissions[task.id]

            return (
              <article
                key={task.id}
                className={`bonuses-task ${isApproved ? 'bonuses-task--done' : ''} ${isPending ? 'bonuses-task--pending' : ''}`}
              >
                <div className="bonuses-task__header">
                  <div className="bonuses-task__icon-wrap">
                    <Icon size={24} className="bonuses-task__icon" />
                  </div>
                  <div className="bonuses-task__title-wrap">
                    <h2 className="bonuses-task__title">{task.title}</h2>
                    {isApproved && (
                      <span className="bonuses-task__badge bonuses-task__badge--done">
                        <FiCheck size={14} /> Выполнено
                      </span>
                    )}
                    {isPending && (
                      <span className="bonuses-task__badge bonuses-task__badge--pending">На проверке</span>
                    )}
                  </div>
                  {!isApproved && !isPending && (
                    <button
                      type="button"
                      className="bonuses-task__toggle"
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? 'Свернуть' : 'Начать'}</span>
                      <FiChevronDown size={20} className={isExpanded ? 'bonuses-task__chevron--open' : ''} />
                    </button>
                  )}
                  {isPending && submission?.link && (
                    <a
                      href={submission.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bonuses-task__link-out"
                    >
                      <FiExternalLink size={18} /> Открыть ссылку
                    </a>
                  )}
                </div>

                {(isExpanded || isApproved) && (
                  <div className="bonuses-task__body">
                    {!isApproved && (
                      <>
                        <div className="bonuses-task__steps">
                          <h3 className="bonuses-task__steps-title">Что сделать:</h3>
                          <ol className="bonuses-task__steps-list">
                            {task.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div className="bonuses-task__submit">
                          <label className="bonuses-task__label" htmlFor={`bonus-link-${task.id}`}>
                            {task.linkHint}
                          </label>
                          <input
                            id={`bonus-link-${task.id}`}
                            type="url"
                            className="bonuses-task__input"
                            placeholder={task.linkPlaceholder}
                            value={linkInputs[task.id] || ''}
                            onChange={(e) => setLinkInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="bonuses-task__btn bonuses-task__btn--primary"
                            disabled={submitting === task.id}
                            onClick={() => handleSubmit(task.id)}
                          >
                            {submitting === task.id ? 'Отправка...' : 'Проверить'}
                          </button>
                        </div>
                      </>
                    )}

                    {isApproved && (
                      <div
                        className={`bonuses-task__congrats ${celebratingTask === task.id ? 'bonuses-task__congrats--animate' : ''}`}
                      >
                        {celebratingTask === task.id && (
                          <div className="bonuses-confetti" aria-hidden>
                            {Array.from({ length: 40 }).map((_, i) => (
                              <div key={i} className="bonuses-confetti__piece" />
                            ))}
                          </div>
                        )}
                        <p className="bonuses-task__congrats-text">Задание выполнено. Ваш промокод:</p>
                        <div className="bonuses-task__promo">{submission?.promo_code || task.promoCode}</div>
                        <p className="bonuses-task__congrats-hint">Используйте его при оплате или в корзине.</p>
                      </div>
                    )}
                  </div>
                )}

                {isApproved && celebratingTask !== task.id && (
                  <div className="bonuses-task__body">
                    <div className="bonuses-task__congrats">
                      <p className="bonuses-task__congrats-text">Ваш промокод:</p>
                      <div className="bonuses-task__promo">{submission?.promo_code || task.promoCode}</div>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default Bonuses
