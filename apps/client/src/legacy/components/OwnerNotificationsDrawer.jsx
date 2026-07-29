import { Bell, CalendarCheck, ChevronRight, MessageSquare, ShieldCheck, TrendingUp, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import OwnerNoBidsIllustration from './OwnerNoBidsIllustration'
import './OwnerNotificationsDrawer.css'

export function getDefaultOwnerNotifications(t) {
  return [
    {
      id: 'booking',
      tone: 'teal',
      icon: CalendarCheck,
      title: t('ownerTest_notificationsDemoBooking'),
      text: t('ownerTest_notificationsDemoBookingText'),
      time: t('ownerTest_notificationsDemoBookingTime'),
      unread: true,
    },
    {
      id: 'message',
      tone: 'amber',
      icon: MessageSquare,
      title: t('ownerTest_notificationsDemoMessage'),
      text: t('ownerTest_notificationsDemoMessageText'),
      time: t('ownerTest_notificationsDemoMessageTime'),
      unread: true,
    },
    {
      id: 'promotion',
      tone: 'blue',
      icon: TrendingUp,
      title: t('ownerTest_notificationsDemoPromotion'),
      text: t('ownerTest_notificationsDemoPromotionText'),
      time: t('ownerTest_notificationsDemoPromotionTime'),
      unread: true,
    },
    {
      id: 'verification',
      tone: 'green',
      icon: ShieldCheck,
      title: t('ownerTest_notificationsDemoVerification'),
      text: t('ownerTest_notificationsDemoVerificationText'),
      time: t('ownerTest_notificationsDemoVerificationTime'),
      unread: false,
    },
  ]
}

export default function OwnerNotificationsDrawer({ open, onClose, items, onDismiss }) {
  const { t } = useTranslation()
  const resolvedItems = items ?? getDefaultOwnerNotifications(t)

  const handleItemAction = (item) => {
    if (typeof item.onAction === 'function') {
      item.onAction()
      onClose()
    }
  }

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={`ond${open ? ' ond--open' : ''}`} aria-hidden={!open}>
      <button
        type="button"
        className="ond__backdrop"
        aria-label={t('ownerTest_notificationsCloseBackdrop')}
        onClick={onClose}
      />
      <aside className="ond__panel" role="dialog" aria-modal="true" aria-label={t('ownerTest_notificationsAria')}>
        <header className="ond__head">
          <div>
            <span className="ond__eyebrow">
              <Bell size={15} strokeWidth={2.2} aria-hidden />
              {t('ownerTest_notificationsEyebrow')}
            </span>
            <h2 className="ond__title">{t('ownerTest_notificationsTitle')}</h2>
          </div>
          <button type="button" className="ond__close" aria-label={t('ownerTest_notificationsClose')} onClick={onClose}>
            <X size={20} strokeWidth={2.2} aria-hidden />
          </button>
        </header>

        {resolvedItems.length > 0 ? (
          <ul className="ond__list">
            {resolvedItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id} className={`ond-item ond-item--${item.tone}`}>
                  {onDismiss && (
                    <button
                      type="button"
                      className="ond-item__dismiss"
                      aria-label={t('ownerTest_notificationsDismiss')}
                      onClick={() => onDismiss(item.id)}
                    >
                      <X size={14} strokeWidth={2.2} aria-hidden />
                    </button>
                  )}
                  <span className="ond-item__icon">
                    <Icon size={18} strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="ond-item__body">
                    <span className="ond-item__title">
                      {item.title}
                      {item.unread && <i aria-label={t('ownerTest_notificationsNew')} />}
                    </span>
                    <span className="ond-item__text">{item.text}</span>
                  </span>
                  <span className="ond-item__side">
                    {item.amount && <span className="ond-item__amount">{item.amount}</span>}
                    <time className="ond-item__time">{item.time}</time>
                    {item.onAction ? (
                      <button
                        type="button"
                        className="ond-item__open"
                        aria-label={t('ownerTest_notificationsOpen')}
                        onClick={() => handleItemAction(item)}
                      >
                        <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
                      </button>
                    ) : item.href ? (
                      <a
                        className="ond-item__open"
                        href={item.href}
                        aria-label={t('ownerTest_notificationsOpen')}
                        onClick={onClose}
                      >
                        <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
                      </a>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="ond__empty">
            <OwnerNoBidsIllustration className="ond__empty-illustration" />
            <strong>{t('ownerTest_notificationsEmptyTitle')}</strong>
            <p>{t('ownerTest_notificationsEmptyDesc')}</p>
          </div>
        )}
      </aside>
    </div>,
    document.body
  )
}
