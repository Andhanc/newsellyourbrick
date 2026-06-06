import { Bell, CalendarCheck, MessageSquare, ShieldCheck, TrendingUp, X } from 'lucide-react'
import { useEffect } from 'react'
import './OwnerNotificationsDrawer.css'

const OWNER_NOTIFICATIONS = [
  {
    id: 'booking',
    tone: 'teal',
    icon: CalendarCheck,
    title: 'Новая бронь ожидает подтверждения',
    text: 'Вилла у моря, 12 июня, 14:30',
    time: '12 мин',
    unread: true,
  },
  {
    id: 'message',
    tone: 'amber',
    icon: MessageSquare,
    title: 'Покупатель задал вопрос',
    text: 'Уточняет условия тест-драйва по апартаментам в центре.',
    time: '28 мин',
    unread: true,
  },
  {
    id: 'promotion',
    tone: 'blue',
    icon: TrendingUp,
    title: 'Продвижение работает лучше обычного',
    text: 'Просмотры объекта выросли на 18% за последние сутки.',
    time: '1 час',
    unread: true,
  },
  {
    id: 'verification',
    tone: 'green',
    icon: ShieldCheck,
    title: 'Документы проверены',
    text: 'Можно запускать публикацию нового объекта.',
    time: 'Вчера',
    unread: false,
  },
]

export default function OwnerNotificationsDrawer({ open, onClose, items = OWNER_NOTIFICATIONS }) {
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

  return (
    <div className={`ond${open ? ' ond--open' : ''}`} aria-hidden={!open}>
      <button type="button" className="ond__backdrop" aria-label="Закрыть уведомления" onClick={onClose} />
      <aside className="ond__panel" role="dialog" aria-modal="true" aria-label="Уведомления">
        <header className="ond__head">
          <div>
            <span className="ond__eyebrow">
              <Bell size={15} strokeWidth={2.2} aria-hidden />
              Центр событий
            </span>
            <h2 className="ond__title">Уведомления</h2>
          </div>
          <button type="button" className="ond__close" aria-label="Закрыть" onClick={onClose}>
            <X size={20} strokeWidth={2.2} aria-hidden />
          </button>
        </header>

        {items.length > 0 ? (
          <ul className="ond__list">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id} className={`ond-item ond-item--${item.tone}`}>
                  <span className="ond-item__icon">
                    <Icon size={18} strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="ond-item__body">
                    <span className="ond-item__title">
                      {item.title}
                      {item.unread && <i aria-label="Новое" />}
                    </span>
                    <span className="ond-item__text">{item.text}</span>
                  </span>
                  <span className="ond-item__side">
                    {item.amount && <strong className="ond-item__amount">{item.amount}</strong>}
                    <time className="ond-item__time">{item.time}</time>
                    {item.onAction ? (
                      <button
                        type="button"
                        className="ond-item__open"
                        onClick={() => handleItemAction(item)}
                      >
                        Открыть
                      </button>
                    ) : item.href ? (
                      <a className="ond-item__open" href={item.href} onClick={onClose}>
                        Открыть
                      </a>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="ond__empty">
            <span className="ond__empty-icon">
              <TrendingUp size={22} strokeWidth={2.2} aria-hidden />
            </span>
            <strong>Ставок пока нет</strong>
            <p>Когда покупатели сделают ставки на ваши объекты, они появятся здесь.</p>
          </div>
        )}
      </aside>
    </div>
  )
}
