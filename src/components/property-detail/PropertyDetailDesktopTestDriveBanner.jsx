import { forwardRef, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { getPropertyDetailPath } from '../../utils/propertyDetailUrl'
import { getApiBaseUrlSync } from '../../utils/apiConfig'
import './PropertyDetailDesktopTestDriveBanner.css'

let API_BASE_URL = getApiBaseUrlSync()

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const CALENDAR_WEEKS = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
  [27, 28, 29, 30, 31, null, null],
]
const SELECTED_DAYS = new Set([15, 16, 17])

function TestDriveMiniCalendar() {
  return (
    <div className="pdx-test-drive-banner__calendar" aria-hidden>
      <p className="pdx-test-drive-banner__calendar-title">Выберите даты</p>
      <div className="pdx-test-drive-banner__calendar-grid">
        {WEEK_DAYS.map((day) => (
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
      <p className="pdx-test-drive-banner__calendar-foot">3 дня · 2 ночи</p>
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
      className="pdx-test-drive-banner"
      aria-labelledby="pdx-test-drive-banner-title"
    >
      <div
        className="pdx-test-drive-banner__surface"
        style={{ '--pdx-test-drive-photo': `url("${promoPhoto}")` }}
      >
        <div className="pdx-test-drive-banner__content">
          <span className="pdx-test-drive-banner__eyebrow">Тест-драйв</span>
          <h2 id="pdx-test-drive-banner-title" className="pdx-test-drive-banner__title">
            Попробуйте пожить в объекте до покупки
          </h2>
          <p className="pdx-test-drive-banner__lead">
            Забронируйте тест-драйв на несколько дней и убедитесь, что это ваш идеальный выбор.
          </p>
          <button
            type="button"
            className="pdx-test-drive-banner__cta"
            disabled={loading || !canRequest}
            onClick={handleBook}
          >
            {loading ? 'Проверка…' : 'Забронировать тест-драйв'}
            {!loading ? <FiArrowRight size={16} aria-hidden /> : null}
          </button>
          {!loading && !canRequest ? (
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
