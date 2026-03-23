import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Circle } from 'lucide-react'
import { getApiBaseUrlSync } from '../utils/apiConfig'

let API_BASE_URL = getApiBaseUrlSync()

/**
 * Блок «Тест-драйв» под удобствами: условия (депозит + ставка), кнопка перехода к календарю.
 */
export default function TestDriveSection({
  propertyId,
  propertyTable,
  hasTestDrive,
  i18nLang,
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [eligibility, setEligibility] = useState({
    has_deposit: false,
    has_bid: false,
    can_request: false,
  })

  const fetchEligibility = useCallback(async () => {
    try {
      const { getApiBaseUrl } = await import('../utils/apiConfig')
      API_BASE_URL = await getApiBaseUrl()
      const uid = localStorage.getItem('userId')
      if (!uid || !/^\d+$/.test(uid)) {
        setEligibility({ has_deposit: false, has_bid: false, can_request: false })
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
          has_bid: !!json.data.has_bid,
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

  return (
    <div className="property-detail-test-drive">
      <h3 className="property-detail-info-block__title">
        {ru ? 'Тест-драйв' : 'Test drive'}
      </h3>
      <p className="property-detail-test-drive__intro">
        {ru
          ? 'Тест-драйв — это возможность опробовать недвижимость. Выберите удобное время, и вы сможете проживать в ней до 5 дней подряд.'
          : 'Test drive lets you try the property. Pick dates and stay up to 5 consecutive days.'}
      </p>

      <ul className="property-detail-test-drive__conditions">
        <li className={eligibility.has_deposit ? 'is-done' : ''}>
          {eligibility.has_deposit ? (
            <Check className="property-detail-test-drive__check" size={18} />
          ) : (
            <Circle className="property-detail-test-drive__circle" size={18} />
          )}
          <span>
            {ru
              ? 'На депозите есть средства (баланс больше нуля)'
              : 'You have funds on deposit (balance above zero)'}
          </span>
        </li>
        <li className={eligibility.has_bid ? 'is-done' : ''}>
          {eligibility.has_bid ? (
            <Check className="property-detail-test-drive__check" size={18} />
          ) : (
            <Circle className="property-detail-test-drive__circle" size={18} />
          )}
          <span>
            {ru
              ? 'Сделана ставка именно на этот объект'
              : 'You placed a bid on this listing'}
          </span>
        </li>
      </ul>

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
            ? 'Выполните оба условия, чтобы активировать кнопку.'
            : 'Complete both requirements to enable the button.'}
        </p>
      )}
    </div>
  )
}
