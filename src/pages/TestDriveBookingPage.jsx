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
  const [searchParams] = useSearchParams()
  const propertyTable =
    searchParams.get('table') || 'properties_apartments'

  const [propertyTitle, setPropertyTitle] = useState('')
  const [bookedDates, setBookedDates] = useState([])
  const [myBookedDates, setMyBookedDates] = useState([])
  const [saving, setSaving] = useState(false)
  const [pendingRange, setPendingRange] = useState(null)
  const [calendarResetKey, setCalendarResetKey] = useState(0)

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

  const handleRangeSelected = (range) => {
    setPendingRange(range)
  }

  const handleCancelSelection = () => {
    setPendingRange(null)
    setCalendarResetKey((k) => k + 1)
  }

  const handleSubmitTestDriveRequest = async () => {
    if (!pendingRange) return
    const { start: startYmd, end: endYmd } = pendingRange
    const uid = localStorage.getItem('userId')
    if (!uid || !/^\d+$/.test(uid)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        `${API_BASE_URL}/properties/${id}/test-drive/request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parseInt(uid, 10),
            start_date: startYmd,
            end_date: endYmd,
            property_table: propertyTable,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        showToast(data.error || 'Не удалось сохранить', 'error')
        return
      }
      showToast(
        'Заявка отправлена владельцу. Ожидайте ответа в уведомлениях.',
        'success',
        5000
      )
      const uidRefresh = localStorage.getItem('userId')
      const userQ2 =
        uidRefresh && /^\d+$/.test(uidRefresh)
          ? `&user_id=${encodeURIComponent(uidRefresh)}`
          : ''
      const br = await fetch(
        `${API_BASE_URL}/properties/${id}/test-drive/bookings?property_table=${encodeURIComponent(propertyTable)}${userQ2}`
      )
      const bj = await br.json()
      if (bj.success && bj.data?.booked_dates) {
        setBookedDates(bj.data.booked_dates)
        setMyBookedDates(
          Array.isArray(bj.data.my_booked_dates) ? bj.data.my_booked_dates : []
        )
      }
      navigate(`/property/${id}`)
    } catch (e) {
      showToast('Ошибка сети', 'error')
    } finally {
      setSaving(false)
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
                  onClick={handleSubmitTestDriveRequest}
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
    </div>
  )
}
