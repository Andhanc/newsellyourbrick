import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  FileText,
  Gavel,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { assignSheetPanelRef, sheetHandleDragProps, useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import { useViewerVipAccess } from '../hooks/useViewerVipAccess'
import { getUserData } from '../services/authService'
import { startVipSubscriptionCheckout } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import {
  buildDebtCategories,
  getDebtRiskPresentation,
  normalizeDebtAmount,
} from '../utils/debtPropertyDetail'
import './DebtAuctionInsight.css'

const DOC_BENEFITS = [
  'Кредитный договор и ипотечные документы',
  'Выписки и документы о сумме долга',
  'Реестровые записи и обременения',
  'Дополнительные материалы по объекту',
]

/** Модалка: VIP открывает документы долгового объекта (не «отчёт»). */
export function DebtProModal({ open, onClose, onRequireLogin, onOpenDocuments, risk, isAuction }) {
  const navigate = useNavigate()
  const titleId = useId()
  const dialogRef = useRef(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const sheetDrag = useBottomSheetDrag({
    isOpen: open,
    visible: open,
    isClosing: false,
    requestClose: onClose,
    dismissOnly: true,
  })
  const setDialogRef = (node) => assignSheetPanelRef(sheetDrag.panelRef, dialogRef)(node)

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
      const result = await startVipSubscriptionCheckout({
        userId,
        customerEmail: userData?.email,
        billingCycle: 'monthly',
      })
      if (!result.ok) {
        if (result.error === 'already_subscribed_vip') {
          showNotification('VIP уже активен — открываем документы', 'info')
          onClose()
          onOpenDocuments?.()
          return
        }
        showNotification(result.error || 'Не удалось открыть оплату VIP', 'error')
      }
    } catch (error) {
      showNotification(error?.message || 'Не удалось открыть оплату VIP', 'error')
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="debt-pro-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={setDialogRef}
        className="debt-pro-modal__sheet"
        style={sheetDrag.panelDragStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="debt-pro-modal__handle" aria-hidden {...sheetHandleDragProps(sheetDrag)} />
        <button type="button" className="debt-pro-modal__close" onClick={onClose} aria-label="Закрыть">
          <X size={20} />
        </button>

        <div className="debt-pro-modal__eyebrow"><Sparkles size={15} /> SYB VIP</div>
        <h2 id={titleId}>Документы по долговому объекту</h2>
        <p className="debt-pro-modal__lead">
          {isAuction
            ? 'Откройте пакет документов объекта, чтобы проверить обязательства до ставки.'
            : 'Откройте пакет документов объекта, чтобы проверить обязательства до покупки.'}
        </p>

        <div className={`debt-pro-report debt-pro-report--${risk.tone}`} aria-hidden>
          <div className="debt-pro-report__top">
            <span><FileText size={18} /> Документы объекта</span>
            <span className="debt-pro-report__risk">{risk.shortLabel}</span>
          </div>
          <div className="debt-pro-report__lines">
            <span /><span /><span />
          </div>
          <div className="debt-pro-report__lock"><LockKeyhole size={22} /></div>
        </div>

        <ul className="debt-pro-modal__benefits">
          {DOC_BENEFITS.map((benefit) => (
            <li key={benefit}><Check size={17} /> <span>{benefit}</span></li>
          ))}
        </ul>

        <div className="debt-pro-modal__offer">
          <div><strong>VIP</strong><span>доступ к документам объекта</span></div>
          <div className="debt-pro-modal__price"><strong>€499</strong><span>/ месяц</span></div>
        </div>

        <button
          type="button"
          className="debt-pro-modal__buy"
          onClick={startCheckout}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? 'Открываем оплату…' : 'Купить VIP'}
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
  onOpenDocuments,
  isAuction = false,
  compact = false,
}) {
  const [paywallOpen, setPaywallOpen] = useState(false)
  const { canAccess, resolved } = useViewerVipAccess()
  const docsUnlocked = resolved && canAccess('documents')
  const risk = useMemo(() => getDebtRiskPresentation(property?.debt_severity), [property?.debt_severity])
  const categories = useMemo(() => buildDebtCategories(property), [property])
  const debtAmount = normalizeDebtAmount(property?.debt_amount)
  const bidAmount = Number(currentBid) > 0 ? Number(currentBid) : null
  const formatAmount = (value) => value != null ? formatPrice(value) : 'Уточняется'

  const handleDetailsClick = () => {
    if (!resolved) return
    if (docsUnlocked) {
      onOpenDocuments?.()
      return
    }
    const userData = getUserData()
    const userId = userData?.id ?? window.localStorage.getItem('userId')
    if (!userId) {
      onRequireLogin?.()
      return
    }
    setPaywallOpen(true)
  }

  return (
    <>
      <section
        className={`debt-insight debt-insight--${risk.tone}${compact ? ' debt-insight--compact' : ''}${
          docsUnlocked ? ' debt-insight--unlocked' : ''
        }`}
      >
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
            <div>
              <span>Что известно о долге</span>
              <small>{risk.description}</small>
            </div>
            {docsUnlocked ? <FileText size={19} /> : <LockKeyhole size={19} />}
          </div>
          <div className="debt-insight__chips">
            {categories.length ? categories.slice(0, 3).map((item) => (
              <span key={item.id}>{item.label}</span>
            )) : <span>Состав обязательств уточняется</span>}
            {categories.length > 3 && <span className="debt-insight__more">+{categories.length - 3}</span>}
          </div>
          {docsUnlocked ? (
            <p className="debt-insight__unlocked-note">
              Документы этого объекта доступны по вашей подписке VIP.
            </p>
          ) : (
            <div className="debt-insight__locked-preview" aria-hidden>
              <span /><span /><span />
              <div><LockKeyhole size={15} /> Документы доступны с VIP</div>
            </div>
          )}
          <button type="button" className="debt-insight__cta" onClick={handleDetailsClick} disabled={!resolved}>
            {docsUnlocked ? 'Открыть документы' : 'Открыть документы объекта'}
            <ArrowRight size={17} />
          </button>
        </div>
        <p className="debt-insight__disclaimer">
          {isAuction
            ? 'Перед участием в торгах рекомендуем юридическую проверку объекта.'
            : 'Перед покупкой рекомендуем юридическую проверку объекта.'}
        </p>
      </section>

      <DebtProModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onRequireLogin={onRequireLogin}
        onOpenDocuments={onOpenDocuments}
        risk={risk}
        isAuction={isAuction}
      />
    </>
  )
}
