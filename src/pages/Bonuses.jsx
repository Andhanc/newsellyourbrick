import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiExternalLink, FiCopy, FiShoppingCart, FiUser, FiArrowLeft, FiUserPlus, FiArrowUpRight, FiChevronDown } from 'react-icons/fi'
import { FaInstagram, FaTiktok } from 'react-icons/fa'
import Header from '../components/Header'
import BuyerSheetShell from '../components/buyer-mobile/BuyerSheetShell'
import { getUserData } from '../services/authService'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { subscribeBonusSubmissionsChanged } from '../utils/bonusSubmissionsSync'
import '../styles/drawerDismiss.css'
import './Bonuses.css'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

const BUYER_TASKS = [
  { id: 1, titleKey: 'bonus1Title', icon: FaInstagram, promoCode: 'BONUS-INSTA-10', promoUsageLimit: 1, stepKeys: ['bonus1Step1', 'bonus1Step2', 'bonus1Step3', 'bonus1Step4'], linkPlaceholderKey: 'bonus1Placeholder', linkHintKey: 'bonus1Hint' },
  { id: 2, titleKey: 'bonus2Title', icon: FaTiktok, promoCode: 'BONUS-TIKTOK-10', promoUsageLimit: 1, stepKeys: ['bonus2Step1', 'bonus2Step2', 'bonus2Step3', 'bonus2Step4'], linkPlaceholderKey: 'bonus2Placeholder', linkHintKey: 'bonus2Hint' },
  { id: 3, titleKey: 'bonus3Title', icon: FaInstagram, promoCode: 'BONUS-BIO-15', promoUsageLimit: 1, stepKeys: ['bonus3Step1', 'bonus3Step2', 'bonus3Step3', 'bonus3Step4'], linkPlaceholderKey: 'bonus3Placeholder', linkHintKey: 'bonus3Hint' },
  { id: 4, titleKey: 'bonus4Title', icon: FaInstagram, promoCode: 'BONUS-LINK-15', promoUsageLimit: 1, stepKeys: ['bonus4Step1', 'bonus4Step2', 'bonus4Step3', 'bonus4Step4'], linkPlaceholderKey: 'bonus4Placeholder', linkHintKey: 'bonus4Hint' },
  { id: 9, titleKey: 'bonus9Title', icon: FiUserPlus, promoCode: 'BONUS-REFER-10', promoUsageLimit: 1, referral: true, stepKeys: ['bonus9Step1', 'bonus9Step2', 'bonus9Step3', 'bonus9Step4'], linkPlaceholderKey: '', linkHintKey: '' },
]

const SELLER_TASKS = [
  { id: 5, titleKey: 'bonus5Title', icon: FaInstagram, promoCode: 'BONUS-SELLER-INSTA-10', promoUsageLimit: 1, stepKeys: ['bonus5Step1', 'bonus5Step2', 'bonus5Step3', 'bonus5Step4'], linkPlaceholderKey: 'bonus5Placeholder', linkHintKey: 'bonus5Hint' },
  { id: 6, titleKey: 'bonus6Title', icon: FaTiktok, promoCode: 'BONUS-SELLER-TIKTOK-10', promoUsageLimit: 1, stepKeys: ['bonus6Step1', 'bonus6Step2', 'bonus6Step3', 'bonus6Step4'], linkPlaceholderKey: 'bonus6Placeholder', linkHintKey: 'bonus6Hint' },
  { id: 7, titleKey: 'bonus7Title', icon: FaInstagram, promoCode: 'BONUS-SELLER-BIO-15', promoUsageLimit: 1, stepKeys: ['bonus7Step1', 'bonus7Step2', 'bonus7Step3', 'bonus7Step4'], linkPlaceholderKey: 'bonus7Placeholder', linkHintKey: 'bonus7Hint' },
  { id: 8, titleKey: 'bonus8Title', icon: FaInstagram, promoCode: 'BONUS-SELLER-LINK-15', promoUsageLimit: 1, stepKeys: ['bonus8Step1', 'bonus8Step2', 'bonus8Step3', 'bonus8Step4'], linkPlaceholderKey: 'bonus8Placeholder', linkHintKey: 'bonus8Hint' },
]

const ALL_TASKS = [...BUYER_TASKS, ...SELLER_TASKS]
const ALL_SOCIAL_TASKS = [...BUYER_TASKS.filter((task) => !task.referral), ...SELLER_TASKS]

const Bonuses = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoaded: userLoaded } = useUser()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const fromListingFee = location.state?.fromListingFee === true
  const returnPath = location.state?.returnPath || '/owner/property/new'
  const [userId, setUserId] = useState(null)
  const [submissions, setSubmissions] = useState({})
  const [expandedTask, setExpandedTask] = useState(null)
  const [ticketOrigin, setTicketOrigin] = useState(null)
  const [linkInputs, setLinkInputs] = useState({})
  const [submitting, setSubmitting] = useState(null)
  const [celebratingTask, setCelebratingTask] = useState(null)
  const [error, setError] = useState(null)
  const [copiedTaskId, setCopiedTaskId] = useState(null)
  const [usedMessageTaskId, setUsedMessageTaskId] = useState(null)
  const [bonusMode, setBonusMode] = useState(() => (tabParam === 'seller' ? 'seller' : 'buyer')) // 'buyer' | 'seller'
  const [isAdminSession, setIsAdminSession] = useState(false)
  const celebratedRef = useRef(false)

  useEffect(() => {
    if (!userLoaded) return
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/', { replace: true })
    }
  }, [user, userLoaded, navigate])

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
    const storedRole = localStorage.getItem('userRole')
    const normalizedRole = userData?.role || storedRole || 'buyer'
    const adminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true'
    const adminActive = adminLoggedIn && normalizedRole === 'admin'

    setIsAdminSession(adminActive)

    // Для обычных пользователей показываем только их бонусы.
    // Для админа оставляем текущую логику со свободным переключением вкладок.
    if (!adminActive) {
      const roleMode = normalizedRole === 'seller' || normalizedRole === 'owner' ? 'seller' : 'buyer'
      setBonusMode(roleMode)
    } else {
      setBonusMode(tabParam === 'seller' ? 'seller' : 'buyer')
    }

    if (id) {
      setUserId(id)
    } else {
      setUserId('') // не редиректим — показываем страницу с приглашением войти
    }
  }, [tabParam])

  const loadSubmissions = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`${API_BASE_URL}/bonus-submissions/user/${userId}`, { cache: 'no-store' })
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
  }, [userId])

  useEffect(() => {
    if (userId) loadSubmissions()
  }, [userId, loadSubmissions])

  useEffect(() => {
    if (!userId) return
    return subscribeBonusSubmissionsChanged(loadSubmissions)
  }, [userId, loadSubmissions])

  const handleSubmit = async (taskId) => {
    const link = (linkInputs[taskId] || '').trim()
    if (!link) {
      setError(t('bonusesErrorLink'))
      return
    }
    const task = ALL_TASKS.find((x) => x.id === taskId)
    if (!task) return
    if (!/^https?:\/\/.+/i.test(link)) {
      setError(t('bonusesErrorInvalidLink'))
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
      if (data.success && data.data) {
        const row = data.data
        setSubmissions((prev) => ({
          ...prev,
          [taskId]: {
            status: row.status,
            link,
            promo_code: task.promoCode,
            id: row.id,
            used_at: prev[taskId]?.used_at ?? null,
          },
        }))
        setLinkInputs((prev) => ({ ...prev, [taskId]: '' }))
        await loadSubmissions()
        setExpandedTask(null)
      } else {
        setError(data.message || t('bonusesErrorSubmit'))
      }
    } catch (e) {
      setError(t('bonusesErrorNetwork'))
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

  const displayTasks = ALL_SOCIAL_TASKS
  const selectedTask = expandedTask == null
    ? null
    : ALL_TASKS.find((task) => task.id === expandedTask) || null
  const selectedStatus = selectedTask ? getTaskStatus(selectedTask.id) : null
  const selectedSubmission = selectedTask ? submissions[selectedTask.id] : null
  const SelectedTaskIcon = selectedTask?.icon || null

  const openTaskDrawer = (taskId, trigger) => {
    setError(null)
    const rect = trigger?.getBoundingClientRect?.()
    if (rect && typeof window !== 'undefined') {
      const targetWidth = Math.min(window.innerWidth - 32, 760)
      const targetHeight = Math.min(window.innerHeight * 0.82, 720)
      setTicketOrigin({
        x: rect.left + (rect.width / 2) - (window.innerWidth / 2),
        y: rect.top + (rect.height / 2) - (window.innerHeight / 2),
        scale: Math.max(0.24, Math.min(rect.width / targetWidth, rect.height / targetHeight)),
      })
    } else {
      setTicketOrigin(null)
    }
    setExpandedTask(taskId)
  }

  const closeTaskDrawer = () => {
    setError(null)
    setTicketOrigin(null)
    setExpandedTask(null)
  }

  const heroStats = useMemo(() => [
    {
      id: 'discount',
      value: t('bonusesHeroStat1Value'),
      label: t('bonusesHeroStat1Label'),
      description: t('bonusesHeroStat1Desc'),
      featured: true,
    },
    {
      id: 'tasks',
      value: t('bonusesHeroStat2Value'),
      label: t('bonusesHeroStat2Label'),
    },
    {
      id: 'social',
      value: t('bonusesHeroStat3Value'),
      label: t('bonusesHeroStat3Label'),
    },
    {
      id: 'review',
      value: t('bonusesHeroStat4Value'),
      label: t('bonusesHeroStat4Label'),
    },
  ], [t, i18n.language, bonusMode])

  return (
    <div className={`bonuses-page ${bonusMode === 'seller' ? 'bonuses-page--seller' : ''}`}>
      <Header />
      <section className="bonuses-hero" aria-labelledby="bonuses-hero-title">
        <div className="bonuses-hero__inner">
          <h1 id="bonuses-hero-title" className="bonuses-hero__title">
            <span className="bonuses-hero__title-line">
              {bonusMode === 'seller' ? t('bonusesHeroTitleLine1Seller') : t('bonusesHeroTitleLine1')}
            </span>
            <span className="bonuses-hero__title-line bonuses-hero__title-line--bottom">
              {bonusMode === 'seller' ? t('bonusesHeroTitleLine2Seller') : t('bonusesHeroTitleLine2')}
              {' '}
              <span className="bonuses-hero__title-accent">
                {bonusMode === 'seller' ? t('bonusesHeroTitleAccentSeller') : t('bonusesHeroTitleAccent')}
              </span>
            </span>
          </h1>
          <p className="bonuses-hero__subtitle">
            {bonusMode === 'seller' ? t('bonusesSubtitleSeller') : t('bonusesSubtitleBuyer')}
          </p>
          <div className="bonuses-hero__visual">
            <img
              className="bonuses-hero__gift"
              src="/images/bonuses/bonuses-hero-gifts-line-v3-trimmed.png"
              alt=""
              width={777}
              height={1003}
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div className="bonuses-hero__stats" aria-label={t('bonusesHeroStatsAria')}>
            {heroStats.map((stat) => (
              <article
                key={stat.id}
                className={`bonuses-hero__stat ${stat.featured ? 'bonuses-hero__stat--featured' : ''}`}
              >
                {stat.featured && (
                  <span className="bonuses-hero__stat-icon" aria-hidden>
                    <FiArrowUpRight size={18} strokeWidth={2.25} />
                  </span>
                )}
                <strong className="bonuses-hero__stat-value">{stat.value}</strong>
                <span className="bonuses-hero__stat-label">{stat.label}</span>
                {stat.description && (
                  <p className="bonuses-hero__stat-desc">{stat.description}</p>
                )}
              </article>
            ))}
          </div>
          <div className="bonuses-hero__scroll-hint">
            <button
              type="button"
              className="bonuses-hero__scroll-button"
              aria-label={i18n.language === 'ru' ? 'Перейти к бонусным заданиям' : 'Explore bonus tasks'}
              onClick={() => document.getElementById('bonuses-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <FiChevronDown size={24} strokeWidth={2.7} aria-hidden />
            </button>
          </div>
        </div>
      </section>
      <main id="bonuses-content" className={`bonuses-container ${bonusMode === 'seller' ? 'bonuses-container--seller' : ''}`}>

        {fromListingFee && (
          <button
            type="button"
            className="bonuses-return-hint"
            onClick={() => navigate(returnPath, { state: { openListingFeeModal: true } })}
          >
            <FiArrowLeft size={20} className="bonuses-return-hint__icon" />
            <span className="bonuses-return-hint__text">{t('bonusesReturnHint')}</span>
          </button>
        )}

        {userId === null && <div className="bonuses-loading">{t('loading')}</div>}
        {userId !== null && !isLoggedIn && (
          <div className="bonuses-login-prompt">
            <p className="bonuses-login-prompt__text">{t('bonusesLoginText')}</p>
            <button
              type="button"
              className="bonuses-login-prompt__btn"
              onClick={() => navigate('/profile')}
            >
              {t('bonusesLoginBtn')}
            </button>
          </div>
        )}

        {isLoggedIn && (
          <>
            {isAdminSession && (
              <div className={`bonuses-tabs ${bonusMode === 'seller' ? 'bonuses-tabs--seller' : ''}`} role="tablist" aria-label={t('bonusesTabsAria')}>
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
                  {t('bonusesTabBuyer')}
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
                  {t('bonusesTabSeller')}
                </button>
              </div>
            )}
            <div
              className="bonuses-tasks"
              id={bonusMode === 'buyer' ? 'bonuses-tasks-buyer' : 'bonuses-tasks-seller'}
              role="tabpanel"
              aria-labelledby={isAdminSession ? (bonusMode === 'buyer' ? 'tab-buyer' : 'tab-seller') : undefined}
            >
              {[...displayTasks]
                .sort((a, b) => {
                  const usedA = submissions[a.id]?.used_at ? 1 : 0
                  const usedB = submissions[b.id]?.used_at ? 1 : 0
                  return usedA - usedB
                })
                .map((task) => {
                  const status = getTaskStatus(task.id)
                  const Icon = task.icon
                  const isApproved = status === 'approved'
                  const isPending = status === 'pending'
                  const isUsed = Boolean(submissions[task.id]?.used_at)

                  return (
                    <article
                      key={task.id}
                      className={`bonuses-ticket ${isApproved ? 'bonuses-ticket--done' : ''} ${isPending ? 'bonuses-ticket--pending' : ''} ${isUsed ? 'bonuses-ticket--used' : ''}`}
                    >
                      <button
                        type="button"
                        className="bonuses-ticket__button"
                        onClick={(event) => openTaskDrawer(task.id, event.currentTarget)}
                        aria-haspopup="dialog"
                        aria-controls="bonuses-task-drawer"
                        aria-label={`${t(task.titleKey)}, №${task.id}`}
                      >
                        <span className="bonuses-ticket__main">
                          <span className="bonuses-ticket__meta">
                            <span className="bonuses-ticket__number">№ {String(task.id).padStart(2, '0')}</span>
                            {isApproved ? (
                              <span className="bonuses-ticket__status bonuses-ticket__status--done">
                                <FiCheck size={13} aria-hidden /> {t('bonusesTaskDone')}
                              </span>
                            ) : isPending ? (
                              <span className="bonuses-ticket__status bonuses-ticket__status--pending">
                                {t('bonusesTaskPending')}
                              </span>
                            ) : null}
                          </span>
                          <span className="bonuses-ticket__content">
                            <span className="bonuses-ticket__icon-wrap" aria-hidden>
                              <Icon size={24} className="bonuses-ticket__icon" />
                            </span>
                            <span className="bonuses-ticket__title">{t(task.titleKey)}</span>
                          </span>
                          <span className="bonuses-ticket__barcode" aria-hidden />
                        </span>
                        <span className="bonuses-ticket__stub" aria-hidden>
                          <span className="bonuses-ticket__stub-label">
                            {isApproved ? t('bonusesTaskDone') : isPending ? t('bonusesTaskPending') : t('bonusesTaskExpand')}
                          </span>
                          <span className="bonuses-ticket__open-icon">
                            <FiArrowUpRight size={20} strokeWidth={2.2} />
                          </span>
                        </span>
                      </button>
                    </article>
                  )
                })}
            </div>
          </>
        )}
      </main>

      <BuyerSheetShell
        isOpen={Boolean(selectedTask)}
        onClose={closeTaskDrawer}
        labelledBy="bonuses-task-drawer-title"
        describedBy="bonuses-task-drawer-description"
        closeLabel={t('close')}
        tone={selectedStatus === 'approved' ? 'success' : 'detail'}
        className="bonuses-task-drawer"
      >
        {selectedTask ? (
          <div
            id="bonuses-task-drawer"
            className="bonuses-drawer"
            style={{
              '--bonuses-origin-x': `${ticketOrigin?.x || 0}px`,
              '--bonuses-origin-y': `${ticketOrigin?.y || 0}px`,
              '--bonuses-origin-scale': ticketOrigin?.scale || 0.42,
            }}
          >
            <span className="bonuses-cinema__halo" aria-hidden />
            <div className="bonuses-cinema__ticket">
              <section className="bonuses-cinema__face bonuses-cinema__front" aria-hidden="true">
                <span className="bonuses-cinema__paper-grain" />
                <div className="bonuses-cinema__front-topline">
                  <span>SELL YOUR BRICK</span>
                  <span>№ {String(selectedTask.id).padStart(2, '0')}</span>
                </div>
                <div className="bonuses-cinema__front-content">
                  <span className="bonuses-cinema__front-icon">
                    {SelectedTaskIcon ? <SelectedTaskIcon size={34} /> : null}
                  </span>
                  <span className="bonuses-cinema__front-kicker">BONUS TICKET</span>
                  <strong>{t(selectedTask.titleKey)}</strong>
                </div>
                <div className="bonuses-cinema__front-footer">
                  <span className="bonuses-cinema__barcode" />
                  <span>{selectedStatus === 'approved' ? t('bonusesTaskDone') : selectedStatus === 'pending' ? t('bonusesTaskPending') : t('bonusesTaskExpand')}</span>
                </div>
              </section>

              <section className="bonuses-cinema__face bonuses-cinema__back">
                <span className="bonuses-cinema__paper-grain" aria-hidden />
                <span className="bonuses-cinema__spectral-sweep" aria-hidden />
                <div className="bonuses-cinema__back-scroll">
                  <header className="bonuses-drawer__header">
                    <span className="bonuses-drawer__eyebrow">Инструкция · № {String(selectedTask.id).padStart(2, '0')}</span>
                    <h2 id="bonuses-task-drawer-title" className="bonuses-drawer__title">
                      {t(selectedTask.titleKey)}
                    </h2>
                  </header>

            <section id="bonuses-task-drawer-description" className="bonuses-drawer__description">
              <h3>{t('bonusesTaskStepsTitle')}</h3>
              <ol className="bonuses-drawer__steps">
                {selectedTask.stepKeys.map((stepKey, index) => (
                  <li key={stepKey}>
                    <span>{index + 1}</span>
                    <p>{t(stepKey)}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className={`bonuses-drawer__verification ${selectedStatus === 'approved' ? 'bonuses-drawer__verification--approved' : ''}`}>
              <div className="bonuses-drawer__verification-head">
                <span>{t('bonusesTaskCheck')}</span>
                {selectedStatus === 'pending' ? (
                  <strong>{t('bonusesTaskPending')}</strong>
                ) : selectedStatus === 'approved' ? (
                  <strong><FiCheck size={14} aria-hidden /> {t('bonusesTaskDone')}</strong>
                ) : null}
              </div>

              {error ? <div className="bonuses-error" role="alert">{error}</div> : null}

              {selectedStatus === 'approved' ? (
                <div className={`bonuses-task__congrats ${celebratingTask === selectedTask.id ? 'bonuses-task__congrats--animate' : ''}`}>
                  {(celebratingTask === selectedTask.id || copiedTaskId === selectedTask.id) ? (
                    <div className={`bonuses-confetti ${copiedTaskId === selectedTask.id ? 'bonuses-confetti--copy' : ''}`} aria-hidden>
                      {Array.from({ length: 28 }).map((_, index) => (
                        <span key={index} className="bonuses-confetti__piece" />
                      ))}
                    </div>
                  ) : null}
                  <p className="bonuses-task__congrats-text">{t('bonusesTaskCongrats')}</p>
                  <div className="bonuses-task__promo-row">
                    <span className="bonuses-task__promo">{selectedSubmission?.promo_code || selectedTask.promoCode}</span>
                    <button
                      type="button"
                      className="bonuses-task__copy-btn"
                      onClick={() => copyPromoCode(selectedTask.id, selectedSubmission?.promo_code || selectedTask.promoCode, Boolean(selectedSubmission?.used_at))}
                      title={selectedSubmission?.used_at ? t('bonusesTaskPromoUsed') : t('bonusesTaskCopyPromo')}
                      aria-label={selectedSubmission?.used_at ? t('bonusesTaskPromoUsed') : t('bonusesTaskCopyPromo')}
                    >
                      {copiedTaskId === selectedTask.id ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    </button>
                  </div>
                  {usedMessageTaskId === selectedTask.id ? (
                    <div className="bonuses-task__used-toast" role="alert">
                      <FiCheck size={16} />
                      <span>{t('bonusesTaskPromoUsed')}</span>
                    </div>
                  ) : null}
                  <p className="bonuses-task__promo-usage">
                    {t('bonusesTaskUsage', { count: selectedTask.promoUsageLimit ?? 1 })}
                  </p>
                  {selectedSubmission?.used_at ? (
                    <p className="bonuses-task__promo-used"><FiCheck size={14} /> {t('bonusesTaskUsedAt')}</p>
                  ) : (
                    <p className="bonuses-task__congrats-hint">{t('bonusesTaskUseHint')}</p>
                  )}
                </div>
              ) : selectedStatus === 'pending' ? (
                <div className="bonuses-drawer__pending">
                  <p>{t('bonusesTaskPending')}</p>
                  {selectedSubmission?.link ? (
                    <a href={selectedSubmission.link} target="_blank" rel="noopener noreferrer" className="bonuses-task__link-out">
                      <FiExternalLink size={18} /> {t('bonusesTaskOpenLink')}
                    </a>
                  ) : null}
                </div>
              ) : selectedTask.referral ? (
                <div className="bonuses-task__submit">
                  <label className="bonuses-task__label" htmlFor={`bonus-referral-${selectedTask.id}`}>{t('bonusesReferralLabel')}</label>
                  <div className="bonuses-task__referral-row">
                    <input
                      id={`bonus-referral-${selectedTask.id}`}
                      readOnly
                      type="text"
                      className="bonuses-task__input bonuses-task__input--referral"
                      value={userId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${userId}` : ''}
                    />
                    <button
                      type="button"
                      className="bonuses-task__copy-btn bonuses-task__copy-btn--link"
                      onClick={() => {
                        const link = userId ? `${window.location.origin}/?ref=${userId}` : ''
                        if (link && navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(link).then(() => {
                            setCopiedTaskId(selectedTask.id)
                            setTimeout(() => setCopiedTaskId(null), 2600)
                          })
                        }
                      }}
                      title={t('bonusesCopyLink')}
                      aria-label={t('bonusesCopyLinkAria')}
                    >
                      {copiedTaskId === selectedTask.id ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    </button>
                  </div>
                  <p className="bonuses-task__referral-hint">{t('bonusesReferralHint')}</p>
                </div>
              ) : (
                <div className="bonuses-task__submit">
                  <label className="bonuses-task__label" htmlFor={`bonus-link-${selectedTask.id}`}>
                    {t(selectedTask.linkHintKey)}
                  </label>
                  <input
                    id={`bonus-link-${selectedTask.id}`}
                    type="url"
                    className="bonuses-task__input"
                    placeholder={t(selectedTask.linkPlaceholderKey)}
                    value={linkInputs[selectedTask.id] || ''}
                    onChange={(event) => {
                      setError(null)
                      setLinkInputs((prev) => ({ ...prev, [selectedTask.id]: event.target.value }))
                    }}
                  />
                  <button
                    type="button"
                    className="bonuses-task__btn bonuses-task__btn--primary btn-tiffany-shine"
                    disabled={submitting === selectedTask.id}
                    onClick={() => handleSubmit(selectedTask.id)}
                  >
                    {submitting === selectedTask.id ? t('bonusesTaskSubmitting') : t('bonusesTaskCheck')}
                  </button>
                </div>
              )}
                  </section>
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </BuyerSheetShell>
    </div>
  )
}

export default Bonuses
