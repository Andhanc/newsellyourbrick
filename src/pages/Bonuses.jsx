import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiChevronDown, FiCheck, FiGift, FiExternalLink, FiCopy, FiShoppingCart, FiUser, FiArrowLeft, FiUserPlus } from 'react-icons/fi'
import { FaInstagram, FaTiktok, FaGift, FaStar } from 'react-icons/fa'
import { MdCardGiftcard } from 'react-icons/md'
import Header from '../components/Header'
import { getUserData } from '../services/authService'
import { subscribeBonusSubmissionsChanged } from '../utils/bonusSubmissionsSync'
import './Bonuses.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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

const Bonuses = () => {
  const { t } = useTranslation()
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
    const task = currentTasks.find((x) => x.id === taskId)
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
            {bonusMode === 'seller' ? t('bonusesTitleSeller') : t('bonusesTitleBuyer')}
          </h1>
          <p className="bonuses-header__subtitle">
            {bonusMode === 'seller' ? t('bonusesSubtitleSeller') : t('bonusesSubtitleBuyer')}
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

        {error && <div className="bonuses-error" role="alert">{error}</div>}

        {isLoggedIn && (
          <>
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
                    <h2 className="bonuses-task__title">{t(task.titleKey)}</h2>
                    {isApproved && (
                      <span className="bonuses-task__badge bonuses-task__badge--done">
                        <FiCheck size={14} /> {t('bonusesTaskDone')}
                      </span>
                    )}
                    {isPending && (
                      <span className="bonuses-task__badge bonuses-task__badge--pending">{t('bonusesTaskPending')}</span>
                    )}
                  </div>
                  {!isApproved && !isPending && (
                    <button
                      type="button"
                      className="bonuses-task__toggle"
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? t('bonusesTaskCollapse') : t('bonusesTaskExpand')}</span>
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
                      <FiExternalLink size={18} /> {t('bonusesTaskOpenLink')}
                    </a>
                  )}
                </div>

                {(isExpanded || isApproved) && (
                  <div className="bonuses-task__body">
                    {!isApproved && (
                      <>
                        <div className="bonuses-task__steps">
                          <h3 className="bonuses-task__steps-title">{t('bonusesTaskStepsTitle')}</h3>
                          <ol className="bonuses-task__steps-list">
                            {task.stepKeys.map((stepKey, i) => (
                              <li key={i}>{t(stepKey)}</li>
                            ))}
                          </ol>
                        </div>
{task.referral ? (
                          <div className="bonuses-task__submit">
                            <label className="bonuses-task__label">{t('bonusesReferralLabel')}</label>
                            <div className="bonuses-task__referral-row">
                              <input
                                readOnly
                                type="text"
                                className="bonuses-task__input bonuses-task__input--referral"
                                value={userId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${userId}` : ''}
                                aria-label={t('bonusesReferralLabel')}
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
                                title={t('bonusesCopyLink')}
                                aria-label={t('bonusesCopyLinkAria')}
                              >
                                {copiedTaskId === task.id ? (
                                  <FiCheck size={18} className="bonuses-task__copy-icon bonuses-task__copy-icon--done" />
                                ) : (
                                  <FiCopy size={18} className="bonuses-task__copy-icon" />
                                )}
                              </button>
                            </div>
                            <p className="bonuses-task__referral-hint">{t('bonusesReferralHint')}</p>
                          </div>
                        ) : (
                          <div className="bonuses-task__submit">
                            <label className="bonuses-task__label" htmlFor={`bonus-link-${task.id}`}>
                              {t(task.linkHintKey)}
                            </label>
                            <input
                              id={`bonus-link-${task.id}`}
                              type="url"
                              className="bonuses-task__input"
                              placeholder={t(task.linkPlaceholderKey)}
                              value={linkInputs[task.id] || ''}
                              onChange={(e) => setLinkInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="bonuses-task__btn bonuses-task__btn--primary"
                              disabled={submitting === task.id}
                              onClick={() => handleSubmit(task.id)}
                            >
                              {submitting === task.id ? t('bonusesTaskSubmitting') : t('bonusesTaskCheck')}
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
                        <p className="bonuses-task__congrats-text">{t('bonusesTaskCongrats')}</p>
                        <div className="bonuses-task__promo-row">
                          <span className="bonuses-task__promo">{submission?.promo_code || task.promoCode}</span>
                          <button
                            type="button"
                            className="bonuses-task__copy-btn"
                            onClick={() => copyPromoCode(task.id, submission?.promo_code || task.promoCode, !!submission?.used_at)}
                            title={submission?.used_at ? t('bonusesTaskPromoUsed') : t('bonusesTaskCopyPromo')}
                            aria-label={submission?.used_at ? t('bonusesTaskPromoUsed') : t('bonusesTaskCopyPromo')}
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
                            <span>{t('bonusesTaskPromoUsed')}</span>
                          </div>
                        )}
                        <p className="bonuses-task__promo-usage">
                          {t('bonusesTaskUsage', { count: task.promoUsageLimit ?? 1 })}
                        </p>
                        {submission?.used_at ? (
                          <p className="bonuses-task__promo-used">
                            <FiCheck size={14} /> {t('bonusesTaskUsedAt')}
                          </p>
                        ) : (
                          <p className="bonuses-task__congrats-hint">{t('bonusesTaskUseHint')}</p>
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
