import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  FileSearch,
  Gavel,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { getUserData } from '../services/authService'
import { startProSubscriptionCheckout } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import {
  buildDebtCategories,
  getDebtRiskPresentation,
  normalizeDebtAmount,
} from '../utils/debtPropertyDetail'
import './DebtAuctionInsight.css'

const PRO_BENEFITS = [
  'Полный состав обязательств',
  'Проверка арестов и ограничений',
  'Структура и сумма долга',
  'Рекомендации перед участием в торгах',
]

export function DebtProModal({ open, onClose, onRequireLogin, risk, isAuction }) {
  const navigate = useNavigate()
  const titleId = useId()
  const dialogRef = useRef(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => dialogRef.current?.querySelector('button')?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const startCheckout = async () => {
    const userData = getUserData()
    const storedUserId = window.localStorage.getItem('userId')
    const userId = userData?.id ?? storedUserId
    if (!userId) {
      onClose()
      onRequireLogin?.()
      return
    }
    setCheckoutLoading(true)
    try {
      const result = await startProSubscriptionCheckout({
        userId,
        customerEmail: userData?.email,
        billingCycle: 'monthly',
      })
      if (!result.ok) {
        showNotification(result.error || 'Не удалось открыть оплату PRO', 'error')
      }
    } catch (error) {
      showNotification(error?.message || 'Не удалось открыть оплату PRO', 'error')
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="debt-pro-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={dialogRef}
        className="debt-pro-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="debt-pro-modal__handle" aria-hidden />
        <button type="button" className="debt-pro-modal__close" onClick={onClose} aria-label="Закрыть">
          <X size={20} />
        </button>

        <div className="debt-pro-modal__eyebrow"><Sparkles size={15} /> SYB PRO</div>
        <h2 id={titleId}>Полный анализ долга</h2>
        <p className="debt-pro-modal__lead">
          {isAuction
            ? 'Проверьте финансовые и юридические риски до того, как повышать ставку.'
            : 'Проверьте финансовые и юридические риски до покупки объекта.'}
        </p>

        <div className={`debt-pro-report debt-pro-report--${risk.tone}`} aria-hidden>
          <div className="debt-pro-report__top">
            <span><FileSearch size={18} /> Отчёт по объекту</span>
            <span className="debt-pro-report__risk">{risk.shortLabel}</span>
          </div>
          <div className="debt-pro-report__lines">
            <span /><span /><span />
          </div>
          <div className="debt-pro-report__lock"><LockKeyhole size={22} /></div>
        </div>

        <ul className="debt-pro-modal__benefits">
          {PRO_BENEFITS.map((benefit) => (
            <li key={benefit}><Check size={17} /> <span>{benefit}</span></li>
          ))}
        </ul>

        <div className="debt-pro-modal__offer">
          <div><strong>PRO</strong><span>для уверенных инвестиций</span></div>
          <div className="debt-pro-modal__price"><strong>€149</strong><span>/ месяц</span></div>
        </div>

        <button
          type="button"
          className="debt-pro-modal__buy"
          onClick={startCheckout}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? 'Открываем оплату…' : 'Купить PRO'}
          {!checkoutLoading && <ArrowRight size={18} />}
        </button>
        <button
          type="button"
          className="debt-pro-modal__plans"
          onClick={() => {
            onClose()
            navigate('/subscriptions#subscriptions-pricing-section')
          }}
        >
          Посмотреть все тарифы
        </button>
        <p className="debt-pro-modal__note">Подписку можно отменить в любой момент</p>
      </section>
    </div>,
    document.body,
  )
}

export default function DebtAuctionInsight({
  property,
  formatPrice,
  currentBid,
  onRequireLogin,
  isAuction = false,
  compact = false,
}) {
  const [proOpen, setProOpen] = useState(false)
  const risk = useMemo(() => getDebtRiskPresentation(property?.debt_severity), [property?.debt_severity])
  const categories = useMemo(() => buildDebtCategories(property), [property])
  const debtAmount = normalizeDebtAmount(property?.debt_amount)
  const bidAmount = Number(currentBid) > 0 ? Number(currentBid) : null
  const formatAmount = (value) => value != null ? formatPrice(value) : 'Уточняется'

  return (
    <>
      <section className={`debt-insight debt-insight--${risk.tone}${compact ? ' debt-insight--compact' : ''}`}>
        <div className="debt-insight__head">
          <div>
            <span className="debt-insight__eyebrow">
              <Gavel size={14} /> {isAuction ? 'Долговой аукцион' : 'Объект с долгом'}
            </span>
            <h2>Финансовая картина</h2>
          </div>
          <span className="debt-insight__risk"><ShieldAlert size={15} /> {risk.label}</span>
        </div>

        <div className="debt-insight__metrics">
          <div><span>{isAuction ? 'Текущая ставка' : 'Стоимость объекта'}</span><strong>{formatAmount(bidAmount)}</strong></div>
          <div><span>Сумма долга</span><strong>{formatAmount(debtAmount)}</strong></div>
        </div>

        <div className="debt-insight__known">
          <div className="debt-insight__known-title">
            <div><span>Что известно о долге</span><small>{risk.description}</small></div>
            <LockKeyhole size={19} />
          </div>
          <div className="debt-insight__chips">
            {categories.length ? categories.slice(0, 3).map((item) => (
              <span key={item.id}>{item.label}</span>
            )) : <span>Состав обязательств уточняется</span>}
            {categories.length > 3 && <span className="debt-insight__more">+{categories.length - 3}</span>}
          </div>
          <div className="debt-insight__locked-preview" aria-hidden>
            <span /><span /><span />
            <div><LockKeyhole size={15} /> Подробности доступны в PRO</div>
          </div>
          <button type="button" className="debt-insight__cta" onClick={() => setProOpen(true)}>
            Узнать о долге подробнее <ArrowRight size={17} />
          </button>
        </div>
        <p className="debt-insight__disclaimer">
          {isAuction
            ? 'Перед участием в торгах рекомендуем юридическую проверку объекта.'
            : 'Перед покупкой рекомендуем юридическую проверку объекта.'}
        </p>
      </section>

      <DebtProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        onRequireLogin={onRequireLogin}
        risk={risk}
        isAuction={isAuction}
      />
    </>
  )
}
