import { useEffect, useRef } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  FileCheck2,
  Headphones,
  MapPin,
  ShieldCheck,
  Store,
  UserRoundCheck,
  X,
} from 'lucide-react'
import { formatPurchaseDate, formatPurchaseMoney } from './PurchasedPropertyHistoryCard'
import './PurchasedPropertyDrawer.css'

const SALE_STEPS = [
  { icon: Store, title: 'Создайте аккаунт продавца', text: 'Активируйте кабинет продавца с теми же контактными данными.' },
  { icon: UserRoundCheck, title: 'Подтвердите личность и контакты', text: 'Пройдите проверку профиля — это защищает участников сделки.' },
  { icon: BadgeCheck, title: 'Получите объект в кабинете', text: 'Мы подготовим черновик на основе уже купленного объекта.' },
  { icon: FileCheck2, title: 'Проверьте карточку и документы', text: 'Актуализируйте фотографии, описание и документы собственности.' },
  { icon: Store, title: 'Выберите формат продажи', text: 'Укажите цену и решите: аукцион, фиксированная цена или долевая модель.' },
  { icon: ShieldCheck, title: 'Отправьте на модерацию', text: 'После проверки объект появится в каталоге и станет доступен покупателям.' },
]

export default function PurchasedPropertyDrawer({
  item,
  view = 'details',
  onClose,
  onBack,
  onContactManager,
  onSell,
  onBecomeSeller,
}) {
  const closeButtonRef = useRef(null)
  const overlayRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    const appLayout = document.querySelector('.app-layout')
    const previousAppOverflow = appLayout?.style.overflow
    const siblingStates = []
    const parent = overlayRef.current?.parentElement
    if (parent) {
      Array.from(parent.children).forEach((element) => {
        if (element === overlayRef.current) return
        siblingStates.push({ element, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') })
        element.inert = true
        element.setAttribute('aria-hidden', 'true')
      })
    }
    document.body.style.overflow = 'hidden'
    if (appLayout) appLayout.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        overlayRef.current?.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
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
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (appLayout) appLayout.style.overflow = previousAppOverflow || ''
      siblingStates.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert
        if (ariaHidden == null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', ariaHidden)
      })
      previouslyFocused?.focus?.()
    }
  }, [])

  const percent = Math.round(item.paymentPercent)
  const isSellView = view === 'sell'

  return (
    <div
      ref={overlayRef}
      className="purchase-drawer__overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        className="purchase-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-drawer-title"
      >
        <header className="purchase-drawer__header">
          {isSellView ? (
            <button type="button" className="purchase-drawer__icon-button" onClick={onBack} aria-label="Вернуться к деталям покупки">
              <ArrowLeft size={21} aria-hidden />
            </button>
          ) : (
            <span className="purchase-drawer__eyebrow">Ваш объект</span>
          )}
          <button ref={closeButtonRef} type="button" className="purchase-drawer__icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={21} aria-hidden />
          </button>
        </header>

        {isSellView ? (
          <div className="purchase-drawer__body purchase-drawer__body--sell">
            <div className="purchase-drawer__intro">
              <span className="purchase-drawer__intro-icon"><Store size={22} aria-hidden /></span>
              <div>
                <p className="purchase-drawer__kicker">Следующий шаг</p>
                <h2 id="purchase-drawer-title">Продайте объект через кабинет</h2>
                <p>Вся информация об объекте уже у нас. Вам останется активировать роль продавца и подготовить публикацию.</p>
              </div>
            </div>

            <ol className="purchase-drawer__steps">
              {SALE_STEPS.map(({ icon: Icon, title, text }, index) => (
                <li key={title}>
                  <span className="purchase-drawer__step-number">{index + 1}</span>
                  <span className="purchase-drawer__step-icon"><Icon size={18} aria-hidden /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="purchase-drawer__sticky-actions">
              <button type="button" className="purchase-drawer__primary" onClick={onBecomeSeller}>
                Стать продавцом
                <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <div className="purchase-drawer__body">
            <div className="purchase-drawer__property-media">
              <img src={item.imageSrc} alt={item.title} />
              <span><Check size={15} aria-hidden /> Резерв подтверждён</span>
            </div>

            <div className="purchase-drawer__property-heading">
              <h2 id="purchase-drawer-title">{item.title}</h2>
              {item.location ? <p><MapPin size={16} aria-hidden />{item.location}</p> : null}
            </div>

            <section className="purchase-drawer__payment" aria-label="Состояние оплаты">
              <div className="purchase-drawer__payment-top">
                <div>
                  <span>Оплачено</span>
                  <strong>{formatPurchaseMoney(item.paidAmount, item.currency)}</strong>
                </div>
                <span className="purchase-drawer__percent">{percent}%</span>
              </div>
              <p>из {formatPurchaseMoney(item.totalAmount, item.currency)}</p>
              <div className="purchase-drawer__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <div className="purchase-drawer__remaining">
                <span>Осталось оплатить</span>
                <strong>{formatPurchaseMoney(item.remainingAmount, item.currency)}</strong>
              </div>
            </section>

            <div className="purchase-drawer__meta">
              <div><CalendarDays size={18} aria-hidden /><span>Дата платежа<strong>{formatPurchaseDate(item.purchaseDateRaw)}</strong></span></div>
              <div><ShieldCheck size={18} aria-hidden /><span>Формат сделки<strong>Резерв 10% · Купить сейчас</strong></span></div>
            </div>

            <section className="purchase-drawer__rules">
              <h3>Что происходит дальше</h3>
              <ul>
                <li>Внесённые 10% закрепляют резерв объекта за вами.</li>
                <li>Менеджер согласует документы, сроки и следующий платёж.</li>
                <li>Условия сделки определяются подписанным соглашением и правилами платформы.</li>
                <li>Для повторной продажи потребуется подтверждённый кабинет продавца.</li>
              </ul>
            </section>

            <div className="purchase-drawer__actions">
              <button type="button" className="purchase-drawer__secondary" onClick={onContactManager}>
                <Headphones size={18} aria-hidden />
                Связаться с менеджером
              </button>
              <button type="button" className="purchase-drawer__primary" onClick={onSell}>
                Продать объект
                <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
