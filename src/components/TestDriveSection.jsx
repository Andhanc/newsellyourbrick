import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Circle } from 'lucide-react'
import { getApiBaseUrlSync } from '../utils/apiConfig'

let API_BASE_URL = getApiBaseUrlSync()

/**
 * Блок «Тест-драйв»: единственное условие для записи — депозит на платформе больше нуля.
 */
export default function TestDriveSection({
  propertyId,
  propertyTable,
  hasTestDrive,
  i18nLang,
  layout = 'default',
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [eligibility, setEligibility] = useState({
    has_deposit: false,
    can_request: false,
  })

  const fetchEligibility = useCallback(async () => {
    try {
      const { getApiBaseUrl } = await import('../utils/apiConfig')
      API_BASE_URL = await getApiBaseUrl()
      const uid = localStorage.getItem('userId')
      if (!uid || !/^\d+$/.test(uid)) {
        setEligibility({ has_deposit: false, can_request: false })
        setLoading(false)
        return
      }
      const q = new URLSearchParams({
        user_id: uid,
        property_table: propertyTable || 'properties_apartments',
      })
      const res = await fetch(
        `${API_BASE_URL}/properties/${propertyId}/test-drive/eligibility?${q.toString()}`
      )
      const json = await res.json()
      if (json.success && json.data) {
        setEligibility({
          has_deposit: !!json.data.has_deposit,
          can_request: !!json.data.can_request,
        })
      }
    } catch (e) {
      console.warn('test-drive eligibility', e)
    } finally {
      setLoading(false)
    }
  }, [propertyId, propertyTable])

  useEffect(() => {
    fetchEligibility()
  }, [fetchEligibility])

  useEffect(() => {
    const onRefresh = (ev) => {
      if (String(ev.detail?.propertyId) === String(propertyId)) {
        fetchEligibility()
      }
    }
    window.addEventListener('syb-testdrive-refresh', onRefresh)
    return () => window.removeEventListener('syb-testdrive-refresh', onRefresh)
  }, [propertyId, fetchEligibility])

  useEffect(() => {
    const t = setInterval(() => fetchEligibility(), 5000)
    return () => clearInterval(t)
  }, [fetchEligibility])

  if (!hasTestDrive) return null

  const ru = !i18nLang || i18nLang.startsWith('ru')
  const allDone = eligibility.can_request

  const isPromoLayout = layout === 'promo'

  return (
    <div
      id="property-test-drive-section"
      className={`property-detail-test-drive${isPromoLayout ? ' property-detail-test-drive--promo' : ''}`}
    >
      {!isPromoLayout ? (
      <h3 className="property-detail-info-block__title">
        {ru ? 'Тест-драйв' : 'Test drive'}
      </h3>
      ) : null}
      {!isPromoLayout ? (
      <p className="property-detail-test-drive__intro">
        {ru
          ? 'Тест-драйв — возможность прожить в объекте перед сделкой. Выберите от 5 до 21 календарного дня подряд, согласуйте заезд с владельцем и оплатите проживание.'
          : 'Test drive lets you stay in the property before you buy. Pick 5–21 consecutive calendar days, coordinate with the owner, and pay for the stay.'}
      </p>
      ) : null}

      {!isPromoLayout ? (
      <ul className="property-detail-test-drive__conditions">
        <li className={eligibility.has_deposit ? 'is-done' : ''}>
          {eligibility.has_deposit ? (
            <Check className="property-detail-test-drive__check" size={18} />
          ) : (
            <Circle className="property-detail-test-drive__circle" size={18} />
          )}
          <span>
            {ru
              ? 'Депозит на платформе пополнен: баланс депозита больше нуля'
              : 'Your platform deposit is funded: deposit balance is above zero'}
          </span>
        </li>
      </ul>
      ) : null}

      <button
        type="button"
        className="property-detail-test-drive__cta"
        disabled={!allDone || loading}
        onClick={() => {
          const table = encodeURIComponent(propertyTable || 'properties_apartments')
          navigate(`/property/${propertyId}/test-drive?table=${table}`)
        }}
      >
        {loading
          ? ru
            ? 'Проверка…'
            : 'Checking…'
          : ru
            ? 'Выбрать даты тест-драйва'
            : 'Choose test drive dates'}
      </button>
      {!allDone && !loading && (
        <p className="property-detail-test-drive__hint">
          {ru
            ? 'Пополните депозит на платформе, чтобы активировать кнопку.'
            : 'Top up your platform deposit to enable the button.'}
        </p>
      )}
    </div>
  )
}
