import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  i18nLang: _i18nLang,
  layout = 'default',
  paused = false,
}) {
  const { t } = useTranslation()
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

  const allDone = eligibility.can_request

  const isPromoLayout = layout === 'promo'

  return (
    <div
      id="property-test-drive-section"
      className={`property-detail-test-drive${isPromoLayout ? ' property-detail-test-drive--promo' : ''}${paused ? ' property-detail-test-drive--paused' : ''}`}
    >
      {paused && !isPromoLayout ? (
        <div className="property-detail-test-drive__paused" role="status">
          <span>{t('testDrivePaused')}</span>
        </div>
      ) : null}
      {!isPromoLayout ? (
      <h3 className="property-detail-info-block__title">
        {t('testDriveSectionTitle')}
      </h3>
      ) : null}
      {!isPromoLayout ? (
      <p className="property-detail-test-drive__intro">
        {t('testDriveSectionIntro')}
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
            {t('testDriveDepositCondition')}
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
          ? t('testDriveChecking')
          : isPromoLayout
            ? t('testDrivePickDates')
            : t('testDriveChooseDates')}
      </button>
      {!paused && !allDone && !loading && (
        <p className="property-detail-test-drive__hint">
          {t('testDriveDepositHint')}
        </p>
      )}
    </div>
  )
}
