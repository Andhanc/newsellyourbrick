import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiArrowLeft, FiMail } from 'react-icons/fi'
import { SiTelegram, SiWhatsapp } from 'react-icons/si'
import Header from '../components/Header'
import { TestDriveRangeCalendar } from '@/components/ui/calendar'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { showToast } from '../components/ToastContainer'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import TestDriveSuccessDrawer from '../components/TestDriveSuccessDrawer'
import './TestDriveBookingPage.css'

let API_BASE_URL = getApiBaseUrlSync()

const CONTACT_OPTIONS = [
  {
    id: 'telegram',
    label: 'Telegram',
    hint: 'Напишем вам в Telegram',
    Icon: SiTelegram,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    hint: 'Свяжемся через WhatsApp',
    Icon: SiWhatsapp,
  },
  {
    id: 'email',
    label: 'Почта',
    hint: 'Отправим письмо на email',
    Icon: FiMail,
  },
]

export default function TestDriveBookingPage() {
  const { slugOrId: propertyRouteKey } = useParams()
  const propertyApiKey = propertyRouteKey ? encodeURIComponent(propertyRouteKey) : ''
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const propertyTable =
    searchParams.get('table') || 'properties_apartments'

  const [propertyTitle, setPropertyTitle] = useState('')
  const [propertyNumericId, setPropertyNumericId] = useState(null)
  const [bookedDates, setBookedDates] = useState([])
  const [myBookedDates, setMyBookedDates] = useState([])
  const [saving, setSaving] = useState(false)
  const landingRange =
    routerLocation.state?.testDriveRange?.start && routerLocation.state?.testDriveRange?.end
      ? routerLocation.state.testDriveRange
      : null
  const [pendingRange, setPendingRange] = useState(() => landingRange)
  const [calendarResetKey, setCalendarResetKey] = useState(0)
  const [quoteData, setQuoteData] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState(1)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )
  const [contactChannel, setContactChannel] = useState(null)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(null)
  const confirmingSessionRef = useRef(null)

  const currencyFmt = (amount, currency) => {
    try {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: (currency || 'USD').toUpperCase(),
        maximumFractionDigits: 2,
      }).format(Number(amount) || 0)
    } catch {
      return `${Number(amount) || 0} ${(currency || 'USD').toUpperCase()}`
    }
  }

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!import.meta.env?.DEV || searchParams.get('buyer_booking_preview') !== '1') return
    setPropertyTitle('Вилла с бассейном у Средиземного моря')
    setBookingSuccess({
      booking_id: 142,
      start_date: '2026-08-12',
      end_date: '2026-08-18',
      buyer_contact_channel: 'telegram',
    })
  }, [searchParams])

  useEffect(() => {
    const load = async () => {
      try {
        const { getApiBaseUrl } = await import('../utils/apiConfig')
        API_BASE_URL = await getApiBaseUrl()
        const lang = (localStorage.getItem('i18nextLng') || 'ru').split('-')[0]
        const pr = await fetch(`${API_BASE_URL}/properties/${propertyApiKey}?lang=${lang}`)
        const pj = await pr.json()
        if (pj.success && pj.data) {
          setPropertyTitle(pj.data.title || ` #${propertyRouteKey}`)
          if (pj.data.id != null) setPropertyNumericId(Number(pj.data.id))
        }
        const uid = localStorage.getItem('userId')
        const userQ =
          uid && /^\d+$/.test(uid)
            ? `&user_id=${encodeURIComponent(uid)}`
            : ''
        const br = await fetch(
          `${API_BASE_URL}/properties/${propertyApiKey}/test-drive/bookings?property_table=${encodeURIComponent(propertyTable)}${userQ}`
        )
        const bj = await br.json()
        if (bj.success && bj.data?.booked_dates) {
          setBookedDates(bj.data.booked_dates)
          setMyBookedDates(
            Array.isArray(bj.data.my_booked_dates) ? bj.data.my_booked_dates : []
          )
        }
      } catch (e) {
        console.warn(e)
      }
    }
    load()
  }, [propertyRouteKey, propertyApiKey, propertyTable])

  useEffect(() => {
    const checkoutResult = searchParams.get('test_drive_checkout')
    const sid = searchParams.get('session_id')
    if (checkoutResult !== 'success' || !sid) return
    const uid = localStorage.getItem('userId')
    if (!uid || !/^\d+$/.test(uid)) return
    if (confirmingSessionRef.current === sid) return
    confirmingSessionRef.current = sid
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/billing/confirm-test-drive-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sid, userId: parseInt(uid, 10) }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          showToast(data.error || 'Не удалось подтвердить оплату', 'error')
          return
        }
        setBookingSuccess(data.data || {})
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('test_drive_checkout')
        newParams.delete('session_id')
        setSearchParams(newParams, { replace: true })
      } catch {
        showToast('Ошибка подтверждения оплаты', 'error')
      } finally {
        if (confirmingSessionRef.current === sid) confirmingSessionRef.current = null
      }
    })()
  }, [searchParams, setSearchParams])

  const handleRangeSelected = (range) => {
    setPendingRange(range)
    if (range) {
      setContactChannel(null)
      setContactPickerOpen(true)
      setPaymentOpen(false)
      setPaymentStep(1)
      setQuoteData(null)
    } else {
      setContactChannel(null)
      setContactPickerOpen(false)
      setPaymentOpen(false)
      setPaymentStep(1)
      setQuoteData(null)
    }
  }

  const handleCancelSelection = () => {
    setPendingRange(null)
    setContactChannel(null)
    setContactPickerOpen(false)
    setPaymentOpen(false)
    setPaymentStep(1)
    setQuoteData(null)
    setCalendarResetKey((k) => k + 1)
  }

  const selectContactChannel = (channelId) => {
    setContactChannel(channelId)
    setContactPickerOpen(false)
    setQuoteData(null)
    setPaymentStep(1)
    setPaymentOpen(true)
  }

  const fetchQuote = async () => {
    if (!pendingRange) return null
    const res = await fetch(
      `${API_BASE_URL}/properties/${propertyApiKey}/test-drive/quote?start_date=${encodeURIComponent(
        pendingRange.start
      )}&end_date=${encodeURIComponent(pendingRange.end)}`
    )
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Не удалось рассчитать стоимость')
    }
    return data.data
  }

  const handleOpenPayment = async () => {
    if (!pendingRange) return
    if (!contactChannel) {
      showToast('Выберите способ связи: Telegram, WhatsApp или почту', 'error')
      setContactPickerOpen(true)
      return
    }
    setQuoteData(null)
    setPaymentStep(1)
    setPaymentOpen(true)
  }

  const handleContinueToStep2 = async () => {
    setSaving(true)
    try {
      const quote = await fetchQuote()
      setQuoteData(quote)
      setPaymentStep(2)
    } catch (e) {
      showToast(e.message || 'Ошибка расчета', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePay = async () => {
    if (!pendingRange || !contactChannel) return
    const uid = localStorage.getItem('userId')
    if (!uid || !/^\d+$/.test(uid)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setCheckoutLoading(true)
    try {
      const customerEmail = localStorage.getItem('userEmail') || ''
      const res = await fetch(`${API_BASE_URL}/billing/create-test-drive-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(uid, 10),
          propertyId: propertyNumericId,
          propertyType: null,
          propertyTable,
          startDate: pendingRange.start,
          endDate: pendingRange.end,
          contactChannel,
          customerEmail,
          returnPath: `/property/${propertyRouteKey}/test-drive`,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success || !data.url) {
        showToast(data.error || 'Не удалось создать оплату', 'error')
        return
      }
      window.location.href = data.url
    } catch {
      showToast('Ошибка сети', 'error')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="test-drive-page">
      <Header />
      <TestDriveSuccessDrawer
        isOpen={Boolean(bookingSuccess)}
        booking={bookingSuccess}
        propertyTitle={propertyTitle}
        onClose={() => setBookingSuccess(null)}
        onOpenBookings={() => navigate('/profile/bookings')}
        onBackToProperty={() => navigate(`/property/${propertyRouteKey}`)}
      />
      <div className="test-drive-page__hero">
        <div className="test-drive-page__hero-top">
          <button
            type="button"
            className="test-drive-page__back"
            onClick={() => navigate(-1)}
            aria-label="Назад"
          >
            <FiArrowLeft size={20} strokeWidth={2.25} />
          </button>
          <p className="test-drive-page__eyebrow">Тест-драйв недвижимости</p>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="test-drive-page__title"
        >
          {propertyTitle || 'Выбор дат'}
        </motion.h1>
        <p className="test-drive-page__subtitle">
          Отметьте от 5 до 21 дня подряд — затем выберите способ связи.
        </p>
      </div>

      <div className="test-drive-page__layout">
        <div className="test-drive-page__calendar-wrap">
          {saving && (
            <div className="test-drive-page__saving">Отправка заявки…</div>
          )}
          <TestDriveRangeCalendar
            key={calendarResetKey}
            locale="ru"
            bookedDates={bookedDates}
            myBookedDates={myBookedDates}
            onRangeSelected={handleRangeSelected}
            maxWidth="max-w-full"
            className="test-drive-page__calendar-panel"
            initialRange={calendarResetKey === 0 ? landingRange : null}
          />
          {pendingRange && (
            <div className="test-drive-page__actions">
              <p className="test-drive-page__picked">
                Выбрано: <strong>{pendingRange.start}</strong> —{' '}
                <strong>{pendingRange.end}</strong>
              </p>
              {contactChannel ? (
                <p className="test-drive-page__contact-picked">
                  Связь:{' '}
                  <strong>
                    {CONTACT_OPTIONS.find((c) => c.id === contactChannel)?.label || contactChannel}
                  </strong>
                  <button
                    type="button"
                    className="test-drive-page__contact-change"
                    onClick={() => setContactPickerOpen(true)}
                  >
                    Изменить
                  </button>
                </p>
              ) : null}
              <div className="test-drive-page__action-buttons">
                <button
                  type="button"
                  className="test-drive-page__btn test-drive-page__btn--ghost"
                  disabled={saving}
                  onClick={handleCancelSelection}
                >
                  Отменить
                </button>
                <button
                  type="button"
                  className="test-drive-page__btn test-drive-page__btn--primary"
                  disabled={saving || !contactChannel}
                  onClick={handleOpenPayment}
                >
                  Запросить тест-драйв
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="test-drive-page__hints">
          <p className="test-drive-page__hints-title">Правила</p>
          {[
            {
              title: 'Заезд с 15:00',
              text: 'В первый день ключи и доступ согласуются с владельцем после подтверждения.',
              meta: 'День 1',
              tag: 'Check-in',
              delay: 0.05,
            },
            {
              title: 'От 5 до 21 суток',
              text: 'Выберите подряд идущие даты — столько ночей вы проживёте на объекте.',
              meta: '5–21 дн.',
              tag: 'Stay',
              delay: 0.1,
            },
            {
              title: 'Выезд до 12:00',
              text: 'В последний день освободите объект до полудня, если иное не согласовано.',
              meta: 'День N',
              tag: 'Check-out',
              delay: 0.15,
            },
            {
              title: 'Занятые даты',
              text: 'Зелёным — ваши заявки, оранжевым — чужие. После выбора дат укажите способ связи.',
              meta: 'Статус',
              tag: 'Calendar',
              delay: 0.2,
              accent: true,
            },
          ].map((card) => (
            <motion.article
              key={card.title}
              className={`test-drive-rule-card${card.accent ? ' test-drive-rule-card--soft' : ''}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: card.delay }}
            >
              <div className="test-drive-rule-card__body">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <div className="test-drive-rule-card__foot">
                  <span>{card.meta}</span>
                  <span>{card.tag}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </aside>
      </div>
      <AnimatePresence>
        {contactPickerOpen && pendingRange && (
          <motion.div
            key="test-drive-contact-overlay"
            className={`test-drive-pay-overlay${isMobile ? ' test-drive-contact-overlay--drawer' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={() => setContactPickerOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="test-drive-contact-title"
              initial={
                isMobile
                  ? { y: '100%' }
                  : { opacity: 0, y: 22, scale: 0.97 }
              }
              animate={
                isMobile
                  ? { y: 0, opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                isMobile
                  ? { y: '100%', opacity: 1 }
                  : { opacity: 0, y: 22, scale: 0.97 }
              }
              transition={
                isMobile
                  ? { type: 'spring', damping: 33, stiffness: 400, mass: 0.65 }
                  : { type: 'spring', stiffness: 380, damping: 32 }
              }
              className={`test-drive-contact-sheet${isMobile ? ' test-drive-contact-sheet--drawer' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
            {isMobile ? (
              <div className="test-drive-contact-drawer__handle-wrap" aria-hidden>
                <span className="test-drive-contact-drawer__handle" />
              </div>
            ) : null}
            <h3 id="test-drive-contact-title" className="test-drive-contact-sheet__title">
              Как с вами связаться?
            </h3>
            <p className="test-drive-contact-sheet__subtitle">
              Выберите удобный канал — так владелец поймёт, куда писать или звонить для согласования заезда.
            </p>
            <div
              className={`test-drive-contact-grid${isMobile ? ' test-drive-contact-grid--drawer' : ''}`}
            >
              {CONTACT_OPTIONS.map(({ id, label, hint, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`test-drive-contact-card${isMobile ? ' test-drive-contact-card--drawer' : ''}${
                    contactChannel === id ? ' test-drive-contact-card--active' : ''
                  }`}
                  onClick={() => selectContactChannel(id)}
                >
                  <span className="test-drive-contact-card__icon" aria-hidden>
                    <Icon size={26} />
                  </span>
                  <span className="test-drive-contact-card__body">
                    <span className="test-drive-contact-card__label">{label}</span>
                    <span className="test-drive-contact-card__hint">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="test-drive-page__btn test-drive-page__btn--ghost test-drive-contact-sheet__close"
              onClick={() => setContactPickerOpen(false)}
            >
              Закрыть
            </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {paymentOpen && pendingRange && (
          <motion.div
            key="test-drive-pay-overlay"
            className={`test-drive-pay-overlay${isMobile ? ' test-drive-pay-overlay--drawer' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={() => setPaymentOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="test-drive-pay-title"
              initial={
                isMobile
                  ? { y: '100%' }
                  : { opacity: 0, y: 18, scale: 0.98 }
              }
              animate={
                isMobile
                  ? { y: 0, opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                isMobile
                  ? { y: '100%', opacity: 1 }
                  : { opacity: 0, y: 18, scale: 0.98 }
              }
              transition={
                isMobile
                  ? { type: 'spring', damping: 33, stiffness: 400, mass: 0.65 }
                  : { type: 'spring', stiffness: 380, damping: 32 }
              }
              className={`test-drive-pay-sheet${isMobile ? ' test-drive-pay-sheet--drawer' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
            {isMobile ? (
              <div className="test-drive-contact-drawer__handle-wrap" aria-hidden>
                <span className="test-drive-contact-drawer__handle" />
              </div>
            ) : null}
            <h3 id="test-drive-pay-title" className="test-drive-pay-sheet__title">
              {paymentStep === 1 ? 'Инструкция и правила тест-драйва' : 'Шаг 2: оплата тест-драйва'}
            </h3>
            <div className="test-drive-pay-sheet__scroll">
              {paymentStep === 1 ? (
                <>
                  <p className="test-drive-pay-sheet__text">
                    Оплата проходит одним платежом: отдельно сумма за выбранные сутки проживания и страховой депозит
                    (если он задан для объекта). После оплаты бронирование сразу отобразится у вас, у продавца и в
                    админ-панели.
                  </p>
                  <ul className="test-drive-pay-sheet__rules">
                    <li>Заезд в первый день с 15:00, выезд в последний день до 12:00.</li>
                    <li>Соблюдайте правила объекта и бережно относитесь к имуществу.</li>
                    <li>
                      Страховой депозит: при отсутствии нарушений после проживания он возвращается на вашу карту в
                      течение одной недели с момента выезда (срок зачисления может зависеть от банка).
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="test-drive-pay-sheet__text">
                    Выбрано: <strong>{pendingRange.start}</strong> — <strong>{pendingRange.end}</strong>
                  </p>
                  {quoteData ? (
                    <div className="test-drive-pay-sheet__summary">
                      <p>Суток: <strong>{quoteData.day_count}</strong></p>
                      <p>Стоимость за сутки: <strong>{currencyFmt(quoteData.daily_price, quoteData.currency)}</strong></p>
                      <p>
                        Проживание:{' '}
                        <strong>
                          {currencyFmt(
                            quoteData.stay_total ?? quoteData.day_count * quoteData.daily_price,
                            quoteData.currency
                          )}
                        </strong>
                      </p>
                      <p>Страховой депозит: <strong>{currencyFmt(quoteData.insurance_deposit, quoteData.currency)}</strong></p>
                      {Number(quoteData.insurance_deposit) > 0 ? (
                        <p className="test-drive-pay-sheet__deposit-note">
                          Депозит удерживается вместе с оплатой суток. Если правила проживания не нарушались, в течение
                          недели после выезда сумма депозита возвращается на ту же карту.
                        </p>
                      ) : null}
                      <p className="test-drive-pay-sheet__total-line">
                        Итого к оплате: <strong>{currencyFmt(quoteData.total_amount, quoteData.currency)}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="test-drive-pay-sheet__text">Расчет суммы...</p>
                  )}
                </>
              )}
            </div>
            <div className={`test-drive-pay-sheet__actions${isMobile ? ' test-drive-pay-sheet__actions--drawer' : ''}`}>
              {paymentStep === 1 ? (
                <button
                  type="button"
                  className="test-drive-page__btn test-drive-page__btn--primary test-drive-pay-sheet__action-btn"
                  disabled={saving}
                  onClick={handleContinueToStep2}
                >
                  Перейти к оплате
                </button>
              ) : (
                <button
                  type="button"
                  className="test-drive-page__btn test-drive-page__btn--primary test-drive-pay-sheet__action-btn"
                  disabled={checkoutLoading || !quoteData}
                  onClick={handlePay}
                >
                  {checkoutLoading ? 'Переход к оплате...' : 'Оплатить'}
                </button>
              )}
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
