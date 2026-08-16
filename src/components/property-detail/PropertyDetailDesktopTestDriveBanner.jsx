import { forwardRef, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { getPropertyDetailPath } from '../../utils/propertyDetailUrl'
import { getApiBaseUrlSync } from '../../utils/apiConfig'
import './PropertyDetailDesktopTestDriveBanner.css'

let API_BASE_URL = getApiBaseUrlSync()

const CALENDAR_WEEKS = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
  [27, 28, 29, 30, 31, null, null],
]
const SELECTED_DAYS = new Set([15, 16, 17])

function getWeekdayShorts(language) {
  const locale = String(language || 'ru').split('-')[0]
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-01 was Monday — produce Mon…Sun order
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2024, 0, 1 + index))
    return formatter.format(date).replace(/\.$/, '')
  })
}

function TestDriveMiniCalendar() {
  const { t, i18n } = useTranslation()
  const weekDays = getWeekdayShorts(i18n.language)

  return (
    <div className="pdx-test-drive-banner__calendar" aria-hidden>
      <p className="pdx-test-drive-banner__calendar-title">{t('pdxTestDrive_calendarTitle')}</p>
      <div className="pdx-test-drive-banner__calendar-grid">
        {weekDays.map((day) => (
          <span key={day} className="pdx-test-drive-banner__calendar-weekday">
            {day}
          </span>
        ))}
        {CALENDAR_WEEKS.flatMap((week, weekIndex) =>
          week.map((day, dayIndex) => {
            if (day == null) {
              return (
                <span
                  key={`empty-${weekIndex}-${dayIndex}`}
                  className="pdx-test-drive-banner__calendar-day pdx-test-drive-banner__calendar-day--empty"
                />
              )
            }

            const isSelected = SELECTED_DAYS.has(day)
            const isRangeStart = day === 15
            const isRangeEnd = day === 17

            return (
              <span
                key={`day-${day}`}
                className={[
                  'pdx-test-drive-banner__calendar-day',
                  isSelected ? 'is-selected' : '',
                  isRangeStart ? 'is-range-start' : '',
                  isRangeEnd ? 'is-range-end' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {day}
              </span>
            )
          }),
        )}
      </div>
      <p className="pdx-test-drive-banner__calendar-foot">{t('pdxTestDrive_calendarFoot')}</p>
    </div>
  )
}

const PropertyDetailDesktopTestDriveBanner = forwardRef(function PropertyDetailDesktopTestDriveBanner(
  {
    propertyId,
    propertySlug,
    propertyTable,
    propertyType,
    imageUrl = '',
    paused = false,
  },
  ref,
) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [canRequest, setCanRequest] = useState(false)

  const fetchEligibility = useCallback(async () => {
    try {
      const { getApiBaseUrl } = await import('../../utils/apiConfig')
      API_BASE_URL = await getApiBaseUrl()
      const uid = localStorage.getItem('userId')
      if (!uid || !/^\d+$/.test(uid)) {
        setCanRequest(false)
        setLoading(false)
        return
      }
      const q = new URLSearchParams({
        user_id: uid,
        property_table: propertyTable || 'properties_apartments',
      })
      const apiKey = propertySlug || propertyId
      const res = await fetch(
        `${API_BASE_URL}/properties/${encodeURIComponent(apiKey)}/test-drive/eligibility?${q.toString()}`,
      )
      const json = await res.json()
      setCanRequest(Boolean(json.success && json.data?.can_request))
    } catch (error) {
      console.warn('test-drive eligibility', error)
      setCanRequest(false)
    } finally {
      setLoading(false)
    }
  }, [propertyId, propertySlug, propertyTable])

  useEffect(() => {
    void fetchEligibility()
  }, [fetchEligibility])

  const handleBook = () => {
    if (paused) return
    const table = encodeURIComponent(propertyTable || 'properties_apartments')
    const basePath = getPropertyDetailPath({
      id: propertyId,
      property_type: propertyType,
      slug: propertySlug,
    })
    const pathname = basePath.split('?')[0]
    navigate(`${pathname}/test-drive?table=${table}`)
  }

  const promoPhoto =
    (typeof imageUrl === 'string' && imageUrl.trim()) ||
    '/images/property-detail/desktop-test-drive.png'

  return (
    <section
      ref={ref}
      id="property-test-drive-section"
      className={`pdx-test-drive-banner${paused ? ' pdx-test-drive-banner--paused' : ''}`}
      aria-labelledby="pdx-test-drive-banner-title"
    >
      <div
        className="pdx-test-drive-banner__surface"
        style={{ '--pdx-test-drive-photo': `url("${promoPhoto}")` }}
      >
        {paused ? (
          <div className="pdx-test-drive-banner__paused" role="status">
            <span>{t('propertyDetailTestDrivePaused')}</span>
          </div>
        ) : null}
        <div className="pdx-test-drive-banner__content">
          <span className="pdx-test-drive-banner__eyebrow">{t('pdxTestDrive_eyebrow')}</span>
          <h2 id="pdx-test-drive-banner-title" className="pdx-test-drive-banner__title">
            {t('pdxTestDrive_title')}
          </h2>
          <p className="pdx-test-drive-banner__lead">{t('pdxTestDrive_lead')}</p>
          <button
            type="button"
            className="pdx-test-drive-banner__cta"
            disabled={paused || loading || !canRequest}
            onClick={handleBook}
          >
            {loading ? t('pdxTestDrive_checking') : t('pdxTestDrive_cta')}
            {!loading ? <FiArrowRight size={16} aria-hidden /> : null}
          </button>
          {!paused && !loading && !canRequest ? (
            <p className="pdx-test-drive-banner__hint">
              {t('propertyDetailTestDriveDepositHint', {
                defaultValue: 'Пополните депозит на платформе, чтобы забронировать тест-драйв.',
              })}
            </p>
          ) : null}
        </div>

        <TestDriveMiniCalendar />
      </div>
    </section>
  )
})

export default PropertyDetailDesktopTestDriveBanner
