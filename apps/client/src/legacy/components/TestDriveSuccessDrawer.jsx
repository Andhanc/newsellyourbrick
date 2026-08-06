import { FiArrowRight, FiCalendar, FiClock, FiMessageCircle } from 'react-icons/fi'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import './TestDriveSuccessDrawer.css'

const CHANNEL_LABELS = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  email: 'почте',
}

function formatBookingDate(value) {
  if (!value) return 'Дата уточняется'
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(parsed)
}

export default function TestDriveSuccessDrawer({
  isOpen,
  onClose,
  booking,
  propertyTitle,
  onOpenBookings,
  onBackToProperty,
}) {
  const startLabel = formatBookingDate(booking?.start_date)
  const endLabel = formatBookingDate(booking?.end_date)
  const channelLabel = CHANNEL_LABELS[booking?.buyer_contact_channel] || 'выбранному каналу'

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      tone="detail"
      titleId="test-drive-success-title"
      describedBy="test-drive-success-description"
      closeLabel="Закрыть подтверждение тест-драйва"
      className="test-drive-success"
      footer={(
        <div className="test-drive-success__actions">
          <button type="button" className="test-drive-success__primary" onClick={onOpenBookings}>
            <span>Открыть мои бронирования</span>
            <FiArrowRight size={18} aria-hidden />
          </button>
          <button type="button" className="test-drive-success__secondary" onClick={onBackToProperty}>
            Вернуться к объекту
          </button>
        </div>
      )}
    >
      <div className="test-drive-success__content">
        <p className="test-drive-success__eyebrow">
          <FiCalendar size={14} aria-hidden />
          Оплата подтверждена
        </p>
        <h2 id="test-drive-success-title" className="test-drive-success__title">
          Тест-драйв забронирован
        </h2>
        <p id="test-drive-success-description" className="test-drive-success__lead">
          Бронирование сохранено. Даты, статус и инструкции всегда доступны в кабинете.
        </p>

        <article className="test-drive-success__ticket">
          <div className="test-drive-success__date">
            <strong>{startLabel}</strong>
            <span aria-hidden>—</span>
            <strong>{endLabel}</strong>
          </div>
          <h3>{propertyTitle || 'Выбранный объект'}</h3>
          {booking?.booking_id ? <p>Бронь #{booking.booking_id}</p> : null}
        </article>

        <div className="test-drive-success__steps" aria-label="Что делать дальше">
          <article>
            <span aria-hidden>
              <FiMessageCircle size={18} />
            </span>
            <div>
              <strong>Ожидайте детали связи</strong>
              <p>Контакт и инструкции придут в {channelLabel}.</p>
            </div>
          </article>
          <article>
            <span aria-hidden>
              <FiClock size={18} />
            </span>
            <div>
              <strong>Проверьте время заезда</strong>
              <p>Перед поездкой откройте бронь и сверьте комментарий владельца.</p>
            </div>
          </article>
        </div>
      </div>
    </BuyerSheetShell>
  )
}

export { formatBookingDate }
