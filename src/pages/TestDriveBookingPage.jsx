import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft } from 'react-icons/fi'
import Header from '../components/Header'
import { TestDriveRangeCalendar } from '@/components/ui/calendar'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { showToast } from '../components/ToastContainer'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import './TestDriveBookingPage.css'

let API_BASE_URL = getApiBaseUrlSync()

export default function TestDriveBookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const propertyTable =
    searchParams.get('table') || 'properties_apartments'

  const [propertyTitle, setPropertyTitle] = useState('')
  const [bookedDates, setBookedDates] = useState([])
  const [myBookedDates, setMyBookedDates] = useState([])
  const [saving, setSaving] = useState(false)
  const [pendingRange, setPendingRange] = useState(null)
  const [calendarResetKey, setCalendarResetKey] = useState(0)
  const [quoteData, setQuoteData] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState(1)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )

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
    const load = async () => {
      try {
        const { getApiBaseUrl } = await import('../utils/apiConfig')
        API_BASE_URL = await getApiBaseUrl()
        const lang = (localStorage.getItem('i18nextLng') || 'ru').split('-')[0]
        const pr = await fetch(`${API_BASE_URL}/properties/${id}?lang=${lang}`)
        const pj = await pr.json()
        if (pj.success && pj.data) {
          setPropertyTitle(pj.data.title || ` #${id}`)
        }
        const uid = localStorage.getItem('userId')
        const userQ =
          uid && /^\d+$/.test(uid)
            ? `&user_id=${encodeURIComponent(uid)}`
            : ''
        const br = await fetch(
          `${API_BASE_URL}/properties/${id}/test-drive/bookings?property_table=${encodeURIComponent(propertyTable)}${userQ}`
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
  }, [id, propertyTable])

  useEffect(() => {
    const checkoutResult = searchParams.get('test_drive_checkout')
    const sid = searchParams.get('session_id')
    if (checkoutResult !== 'success' || !sid) return
    const uid = localStorage.getItem('userId')
    if (!uid || !/^\d+$/.test(uid)) return
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
        showToast('Оплата прошла успешно. Бронирование добавлено в ваши записи.', 'success', 5000)
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('test_drive_checkout')
        newParams.delete('session_id')
        setSearchParams(newParams, { replace: true })
      } catch {
        showToast('Ошибка подтверждения оплаты', 'error')
      }
    })()
  }, [searchParams, setSearchParams])

  const handleRangeSelected = (range) => {
    setPendingRange(range)
  }

  const handleCancelSelection = () => {
    setPendingRange(null)
    setCalendarResetKey((k) => k + 1)
  }

  const fetchQuote = async () => {
    if (!pendingRange) return null
    const res = await fetch(
      `${API_BASE_URL}/properties/${id}/test-drive/quote?start_date=${encodeURIComponent(
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
    const uid = localStorage.getItem('userId')
    if (!uid || !/^\d+$/.test(uid)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setPaymentOpen(true)
    setPaymentStep(1)
    setQuoteData(null)
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
    if (!pendingRange) return
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
          propertyId: parseInt(id, 10),
          propertyType: null,
          propertyTable,
          startDate: pendingRange.start,
          endDate: pendingRange.end,
          customerEmail,
          returnPath: `/property/${id}/test-drive`,
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
      <div className="test-drive-page__hero">
        <button
          type="button"
          className="test-drive-page__back"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft size={22} />
          <span>Назад</span>
        </button>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="test-drive-page__title"
        >
          Тест-драйв: {propertyTitle}
        </motion.h1>
        <p className="test-drive-page__subtitle">
          Выберите от 2 до 5 дней подряд, затем отправьте заявку кнопкой ниже.
          Занятые даты видны всем пользователям.
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
          />
          {pendingRange && (
            <div className="test-drive-page__actions">
              <p className="test-drive-page__picked">
                Выбрано: <strong>{pendingRange.start}</strong> —{' '}
                <strong>{pendingRange.end}</strong>
              </p>
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
                  disabled={saving}
                  onClick={handleOpenPayment}
                >
                  Запросить тест-драйв
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="test-drive-page__hints">
          <motion.div
            className="test-drive-hint-card"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h3>Заезд</h3>
            <p>
              В первый день заезд с 15:00. Ключи или доступ согласуются с
              владельцем после подтверждения.
            </p>
          </motion.div>
          <motion.div
            className="test-drive-hint-card"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3>Проживание</h3>
            <p>
              Количество ночей совпадает с выбранным диапазоном (от 2 до 5
              суток подряд).
            </p>
          </motion.div>
          <motion.div
            className="test-drive-hint-card"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3>Выезд</h3>
            <p>
              В последний день освободите объект до 12:00, если иное не
              согласовано с владельцем.
            </p>
          </motion.div>
          <motion.div
            className="test-drive-hint-card test-drive-hint-card--accent"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3>Занятые даты</h3>
            <p>
              Зелёным — ваши заявки, оранжевым — другие пользователи. После выбора
              дней нажмите «Запросить тест-драйв» — только тогда заявка уходит
              владельцу. «Отменить» сбрасывает выбор.
            </p>
          </motion.div>
        </aside>
      </div>
      {paymentOpen && pendingRange && (
        <div className="test-drive-pay-overlay" onClick={() => setPaymentOpen(false)}>
          <div
            className={`test-drive-pay-sheet${isMobile ? ' test-drive-pay-sheet--mobile' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="test-drive-pay-sheet__title">
              {paymentStep === 1 ? 'Инструкция и правила тест-драйва' : 'Шаг 2: оплата тест-драйва'}
            </h3>
            {paymentStep === 1 ? (
              <>
                <p className="test-drive-pay-sheet__text">
                  После оплаты бронирование сразу попадёт в ваши бронирования, в мои продажи продавца и в админ-панель.
                  В назначенные даты вы заселяетесь по согласованию с владельцем.
                </p>
                <ul className="test-drive-pay-sheet__rules">
                  <li>Заезд в первый день с 15:00, выезд в последний день до 12:00.</li>
                  <li>Соблюдайте правила объекта и сохранность имущества.</li>
                  <li>Страховой депозит возвращается по условиям продавца.</li>
                </ul>
                <button
                  type="button"
                  className="test-drive-page__btn test-drive-page__btn--primary"
                  disabled={saving}
                  onClick={handleContinueToStep2}
                >
                  Перейти к оплате
                </button>
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
                    <p>Страховой депозит: <strong>{currencyFmt(quoteData.insurance_deposit, quoteData.currency)}</strong></p>
                    <p>К оплате за тест-драйв: <strong>{currencyFmt(quoteData.total_amount, quoteData.currency)}</strong></p>
                  </div>
                ) : (
                  <p>Расчет суммы...</p>
                )}
                <button
                  type="button"
                  className="test-drive-page__btn test-drive-page__btn--primary"
                  disabled={checkoutLoading || !quoteData}
                  onClick={handlePay}
                >
                  {checkoutLoading ? 'Переход к оплате...' : 'Оплатить'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
