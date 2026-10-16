import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { FiArrowLeft, FiCheck, FiEdit2, FiHome, FiLock, FiPlus, FiTarget, FiX } from 'react-icons/fi'
import { publicAsset } from '../utils/publicAsset'
import './PiggyBankPage.css'

const PIGGY = publicAsset('images/piggy-bank/piggy-bank.webp')
const BIKE = publicAsset('images/piggy-bank/bicycle-goal.webp')
const CAR = publicAsset('images/piggy-bank/rc-car-goal.webp')
const COIN = publicAsset('images/piggy-bank/gold-coin.webp')
const TICKETS = publicAsset('images/piggy-bank/tiffany-tickets.webp')
const STORAGE_KEY = 'syb-piggy-bank-demo-v1'
const INITIAL_GOAL = { id: 'rc-car', nameKey: 'piggyBank.goalCar', target: 10000, saved: 7564, image: CAR }
const DAY_REWARDS = [30, 50, 100, 150, 200, 300]
const COINS = Array.from({ length: 19 }, (_, index) => ({
  left: `${5 + ((index * 29) % 91)}%`,
  delay: `${(index % 7) * 0.12}s`,
  duration: `${1.25 + (index % 5) * 0.13}s`,
  size: `${25 + (index % 4) * 10}px`,
  drift: `${((index * 37) % 101) - 50}px`,
}))

function readDemo() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (stored && Array.isArray(stored.goals) && Number.isFinite(stored.balance)) return stored
  } catch {
    // Private browsing may deny local storage; the page still works in memory.
  }
  return { balance: 21349, goals: [INITIAL_GOAL], rewardVisible: true }
}

function saveDemo(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Keep the current session interactive even when storage is unavailable.
  }
}

export default function PiggyBankPage() {
  const { t, i18n } = useTranslation()
  const { user } = useUser()
  const navigate = useNavigate()
  const [demo, setDemo] = useState(readDemo)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [celebration, setCelebration] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState('bike')
  const [goalName, setGoalName] = useState('')
  const [goalAmount, setGoalAmount] = useState('15000')
  const [moneyAction, setMoneyAction] = useState(null)
  const [moneyAmount, setMoneyAmount] = useState('500')
  const [message, setMessage] = useState('')
  const drawerTriggerRef = useRef(null)
  const drawerCloseRef = useRef(null)

  const updateDemo = (makeNext) => {
    setDemo((current) => {
      const next = makeNext(current)
      saveDemo(next)
      return next
    })
  }

  const formatMoney = (value) => `${new Intl.NumberFormat(i18n.language || 'ru').format(value)} ₽`
  const firstName = user?.firstName || t('piggyBank.defaultName')
  const presets = [
    { id: 'bike', label: t('piggyBank.goalBike'), amount: 15000, image: BIKE },
    { id: 'car', label: t('piggyBank.goalCar'), amount: 10000, image: CAR },
    { id: 'home', label: t('piggyBank.goalHome'), amount: 100000, icon: FiHome },
  ]

  useEffect(() => {
    if (!celebration) return undefined
    const timer = window.setTimeout(() => setCelebration(0), 2200)
    return () => window.clearTimeout(timer)
  }, [celebration])

  useEffect(() => {
    if (!drawerOpen && !moneyAction) return undefined
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
        setMoneyAction(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    if (drawerOpen) window.setTimeout(() => drawerCloseRef.current?.focus(), 0)
    return () => {
      document.body.style.overflow = oldOverflow
      document.removeEventListener('keydown', onKeyDown)
      drawerTriggerRef.current?.focus()
    }
  }, [drawerOpen, moneyAction])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 2600)
    return () => window.clearTimeout(timer)
  }, [message])

  const selectPreset = (preset) => {
    setSelectedPreset(preset.id)
    setGoalName(preset.label)
    setGoalAmount(String(preset.amount))
  }

  const openGoalDrawer = () => {
    selectPreset(presets[0])
    setDrawerOpen(true)
  }

  const addGoal = (event) => {
    event.preventDefault()
    const name = goalName.trim()
    const amount = Number(goalAmount)
    if (!name || !Number.isFinite(amount) || amount <= 0) return
    const preset = presets.find((item) => item.id === selectedPreset && item.label === name)
    updateDemo((current) => ({
      ...current,
      goals: [...current.goals, {
        id: `goal-${Date.now()}`,
        name,
        target: Math.round(amount),
        saved: 0,
        image: preset?.image || '',
      }],
    }))
    setDrawerOpen(false)
    setGoalName('')
    setMessage(t('piggyBank.goalAdded'))
  }

  const applyMoneyAction = (event) => {
    event.preventDefault()
    const amount = Math.round(Number(moneyAmount))
    if (!Number.isFinite(amount) || amount <= 0) return
    const goalIndex = demo.goals.findIndex((goal) => goal.id === moneyAction?.goalId)
    if (goalIndex < 0) return
    const goal = demo.goals[goalIndex]
    if (moneyAction.kind === 'withdraw' && amount > goal.saved) return
    updateDemo((current) => ({
      ...current,
      balance: current.balance + (moneyAction.kind === 'topup' ? amount : -amount),
      goals: current.goals.map((item) => item.id === goal.id
        ? { ...item, saved: item.saved + (moneyAction.kind === 'topup' ? amount : -amount) }
        : item),
    }))
    setMoneyAction(null)
    setMessage(t('piggyBank.demoUpdated'))
  }

  return (
    <main className="piggy-page">
      <div className="piggy-page__shell">
        <header className="piggy-page__topbar">
          <button type="button" className="piggy-page__back" onClick={() => navigate(-1)} aria-label={t('piggyBank.back')}>
            <FiArrowLeft aria-hidden="true" />
          </button>
          <div className="piggy-page__profile">
            {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : <span aria-hidden="true">{firstName.slice(0, 1)}</span>}
            <strong>{firstName}</strong>
          </div>
          <button type="button" className="piggy-page__edit" onClick={openGoalDrawer} aria-label={t('piggyBank.addGoal')}>
            <FiEdit2 aria-hidden="true" />
          </button>
        </header>

        <section className="piggy-page__overview" aria-label={t('piggyBank.pageTitle')}>
          <span className="piggy-page__badge"><FiTarget aria-hidden="true" /> {t('piggyBank.pageTitle')}</span>
          <h1>{formatMoney(demo.balance)}</h1>
          <p>{t('piggyBank.balanceCaption')}</p>
          <button type="button" className={`piggy-page__pig${celebration ? ' is-celebrating' : ''}`} onClick={() => setCelebration((value) => value + 1)} aria-label={t('piggyBank.tapPiggy')}>
            <img src={PIGGY} alt={t('piggyBank.piggyAlt')} />
          </button>
        </section>

        {demo.rewardVisible ? (
          <section className="piggy-page__reward">
            <div className="piggy-page__reward-art"><img src={BIKE} alt="" /></div>
            <div className="piggy-page__reward-copy">
              <strong>{t('piggyBank.rewardTitle')}</strong>
              <button type="button" onClick={() => {
                updateDemo((current) => ({ ...current, balance: current.balance - 12000, rewardVisible: false }))
                setMessage(t('piggyBank.demoUpdated'))
              }}>{t('piggyBank.claimReward', { amount: formatMoney(12000) })}</button>
            </div>
            <img className="piggy-page__reward-pig" src={PIGGY} alt="" />
          </section>
        ) : null}

        <section className="piggy-page__goals" aria-label={t('piggyBank.goals')}>
          {demo.goals.map((goal) => {
            const progress = Math.min(100, (goal.saved / goal.target) * 100)
            return (
              <article className="piggy-page__goal" key={goal.id}>
                <div className="piggy-page__goal-image">{goal.image ? <img src={goal.image} alt="" /> : <FiTarget aria-hidden="true" />}</div>
                <div className="piggy-page__goal-main">
                  <div className="piggy-page__goal-values"><strong>{formatMoney(goal.saved)}</strong><span>{t('piggyBank.ofAmount', { amount: formatMoney(goal.target) })}</span></div>
                  <div className="piggy-page__progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100" aria-label={goal.nameKey ? t(goal.nameKey) : goal.name}><span style={{ width: `${progress}%` }} /></div>
                  <p>{goal.nameKey ? t(goal.nameKey) : goal.name}</p>
                  <div className="piggy-page__goal-actions">
                    <button type="button" onClick={() => { setMoneyAction({ kind: 'topup', goalId: goal.id }); setMoneyAmount('500') }}>{t('piggyBank.topUp')}</button>
                    <button type="button" onClick={() => { setMoneyAction({ kind: 'withdraw', goalId: goal.id }); setMoneyAmount('500') }} disabled={goal.saved <= 0}>{t('piggyBank.withdraw')}</button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <button ref={drawerTriggerRef} type="button" className="piggy-page__add" onClick={openGoalDrawer}><FiPlus aria-hidden="true" /> {t('piggyBank.addGoal')}</button>
        <p className="piggy-page__demo-note">{t('piggyBank.demoNote')}</p>
      </div>

      {celebration ? createPortal(
        <div className="piggy-page__celebration" aria-hidden="true" key={celebration}>
          <div className="piggy-page__dim" />
          {COINS.map((coin, index) => <img key={index} src={COIN} alt="" style={{ '--coin-left': coin.left, '--coin-delay': coin.delay, '--coin-duration': coin.duration, '--coin-size': coin.size, '--coin-drift': coin.drift }} />)}
        </div>, document.body,
      ) : null}

      {drawerOpen ? createPortal(
        <div className="piggy-drawer-root">
          <button type="button" className="piggy-drawer-root__backdrop" onClick={() => setDrawerOpen(false)} aria-label={t('piggyBank.close')} />
          <section className="piggy-drawer" role="dialog" aria-modal="true" aria-labelledby="piggy-drawer-title">
            <div className="piggy-drawer__handle" aria-hidden="true" />
            <header className="piggy-drawer__header">
              <div><span>{t('piggyBank.pageTitle')}</span><h2 id="piggy-drawer-title">{t('piggyBank.addGoal')}</h2></div>
              <button ref={drawerCloseRef} type="button" onClick={() => setDrawerOpen(false)} aria-label={t('piggyBank.close')}><FiX aria-hidden="true" /></button>
            </header>
            <p className="piggy-drawer__lead">{t('piggyBank.drawerLead')}</p>
            <h3>{t('piggyBank.tasks')}</h3>
            <div className="piggy-drawer__rewards">
              <div className="piggy-drawer__timeline" role="list">
                {DAY_REWARDS.map((amount, index) => {
                  const state = index === 0 ? 'claimed' : index === 1 ? 'next' : 'locked'
                  const label = index === 0
                    ? t('piggyBank.rewardClaimed')
                    : index === 1
                      ? t('piggyBank.rewardTomorrow')
                      : t('piggyBank.rewardDay', { day: index + 1 })
                  return (
                    <div className={`piggy-drawer__reward-day is-${state}`} role="listitem" key={amount}>
                      <span className="piggy-drawer__ticket">
                        <img src={TICKETS} alt="" />
                        <strong>{amount}</strong>
                      </span>
                      <span className="piggy-drawer__reward-node" aria-hidden="true">
                        {state === 'claimed' ? <FiCheck /> : <FiLock />}
                      </span>
                      <span className="piggy-drawer__reward-label">{label}</span>
                    </div>
                  )
                })}
              </div>
              <button type="button" className="piggy-drawer__earn" onClick={() => { setDrawerOpen(false); navigate('/bonuses') }}>
                {t('piggyBank.earnMoreBonuses')}
              </button>
            </div>
            <h3>{t('piggyBank.chooseGoal')}</h3>
            <div className="piggy-drawer__presets">
              {presets.map((preset) => <button type="button" className={selectedPreset === preset.id ? 'is-selected' : ''} key={preset.id} onClick={() => selectPreset(preset)}>
                {preset.image ? <img src={preset.image} alt="" /> : <preset.icon aria-hidden="true" />}
                <span>{preset.label}</span>
              </button>)}
            </div>
            <form onSubmit={addGoal} className="piggy-drawer__form">
              <label>{t('piggyBank.goalName')}<input required maxLength="60" value={goalName} onChange={(event) => { setGoalName(event.target.value); setSelectedPreset('custom') }} placeholder={t('piggyBank.goalNamePlaceholder')} /></label>
              <label>{t('piggyBank.goalAmount')}<div className="piggy-drawer__amount"><input required type="number" min="1" step="1" inputMode="numeric" value={goalAmount} onChange={(event) => setGoalAmount(event.target.value)} /><span>₽</span></div></label>
              <button type="submit" className="piggy-drawer__submit">{t('piggyBank.createGoal')}</button>
            </form>
          </section>
        </div>, document.body,
      ) : null}

      {moneyAction ? createPortal(
        <div className="piggy-money-root">
          <button type="button" className="piggy-money-root__backdrop" onClick={() => setMoneyAction(null)} aria-label={t('piggyBank.close')} />
          <form className="piggy-money" role="dialog" aria-modal="true" aria-labelledby="piggy-money-title" onSubmit={applyMoneyAction}>
            <button type="button" className="piggy-money__close" onClick={() => setMoneyAction(null)} aria-label={t('piggyBank.close')}><FiX aria-hidden="true" /></button>
            <h2 id="piggy-money-title">{t(moneyAction.kind === 'topup' ? 'piggyBank.topUp' : 'piggyBank.withdraw')}</h2>
            <p>{t('piggyBank.demoActionNote')}</p>
            <label>{t('piggyBank.goalAmount')}<input required type="number" min="1" max={moneyAction.kind === 'withdraw' ? demo.goals.find((goal) => goal.id === moneyAction.goalId)?.saved : undefined} step="1" inputMode="numeric" value={moneyAmount} onChange={(event) => setMoneyAmount(event.target.value)} /></label>
            <button type="submit">{t('piggyBank.confirm')}</button>
          </form>
        </div>, document.body,
      ) : null}

      {message ? <div className="piggy-page__toast" role="status">{message}</div> : null}
    </main>
  )
}
