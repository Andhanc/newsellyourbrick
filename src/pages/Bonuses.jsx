import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { FiChevronDown, FiCheck, FiGift, FiExternalLink, FiCopy, FiShoppingCart, FiUser, FiArrowLeft, FiUserPlus } from 'react-icons/fi'
import { FaInstagram, FaTiktok, FaGift, FaStar } from 'react-icons/fa'
import { MdCardGiftcard } from 'react-icons/md'
import Header from '../components/Header'
import { getUserData } from '../services/authService'
import './Bonuses.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const BUYER_TASKS = [
  {
    id: 1,
    title: 'Пост в Instagram с хештегом #sellyoubrick',
    icon: FaInstagram,
    promoCode: 'BONUS-INSTA-10',
    promoUsageLimit: 1,
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
    promoUsageLimit: 1,
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
    promoUsageLimit: 1,
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
    promoUsageLimit: 1,
    steps: [
      'Опубликуйте пост в Instagram (сторис или лента).',
      'Добавьте в пост ссылку на Sellyourbrick (в подписи или кнопка).',
      'Скопируйте ссылку на этот пост.',
      'Вставьте ссылку ниже и нажмите «Проверить».',
    ],
    linkPlaceholder: 'https://www.instagram.com/p/...',
    linkHint: 'Ссылка на пост со ссылкой на нас',
  },
  {
    id: 9,
    title: 'Пригласи друга',
    icon: FiUserPlus,
    promoCode: 'BONUS-REFER-10',
    promoUsageLimit: 1,
    referral: true,
    steps: [
      'Скопируйте вашу реферальную ссылку ниже.',
      'Отправьте её другу (соцсети, мессенджер — как удобно).',
      'Когда друг перейдёт по ссылке и зарегистрируется на сайте, задание будет выполнено.',
      'Промокод появится здесь автоматически — используйте его при покупке или в корзине.',
    ],
    linkPlaceholder: '',
    linkHint: '',
  },
]

const SELLER_TASKS = [
  {
    id: 5,
    title: 'Пост в Instagram с хештегом #sellyoubrick',
    icon: FaInstagram,
    promoCode: 'BONUS-SELLER-INSTA-10',
    promoUsageLimit: 1,
    steps: [
      'Создайте пост про ваше объявление или Sellyourbrick (фото или карусель).',
      'Добавьте в описание хештег #sellyoubrick.',
      'Опубликуйте пост и скопируйте ссылку на него.',
      'Вставьте ссылку ниже и нажмите «Проверить».',
    ],
    linkPlaceholder: 'https://www.instagram.com/p/...',
    linkHint: 'Ссылка на ваш пост в Instagram',
  },
  {
    id: 6,
    title: 'Видео в TikTok с хештегом #sellyoubrick',
    icon: FaTiktok,
    promoCode: 'BONUS-SELLER-TIKTOK-10',
    promoUsageLimit: 1,
    steps: [
      'Снимите короткое видео про вашу долю, недвижимость или Sellyourbrick.',
      'Добавьте хештег #sellyoubrick в описание.',
      'Опубликуйте видео и скопируйте ссылку.',
      'Вставьте ссылку ниже и нажмите «Проверить».',
    ],
    linkPlaceholder: 'https://www.tiktok.com/@username/video/...',
    linkHint: 'Ссылка на ваше видео в TikTok',
  },
  {
    id: 7,
    title: 'Ссылка на нас в описании профиля',
    icon: FaInstagram,
    promoCode: 'BONUS-SELLER-BIO-15',
    promoUsageLimit: 1,
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
    id: 8,
    title: 'Ссылка на нас в посте в Instagram',
    icon: FaInstagram,
    promoCode: 'BONUS-SELLER-LINK-15',
    promoUsageLimit: 1,
    steps: [
      'Опубликуйте пост в Instagram (сторис или лента) про ваше объявление или Sellyourbrick.',
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
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const fromListingFee = location.state?.fromListingFee === true
  const returnPath = location.state?.returnPath || '/owner/property/new'
  const [userId, setUserId] = useState(null)
  const [submissions, setSubmissions] = useState({})
  const [expandedTask, setExpandedTask] = useState(null)
  const [linkInputs, setLinkInputs] = useState({})
  const [submitting, setSubmitting] = useState(null)
  const [celebratingTask, setCelebratingTask] = useState(null)
  const [error, setError] = useState(null)
  const [copiedTaskId, setCopiedTaskId] = useState(null)
  const [usedMessageTaskId, setUsedMessageTaskId] = useState(null)
  const [bonusMode, setBonusMode] = useState(() => (tabParam === 'seller' ? 'seller' : 'buyer')) // 'buyer' | 'seller'
  const celebratedRef = useRef(false)

  const currentTasks = bonusMode === 'seller' ? SELLER_TASKS : BUYER_TASKS

  const copyPromoCode = (taskId, code, isUsed) => {
    if (!code) return
    if (isUsed) {
      setUsedMessageTaskId(taskId)
      setTimeout(() => setUsedMessageTaskId(null), 3000)
      return
    }
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedTaskId(taskId)
      setTimeout(() => setCopiedTaskId(null), 2600)
    })
  }

  useEffect(() => {
    const userData = getUserData()
    const dbUserId = localStorage.getItem('userId')
    const id = userData?.id || dbUserId
    if (id) {
      setUserId(id)
    } else {
      setUserId('') // не редиректим — показываем страницу с приглашением войти
    }
  }, [])

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
              byTask[s.task_id] = { status: s.status, link: s.link, promo_code: s.promo_code, id: s.id, used_at: s.used_at }
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
    const task = currentTasks.find((t) => t.id === taskId)
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
    const approved = currentTasks.find((t) => submissions[t.id]?.status === 'approved')
    if (approved) {
      celebratedRef.current = true
      setCelebratingTask(approved.id)
      const t = setTimeout(() => setCelebratingTask(null), 2600)
      return () => clearTimeout(t)
    }
  }, [submissions, userId])

  const isLoggedIn = userId !== null && userId !== ''

  return (
    <div className={`bonuses-page ${bonusMode === 'seller' ? 'bonuses-page--seller' : ''}`}>
      <Header />
      <div className="bonuses-page__bg" />
      <div className="bonuses-page__floats" aria-hidden>
        <FaGift className="bonuses-page__float bonuses-page__float--1" />
        <FaStar className="bonuses-page__float bonuses-page__float--2" />
        <MdCardGiftcard className="bonuses-page__float bonuses-page__float--3" />
        <FaStar className="bonuses-page__float bonuses-page__float--4" />
        <FaGift className="bonuses-page__float bonuses-page__float--5" />
        <FaStar className="bonuses-page__float bonuses-page__float--6" />
        <FaGift className="bonuses-page__float bonuses-page__float--7" />
        <FaStar className="bonuses-page__float bonuses-page__float--8" />
        <MdCardGiftcard className="bonuses-page__float bonuses-page__float--9" />
        <FaStar className="bonuses-page__float bonuses-page__float--10" />
        <FaGift className="bonuses-page__float bonuses-page__float--11" />
        <FaStar className="bonuses-page__float bonuses-page__float--12" />
        <MdCardGiftcard className="bonuses-page__float bonuses-page__float--13" />
        <FaGift className="bonuses-page__float bonuses-page__float--14" />
        <FaStar className="bonuses-page__float bonuses-page__float--15" />
        <FaGift className="bonuses-page__float bonuses-page__float--16" />
        <FaStar className="bonuses-page__float bonuses-page__float--17" />
        <MdCardGiftcard className="bonuses-page__float bonuses-page__float--18" />
        <FaStar className="bonuses-page__float bonuses-page__float--19" />
        <FaGift className="bonuses-page__float bonuses-page__float--20" />
        <FaStar className="bonuses-page__float bonuses-page__float--21" />
        <MdCardGiftcard className="bonuses-page__float bonuses-page__float--22" />
        <FaGift className="bonuses-page__float bonuses-page__float--23" />
        <FaStar className="bonuses-page__float bonuses-page__float--24" />
        <FaGift className="bonuses-page__float bonuses-page__float--25" />
        <FaStar className="bonuses-page__float bonuses-page__float--26" />
      </div>
      <main className={`bonuses-container ${bonusMode === 'seller' ? 'bonuses-container--seller' : ''}`}>
        <div className="bonuses-header">
          <div className="bonuses-header__icon-row">
            <div className="bonuses-header__deco bonuses-header__deco--left">
              <FaStar size={20} />
              <FaGift size={18} />
            </div>
            <div className="bonuses-header__icon">
              {bonusMode === 'seller' ? <FiUser size={32} /> : <FiGift size={32} />}
            </div>
            <div className="bonuses-header__deco bonuses-header__deco--right">
              <FaGift size={18} />
              <FaStar size={20} />
            </div>
          </div>
          <h1 className="bonuses-header__title">
            {bonusMode === 'seller' ? 'Бонусы для продавцов' : 'Бонусные задания'}
          </h1>
          <p className="bonuses-header__subtitle">
            {bonusMode === 'seller'
              ? 'Выполняйте задания и получайте скидки на комиссию и бонусы. Пришлите ссылку — мы проверим заявку.'
              : 'Выполняйте задания и получайте промокоды. Пришлите ссылку — мы проверим и одобрим заявку.'}
          </p>
          <div className="bonuses-header__strip" aria-hidden>
            <FaStar size={14} />
            <FaGift size={12} />
            <FaStar size={14} />
            <MdCardGiftcard size={14} />
            <FaStar size={14} />
          </div>
        </div>

        {fromListingFee && (
          <button
            type="button"
            className="bonuses-return-hint"
            onClick={() => navigate(returnPath, { state: { openListingFeeModal: true } })}
          >
            <FiArrowLeft size={20} className="bonuses-return-hint__icon" />
            <span className="bonuses-return-hint__text">Нажмите, чтобы вернуться к вашему объекту</span>
          </button>
        )}

        {userId === null && <div className="bonuses-loading">Загрузка...</div>}
        {userId !== null && !isLoggedIn && (
          <div className="bonuses-login-prompt">
            <p className="bonuses-login-prompt__text">Войдите в аккаунт, чтобы участвовать в бонусных заданиях и получать промокоды.</p>
            <button
              type="button"
              className="bonuses-login-prompt__btn"
              onClick={() => navigate('/profile')}
            >
              Войти в аккаунт
            </button>
          </div>
        )}

        {error && <div className="bonuses-error" role="alert">{error}</div>}

        {isLoggedIn && (
          <>
            <div className={`bonuses-tabs ${bonusMode === 'seller' ? 'bonuses-tabs--seller' : ''}`} role="tablist" aria-label="Тип бонусов">
              <div className="bonuses-tabs__track" aria-hidden>
                <div className="bonuses-tabs__pill" data-active={bonusMode} />
              </div>
              <button
                type="button"
                role="tab"
                aria-selected={bonusMode === 'buyer'}
                aria-controls="bonuses-tasks-buyer"
                id="tab-buyer"
                className={`bonuses-tabs__btn ${bonusMode === 'buyer' ? 'bonuses-tabs__btn--active' : ''}`}
                onClick={() => { setBonusMode('buyer'); setExpandedTask(null) }}
              >
                <FiShoppingCart size={20} className="bonuses-tabs__icon" />
                Для покупателя
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bonusMode === 'seller'}
                aria-controls="bonuses-tasks-seller"
                id="tab-seller"
                className={`bonuses-tabs__btn ${bonusMode === 'seller' ? 'bonuses-tabs__btn--active' : ''}`}
                onClick={() => { setBonusMode('seller'); setExpandedTask(null) }}
              >
                <FiUser size={20} className="bonuses-tabs__icon" />
                Для продавца
              </button>
            </div>
            <div className={`bonuses-tasks bonuses-tasks--${bonusMode}`} id={bonusMode === 'buyer' ? 'bonuses-tasks-buyer' : 'bonuses-tasks-seller'} role="tabpanel" aria-labelledby={bonusMode === 'buyer' ? 'tab-buyer' : 'tab-seller'}>
          {[...currentTasks]
            .sort((a, b) => {
              const usedA = submissions[a.id]?.used_at ? 1 : 0
              const usedB = submissions[b.id]?.used_at ? 1 : 0
              return usedA - usedB
            })
            .map((task) => {
            const status = getTaskStatus(task.id)
            const Icon = task.icon
            const isExpanded = expandedTask === task.id
            const isApproved = status === 'approved'
            const isPending = status === 'pending'
            const submission = submissions[task.id]

            return (
              <article
                key={task.id}
                className={`bonuses-task ${isApproved ? 'bonuses-task--done' : ''} ${isPending ? 'bonuses-task--pending' : ''} ${bonusMode === 'seller' ? 'bonuses-task--seller' : ''}`}
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
                        {task.referral ? (
                          <div className="bonuses-task__submit">
                            <label className="bonuses-task__label">Ваша реферальная ссылка</label>
                            <div className="bonuses-task__referral-row">
                              <input
                                readOnly
                                type="text"
                                className="bonuses-task__input bonuses-task__input--referral"
                                value={userId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${userId}` : ''}
                                aria-label="Реферальная ссылка"
                              />
                              <button
                                type="button"
                                className="bonuses-task__copy-btn bonuses-task__copy-btn--link"
                                onClick={() => {
                                  const link = userId ? `${window.location.origin}/?ref=${userId}` : ''
                                  if (link && navigator.clipboard?.writeText) {
                                    navigator.clipboard.writeText(link).then(() => {
                                      setCopiedTaskId(task.id)
                                      setTimeout(() => setCopiedTaskId(null), 2600)
                                    })
                                  }
                                }}
                                title="Скопировать ссылку"
                                aria-label="Скопировать реферальную ссылку"
                              >
                                {copiedTaskId === task.id ? (
                                  <FiCheck size={18} className="bonuses-task__copy-icon bonuses-task__copy-icon--done" />
                                ) : (
                                  <FiCopy size={18} className="bonuses-task__copy-icon" />
                                )}
                              </button>
                            </div>
                            <p className="bonuses-task__referral-hint">Поделитесь ссылкой с другом. После его регистрации вы получите промокод здесь.</p>
                          </div>
                        ) : (
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
                        )}
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
                        {copiedTaskId === task.id && (
                          <div className="bonuses-confetti bonuses-confetti--copy" aria-hidden>
                            {Array.from({ length: 40 }).map((_, i) => (
                              <div key={i} className="bonuses-confetti__piece" />
                            ))}
                          </div>
                        )}
                        <p className="bonuses-task__congrats-text">Задание выполнено. Ваш промокод:</p>
                        <div className="bonuses-task__promo-row">
                          <span className="bonuses-task__promo">{submission?.promo_code || task.promoCode}</span>
                          <button
                            type="button"
                            className="bonuses-task__copy-btn"
                            onClick={() => copyPromoCode(task.id, submission?.promo_code || task.promoCode, !!submission?.used_at)}
                            title={submission?.used_at ? 'Промокод уже использован' : 'Скопировать промокод'}
                            aria-label={submission?.used_at ? 'Промокод уже использован' : 'Скопировать промокод'}
                          >
                            {copiedTaskId === task.id ? (
                              <FiCheck size={18} className="bonuses-task__copy-icon bonuses-task__copy-icon--done" />
                            ) : (
                              <FiCopy size={18} className="bonuses-task__copy-icon" />
                            )}
                          </button>
                        </div>
                        {usedMessageTaskId === task.id && (
                          <div className="bonuses-task__used-toast" role="alert">
                            <FiCheck size={16} />
                            <span>Промокод уже использован</span>
                          </div>
                        )}
                        <p className="bonuses-task__promo-usage">
                          Можно использовать: {task.promoUsageLimit ?? 1}{' '}
                          {(task.promoUsageLimit ?? 1) >= 2 && (task.promoUsageLimit ?? 1) <= 4 ? 'раза' : 'раз'}
                        </p>
                        {submission?.used_at ? (
                          <p className="bonuses-task__promo-used">
                            <FiCheck size={14} /> Промокод использован при публикации объекта
                          </p>
                        ) : (
                          <p className="bonuses-task__congrats-hint">Используйте его при оплате или в корзине.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Bonuses
