import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { Check, Circle } from 'lucide-react'
import { FiCalendar } from 'react-icons/fi'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { fetchTestDriveEligibility } from '../utils/testDriveEligibilityApi'

let API_BASE_URL = getApiBaseUrlSync()

/**
 * Блок «Тест-драйв»: единственное условие для записи — депозит на платформе больше нуля.
 */
export default function TestDriveSection({
  propertyId,
  propertySlug,
  propertyTable,
  propertyType,
  hasTestDrive,
  i18nLang,
  layout = 'default',
  paused = false,
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [eligibility, setEligibility] = useState({
    has_deposit: false,
    can_request: false,
  })

  const fetchEligibility = useCallback(async ({ force = false } = {}) => {
    try {
      const { getApiBaseUrl } = await import('../utils/apiConfig')
      API_BASE_URL = await getApiBaseUrl()
      const uid = localStorage.getItem('userId')
      const data = await fetchTestDriveEligibility(API_BASE_URL, {
        propertyKey: propertySlug || propertyId,
        userId: uid,
        propertyTable,
        force,
      })
      setEligibility({
        has_deposit: Boolean(data?.has_deposit),
        can_request: Boolean(data?.can_request),
      })
    } catch (e) {
      console.warn('test-drive eligibility', e)
    } finally {
      setLoading(false)
    }
  }, [propertyId, propertySlug, propertyTable])

  useEffect(() => {
    void fetchEligibility()
  }, [fetchEligibility])

  useEffect(() => {
    const onRefresh = (ev) => {
      if (String(ev.detail?.propertyId) === String(propertyId)) {
        void fetchEligibility({ force: true })
      }
    }
    window.addEventListener('syb-testdrive-refresh', onRefresh)
    return () => window.removeEventListener('syb-testdrive-refresh', onRefresh)
  }, [propertyId, fetchEligibility])

  if (!hasTestDrive) return null

  const ru = !i18nLang || i18nLang.startsWith('ru')
  const allDone = eligibility.can_request

  const isPromoLayout = layout === 'promo'

  return (
    <div
      id="property-test-drive-section"
      className={`property-detail-test-drive${isPromoLayout ? ' property-detail-test-drive--promo' : ''}${paused ? ' property-detail-test-drive--paused' : ''}`}
    >
      {paused && !isPromoLayout ? (
        <div className="property-detail-test-drive__paused" role="status">
          <span>{ru ? 'Тест-драйв приостановлен' : 'Test drive paused'}</span>
        </div>
      ) : null}
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
        disabled={paused || !allDone || loading}
        onClick={() => {
          if (paused) return
          const table = encodeURIComponent(propertyTable || 'properties_apartments')
          const basePath = getPropertyDetailPath({
            id: propertyId,
            property_type: propertyType,
            slug: propertySlug,
          })
          const pathname = basePath.split('?')[0]
          navigate(`${pathname}/test-drive?table=${table}`)
        }}
      >
        {isPromoLayout ? (
          <span className="property-detail-test-drive__cta-icon" aria-hidden>
            <FiCalendar size={22} strokeWidth={2.15} />
          </span>
        ) : null}
        {loading
          ? ru
            ? 'Проверка…'
            : 'Checking…'
          : isPromoLayout
            ? ru
              ? 'Выбрать даты'
              : 'Pick dates'
            : ru
              ? 'Выбрать даты тест-драйва'
              : 'Choose test drive dates'}
      </button>
      {!paused && !allDone && !loading && (
        <p className="property-detail-test-drive__hint">
          {ru
            ? 'Пополните депозит на платформе, чтобы активировать кнопку.'
            : 'Top up your platform deposit to enable the button.'}
        </p>
      )}
    </div>
  )
}
