import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiCheckCircle, FiUpload } from 'react-icons/fi'
import Header from '../components/Header'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { showToast } from '../components/ToastContainer'
import './TestDriveCheckInPage.css'

let API_BASE_URL = getApiBaseUrlSync()

function toDataUrls(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
    )
  )
}

export default function TestDriveCheckInPage() {
  const navigate = useNavigate()
  const { bookingId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({
    entered_object: '',
    entered_object_comment: '',
    amenities_ok: '',
    amenities_comment: '',
    amenities_photos: [],
    defects_state: '',
    defects_comment: '',
    defects_photos: [],
    ready_to_stay: '',
    ready_to_stay_comment: '',
  })

  useEffect(() => {
    ;(async () => {
      try {
        const { getApiBaseUrl } = await import('../utils/apiConfig')
        API_BASE_URL = await getApiBaseUrl()
        const uid = localStorage.getItem('userId')
        if (!uid || !/^\d+$/.test(uid)) {
          showToast('Требуется авторизация', 'error')
          navigate('/profile/bookings')
          return
        }
        const res = await fetch(`${API_BASE_URL}/test-drive-bookings/${bookingId}/detail?user_id=${uid}`)
        const data = await res.json()
        if (!res.ok || !data.success) {
          showToast(data.error || 'Не удалось загрузить данные заселения', 'error')
          navigate('/profile/bookings')
          return
        }
        setDetail(data.data)
      } catch {
        showToast('Ошибка сети', 'error')
        navigate('/profile/bookings')
      } finally {
        setLoading(false)
      }
    })()
  }, [bookingId, navigate])

  const canSubmit = useMemo(() => {
    if (!form.entered_object || !form.amenities_ok || !form.defects_state || !form.ready_to_stay) return false
    if (form.entered_object === 'no' && !form.entered_object_comment.trim()) return false
    if (form.amenities_ok === 'no' && (!form.amenities_comment.trim() || form.amenities_photos.length === 0)) return false
    if (form.defects_state === 'issues' && (!form.defects_comment.trim() || form.defects_photos.length === 0)) return false
    if (form.ready_to_stay === 'no' && !form.ready_to_stay_comment.trim()) return false
    return true
  }, [form])

  const handleSubmit = async () => {
    const uid = localStorage.getItem('userId')
    if (!uid || !/^\d+$/.test(uid)) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/test-drive-bookings/${bookingId}/check-in-report`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(uid, 10),
          report: {
            ...form,
            submitted_at: new Date().toISOString(),
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        showToast(data.error || 'Не удалось сохранить анкету', 'error')
        return
      }
      showToast('Проверка объекта отправлена', 'success')
      navigate('/profile/bookings')
    } catch {
      showToast('Ошибка сети', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="td-checkin-page">
        <Header />
        <div className="td-checkin-page__state">Загрузка...</div>
      </div>
    )
  }
  if (!detail) return null

  const { booking, property } = detail

  return (
    <div className="td-checkin-page">
      <Header />
      <div className="td-checkin-page__wrap">
        <button type="button" className="td-checkin-page__back" onClick={() => navigate('/profile/bookings')}>
          <FiArrowLeft size={18} />
          Назад к бронированиям
        </button>
        <motion.div className="td-checkin-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1>Добро пожаловать на объект</h1>
          <p className="td-checkin-card__lead">
            <strong>{property.title}</strong>
            <br />
            Ваша бронь: {booking.start_date} — {booking.end_date}
          </p>
          <p className="td-checkin-card__lead">Давайте проверим всё перед проживанием.</p>

          <section className="td-checkin-section">
            <h3>Смогли ли попасть в объект?</h3>
            <div className="td-checkin-options">
              <button type="button" className={form.entered_object === 'yes' ? 'active' : ''} onClick={() => setForm((s) => ({ ...s, entered_object: 'yes' }))}>Да</button>
              <button type="button" className={form.entered_object === 'no' ? 'active' : ''} onClick={() => setForm((s) => ({ ...s, entered_object: 'no' }))}>Нет</button>
            </div>
            {form.entered_object === 'no' ? (
              <textarea value={form.entered_object_comment} onChange={(e) => setForm((s) => ({ ...s, entered_object_comment: e.target.value }))} placeholder="Опишите, что произошло" />
            ) : null}
          </section>

          <section className="td-checkin-section">
            <h3>Есть ли все указанные удобства?</h3>
            <ul className="td-checkin-amenities">{(property.amenities || []).map((a) => <li key={a}>{a}</li>)}</ul>
            <div className="td-checkin-options">
              <button type="button" className={form.amenities_ok === 'yes' ? 'active' : ''} onClick={() => setForm((s) => ({ ...s, amenities_ok: 'yes' }))}>Да</button>
              <button type="button" className={form.amenities_ok === 'no' ? 'active' : ''} onClick={() => setForm((s) => ({ ...s, amenities_ok: 'no' }))}>Нет</button>
            </div>
            {form.amenities_ok === 'no' ? (
              <>
                <textarea value={form.amenities_comment} onChange={(e) => setForm((s) => ({ ...s, amenities_comment: e.target.value }))} placeholder="Что отсутствует?" />
                <label className="td-checkin-upload"><FiUpload size={16} /> Добавить фото
                  <input type="file" accept="image/*" multiple onChange={async (e) => {
                    const urls = await toDataUrls(Array.from(e.target.files || []))
                    setForm((s) => ({ ...s, amenities_photos: urls }))
                  }} />
                </label>
              </>
            ) : null}
          </section>

          <section className="td-checkin-section">
            <h3>Есть ли дефекты или неудобства?</h3>
            <div className="td-checkin-options">
              <button type="button" className={form.defects_state === 'ok' ? 'active' : ''} onClick={() => setForm((s) => ({ ...s, defects_state: 'ok' }))}>Всё хорошо</button>
              <button type="button" className={form.defects_state === 'issues' ? 'active' : ''} onClick={() => setForm((s) => ({ ...s, defects_state: 'issues' }))}>Есть проблемы</button>
            </div>
            {form.defects_state === 'issues' ? (
              <>
                <textarea value={form.defects_comment} onChange={(e) => setForm((s) => ({ ...s, defects_comment: e.target.value }))} placeholder="Опишите дефекты" />
                <label className="td-checkin-upload"><FiUpload size={16} /> Добавить фото
                  <input type="file" accept="image/*" multiple onChange={async (e) => {
                    const urls = await toDataUrls(Array.from(e.target.files || []))
                    setForm((s) => ({ ...s, defects_photos: urls }))
                  }} />
                </label>
              </>
            ) : null}
          </section>

          <section className="td-checkin-section">
            <h3>Готовы ли к проживанию?</h3>
            <div className="td-checkin-options">
              <button type="button" className={form.ready_to_stay === 'yes' ? 'active' : ''} onClick={() => setForm((s) => ({ ...s, ready_to_stay: 'yes' }))}>Да</button>
              <button type="button" className={form.ready_to_stay === 'no' ? 'active' : ''} onClick={() => setForm((s) => ({ ...s, ready_to_stay: 'no' }))}>Нет</button>
            </div>
            {form.ready_to_stay === 'no' ? (
              <textarea value={form.ready_to_stay_comment} onChange={(e) => setForm((s) => ({ ...s, ready_to_stay_comment: e.target.value }))} placeholder="Что мешает заселиться?" />
            ) : null}
          </section>

          <button type="button" className="td-checkin-submit" disabled={!canSubmit || saving} onClick={handleSubmit}>
            <FiCheckCircle size={18} />
            {saving ? 'Отправляем...' : 'Завершить проверку'}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
