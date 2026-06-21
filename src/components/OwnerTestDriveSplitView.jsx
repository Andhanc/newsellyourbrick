import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  MousePointerClick,
  X,
} from 'lucide-react'
import OwnerEmptyStatePanel from './OwnerEmptyStatePanel'
import OwnerEmptyPropertiesIllustration from './OwnerEmptyPropertiesIllustration'
import OwnerTestDriveSplitSkeleton from './OwnerTestDriveSplitSkeleton'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { OWNER_VIEWS } from '../utils/ownerTestNav'
import OwnerTestDriveDetailModal from './OwnerTestDriveDetailModal'
import { fetchOwnerProperties } from '../utils/ownerPropertiesList'
import {
  CLERK_DB_USER_SYNCED,
  countOwnerTestDriveByTab,
  fetchOwnerTestDriveBookings,
  filterOwnerTestDriveRows,
  getOwnerTestDriveUserId,
} from '../utils/ownerTestDriveList'
import { DRAWER_DISMISS_MS, useDrawerDismiss } from '../hooks/useDrawerDismiss'
import '../components/OwnerTestDriveSection.css'
import './OwnerTestDriveSplitView.css'
import OtdMobHeroArt from './OtdMobHeroArt'

const FALLBACK_PROPERTY_IMAGE =
  '/images/external/photo-1568605114967-8130f3a36994-bc29e86e2f.jpg'

function hasTestDriveFlag(prop) {
  const raw = prop?.raw ?? prop
  const v = raw?.test_drive
  return v === 1 || v === true || v === '1' || v === 'true'
}

function propertyKeyFromParts(id, table) {
  return `${table || 'properties_apartments'}:${Number(id)}`
}

function propertyKeyFromBooking(row) {
  return propertyKeyFromParts(row.propertyId, row.propertyTable)
}

function parseBookingDate(str) {
  if (!str) return null
  const raw = String(str).trim().slice(0, 10)
  const d = new Date(`${raw}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart
}

function calendarMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const startWeekday = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i += 1) cells.push({ type: 'pad', key: `p-${i}` })
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ type: 'day', key: `d-${d}`, date: new Date(year, monthIndex, d, 12, 0, 0, 0) })
  }
  return cells
}

export default function OwnerTestDriveSplitView({ userId: userIdProp, isMobile = false }) {
  const { t, i18n } = useTranslation()
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const userId = userIdProp || getOwnerTestDriveUserId()
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRow, setSelectedRow] = useState(null)
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const [mobileDrawerStep, setMobileDrawerStep] = useState('calendar')

  const locale =
    i18n.language === 'ru'
      ? 'ru-RU'
      : i18n.language === 'de'
        ? 'de-DE'
        : i18n.language === 'es'
          ? 'es-ES'
          : i18n.language === 'fr'
            ? 'fr-FR'
            : i18n.language === 'sv'
              ? 'sv-SE'
              : 'en-US'

  const loadData = useCallback(async () => {
    if (!userId) {
      setProperties([])
      setBookings([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [props, bookingRows] = await Promise.all([
        fetchOwnerProperties(userId),
        fetchOwnerTestDriveBookings(userId),
      ])
      setProperties(Array.isArray(props) ? props : [])
      setBookings(Array.isArray(bookingRows) ? bookingRows : [])
    } catch (error) {
      console.warn('OwnerTestDriveSplitView: load failed', error)
      setProperties([])
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const onSync = () => void loadData()
    window.addEventListener(CLERK_DB_USER_SYNCED, onSync)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, onSync)
  }, [loadData])

  const bookingCountByKey = useMemo(() => {
    const map = new Map()
    for (const row of bookings) {
      const key = propertyKeyFromBooking(row)
      map.set(key, (map.get(key) || 0) + 1)
    }
    return map
  }, [bookings])

  const propertyOptions = useMemo(() => {
    const map = new Map()
    for (const row of properties) {
      if (!hasTestDriveFlag(row)) continue
      const table =
        row.raw?.source_table === 'properties_houses'
          ? 'properties_houses'
          : row.raw?.source_table || 'properties_apartments'
      const key = propertyKeyFromParts(row.id, table)
      map.set(key, {
        key,
        id: row.id,
        property_table: table,
        title: row.title,
        location: row.location,
        image: row.image,
        displayId: row.displayId || `OB-${row.id}`,
      })
    }
    for (const row of bookings) {
      const key = propertyKeyFromBooking(row)
      if (map.has(key)) continue
      map.set(key, {
        key,
        id: row.propertyId,
        property_table: row.propertyTable || 'properties_apartments',
        title: row.title,
        location: row.location,
        image: row.image,
        displayId: row.propertyId ? `OB-${row.propertyId}` : '',
      })
    }
    return [...map.values()].sort((a, b) =>
      String(a.title).localeCompare(String(b.title), locale)
    )
  }, [properties, bookings, locale])

  const propertyBookings = useMemo(() => {
    if (!selectedKey) return []
    return bookings.filter((row) => propertyKeyFromBooking(row) === selectedKey)
  }, [bookings, selectedKey])

  const filterTabDefs = useMemo(
    () => [
      { id: 'all', label: t('ownerTest_testDriveTabAll') },
      { id: 'pending', label: t('ownerTest_testDriveTabPending') },
      { id: 'confirmed', label: t('ownerTest_testDriveTabConfirmed') },
      { id: 'cancelled', label: t('ownerTest_testDriveTabCancelled') },
    ],
    [t]
  )

  const tabCounts = useMemo(() => countOwnerTestDriveByTab(propertyBookings), [propertyBookings])
  const filterTabs = useMemo(
    () => filterTabDefs.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 })),
    [filterTabDefs, tabCounts]
  )

  const filteredRows = useMemo(
    () => filterOwnerTestDriveRows(propertyBookings, activeTab),
    [propertyBookings, activeTab]
  )

  const calendarCells = useMemo(() => calendarMonthGrid(calYear, calMonth), [calYear, calMonth])
  const now = new Date()

  const bookingsForCalendarDay = useCallback(
    (dayDate) => {
      if (!dayDate || !selectedKey) return []
      return propertyBookings.filter((row) => {
        const s = parseBookingDate(row.startDate)
        const e = parseBookingDate(row.endDate)
        if (!s || !e) return false
        return rangesOverlap(s, e, dayDate, dayDate)
      })
    },
    [propertyBookings, selectedKey]
  )

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d.toLocaleDateString(locale, { weekday: 'short' })
    })
  }, [locale])

  const calLabel = new Date(calYear, calMonth, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })

  const shiftCal = (delta) => {
    const d = new Date(calYear, calMonth + delta, 1)
    setCalYear(d.getFullYear())
    setCalMonth(d.getMonth())
  }

  const selectProperty = (key) => {
    setSelectedKey(key)
    setMobileDrawerStep('calendar')
    setActiveTab('all')
    setCalYear(new Date().getFullYear())
    setCalMonth(new Date().getMonth())
  }

  const selectedProperty = useMemo(
    () => propertyOptions.find((property) => property.key === selectedKey) ?? null,
    [propertyOptions, selectedKey]
  )

  const mobileDrawerOpen = isMobile && Boolean(selectedKey)
  const {
    visible: drawerVisible,
    isClosing: drawerClosing,
    requestClose: requestDrawerClose,
  } = useDrawerDismiss(mobileDrawerOpen, () => {
    setSelectedKey(null)
    setMobileDrawerStep('calendar')
  }, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  const showPropertyList = true
  const showDetailPanel = !isMobile && Boolean(selectedKey)

  useEffect(() => {
    if (!drawerVisible) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (mobileDrawerStep === 'bookings') {
        setMobileDrawerStep('calendar')
        return
      }
      requestDrawerClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [drawerVisible, mobileDrawerStep, requestDrawerClose])

  const renderMobileHero = () => (
    <article className="otd-mob-hero otd-mobile-only" aria-label={t('ownerTest_navTestDrive')}>
      <div className="otd-mob-hero__copy">
        <h1 className="otd-mob-hero__title">{t('ownerTest_navTestDrive')}</h1>
        <p className="otd-mob-hero__hint">{t('ownerTestDriveHeroHint')}</p>
        {!loading && propertyOptions.length > 0 ? (
          <span className="otd-mob-hero__count">{propertyOptions.length}</span>
        ) : null}
      </div>
      <OtdMobHeroArt className="otd-mob-hero__art" />
    </article>
  )

  const handleAddProperty = useCallback(() => {
    if (isEmbedded && goTo) {
      goTo(OWNER_VIEWS.ADD_PROPERTY)
      return
    }
    window.location.assign('/owner-add-property-test')
  }, [goTo, isEmbedded])

  const renderEmptyProperties = () => {
    if (properties.length === 0) {
      return (
        <OwnerEmptyStatePanel
          className="otd-split__empty-panel"
          illustration={OwnerEmptyPropertiesIllustration}
          title={t('ownerTest_emptyNoPropertiesTitle')}
          description={t('ownerTest_emptyNoPropertiesDesc')}
          actionLabel={t('ownerTest_ariaAddProperty')}
          onAction={handleAddProperty}
        />
      )
    }

    return (
      <div className="otd-split__empty otd-split__empty--list">
        <div className="otd-split__empty-icon" aria-hidden>
          <Inbox size={36} strokeWidth={1.25} />
        </div>
        <p className="otd-split__empty-title">{t('ownerTestDriveNoTdListingsTitle')}</p>
        <p className="otd-split__empty-text">{t('ownerTestDriveNoTdListingsText')}</p>
      </div>
    )
  }

  const renderSelectHint = () => (
    <div className="otd-split__empty otd-split__empty--hint">
      <div className="otd-split__empty-icon otd-split__empty-icon--hint" aria-hidden>
        <MousePointerClick size={40} strokeWidth={1.5} />
      </div>
      <p className="otd-split__empty-title">{t('ownerTestDriveSplitSelectTitle')}</p>
      <p className="otd-split__empty-text">{t('ownerTestDriveSplitSelectText')}</p>
    </div>
  )

  const renderPropertyCards = () => (
    <ul className="otd-split__cards">
      {propertyOptions.map((property) => {
        const active = property.key === selectedKey
        const count = bookingCountByKey.get(property.key) || 0
        const locationLabel =
          property.location && property.location !== 'Не указано' ? property.location : null
        return (
          <li key={property.key}>
            <button
              type="button"
              className={`otd-split-card${active ? ' otd-split-card--active' : ''}`}
              onClick={() => selectProperty(property.key)}
              aria-pressed={active}
            >
              <img
                src={property.image || FALLBACK_PROPERTY_IMAGE}
                alt=""
                className="otd-split-card__thumb"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_PROPERTY_IMAGE
                }}
              />
              <span className="otd-split-card__body">
                <span className="otd-split-card__title">{property.title}</span>
                {locationLabel ? (
                  <span className="otd-split-card__meta">{locationLabel}</span>
                ) : property.displayId ? (
                  <span className="otd-split-card__meta">{property.displayId}</span>
                ) : null}
              </span>
              <span className="otd-split-card__trail">
                <span className="otd-split-card__count" aria-label={t('ownerTestDriveSplitRequestsCount', { count })}>
                  {count}
                </span>
                <ChevronRight size={18} strokeWidth={2} className="otd-split-card__chevron" aria-hidden />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )

  const renderCalendar = () => (
    <div className="owner-td-calendar-wrap otd-split__calendar">
      <div className="owner-td-calendar__head">
        <button
          type="button"
          className="owner-td-calendar__nav"
          onClick={() => shiftCal(-1)}
          aria-label={t('ownerTestDriveCalendarPrev')}
        >
          <ChevronLeft size={22} />
        </button>
        <h3 className="owner-td-calendar__title">{calLabel}</h3>
        <button
          type="button"
          className="owner-td-calendar__nav"
          onClick={() => shiftCal(1)}
          aria-label={t('ownerTestDriveCalendarNext')}
        >
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="owner-td-calendar__weekdays">
        {weekdayLabels.map((w, i) => (
          <span key={i} className="owner-td-calendar__wd">
            {w}
          </span>
        ))}
      </div>
      <div className="owner-td-calendar__grid">
        {calendarCells.map((cell) => {
          if (cell.type === 'pad') {
            return <div key={cell.key} className="owner-td-cal-cell owner-td-cal-cell--pad" />
          }
          const isToday =
            cell.date.getDate() === now.getDate() &&
            cell.date.getMonth() === now.getMonth() &&
            cell.date.getFullYear() === now.getFullYear()
          const dayBookings = bookingsForCalendarDay(cell.date)
          const hasBook = dayBookings.length > 0
          const hasCancelled = dayBookings.some(
            (b) => String(b.rawStatus || '').toLowerCase() === 'cancelled'
          )
          const hasActive = dayBookings.some(
            (b) => String(b.rawStatus || '').toLowerCase() !== 'cancelled'
          )
          let tone = ''
          if (hasActive && hasCancelled) tone = 'owner-td-cal-cell--mixed'
          else if (hasCancelled && !hasActive) tone = 'owner-td-cal-cell--cancelled'
          else if (hasActive) tone = 'owner-td-cal-cell--booked'
          return (
            <div
              key={cell.key}
              className={`owner-td-cal-cell ${hasBook ? tone : ''} ${isToday ? 'owner-td-cal-cell--today' : ''}`}
            >
              <span className="owner-td-cal-cell__num">{cell.date.getDate()}</span>
              {hasBook ? (
                <span className="owner-td-cal-cell__dots" aria-hidden>
                  {dayBookings.slice(0, 3).map((b) => (
                    <i
                      key={b.id}
                      className={
                        String(b.rawStatus || '').toLowerCase() === 'cancelled'
                          ? 'owner-td-cal-cell__dot owner-td-cal-cell__dot--off'
                          : 'owner-td-cal-cell__dot'
                      }
                    />
                  ))}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderBookings = () => (
    <div className="otd-split__bookings">
      <div className="otd-split__bookings-head">
        <h3 className="otd-split__bookings-title">{t('ownerTestDriveBookingsAsideTitle')}</h3>
        <div className="otd-split__tabs" role="tablist" aria-label={t('ownerTest_chartFilterTestDrives')}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`otd-split__tab${activeTab === tab.id ? ' otd-split__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="otd-split__tab-label">{tab.label}</span>
              <span className="otd-split__tab-count">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <p className="otd-split__bookings-empty">
          {propertyBookings.length === 0
            ? t('ownerTestDriveBookingsAsideEmpty')
            : t('ownerTest_propertiesEmptyFilter')}
        </p>
      ) : (
        <ul className="otd-split__requests">
          {filteredRows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`otd-split-request otd-split-request--${row.statusKey}`}
                onClick={() => setSelectedRow(row)}
              >
                <span className="otd-split-request__main">
                  <span className="otd-split-request__buyer">{row.buyer}</span>
                  <span className="otd-split-request__dates">{row.datesShort || row.dates}</span>
                </span>
                <span className="otd-split-request__aside">
                  <span className={`otd-split-request__status otd-split-request__status--${row.statusKey}`}>
                    {row.status}
                  </span>
                  <span className="otd-split-request__amount">{row.amount}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const renderDetailPanel = () => {
    if (!selectedKey) return renderSelectHint()
    return (
      <div className="otd-split__panel">
        {renderCalendar()}
        {renderBookings()}
      </div>
    )
  }

  const renderMobileDrawerHistoryLink = () => (
    <button
      type="button"
      className="otd-property-drawer__history-link"
      onClick={() => setMobileDrawerStep('bookings')}
    >
      <span className="otd-property-drawer__history-link-copy">
        <span className="otd-property-drawer__history-link-title">
          {t('ownerTestDriveSplitBookingsHistory')}
        </span>
        <span className="otd-property-drawer__history-link-meta">
          {t('ownerTestDriveSplitRequestsCount', { count: propertyBookings.length })}
        </span>
      </span>
      <span className="otd-property-drawer__history-link-trail">
        <span className="otd-property-drawer__history-link-count">{propertyBookings.length}</span>
        <ChevronRight size={18} strokeWidth={2} className="otd-property-drawer__history-link-chevron" aria-hidden />
      </span>
    </button>
  )

  const renderMobileDrawerBody = () => {
    if (mobileDrawerStep === 'bookings') {
      return (
        <div className="otd-property-drawer__panel otd-property-drawer__panel--bookings">
          <button
            type="button"
            className="otd-split__back otd-property-drawer__back"
            onClick={() => setMobileDrawerStep('calendar')}
          >
            <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
            {t('ownerTestDriveDetailBack')}
          </button>
          {renderBookings()}
        </div>
      )
    }

    return (
      <div className="otd-property-drawer__panel otd-property-drawer__panel--calendar">
        {renderCalendar()}
        {renderMobileDrawerHistoryLink()}
      </div>
    )
  }

  const renderMobilePropertyDrawer = () => {
    if (!drawerVisible || !selectedProperty || typeof document === 'undefined') return null

    const closingBackdrop = drawerClosing ? ' drawer-dismiss-backdrop--closing' : ''
    const closingSheet = drawerClosing ? ' drawer-dismiss-from-bottom--closing' : ''
    const openBackdrop = drawerClosing ? '' : ' otd-property-drawer__backdrop--open'
    const openSheet = drawerClosing ? '' : ' otd-property-drawer__sheet--open'

    return createPortal(
      <div className="otd-property-drawer otd-property-drawer--visible">
        <button
          type="button"
          className={`otd-property-drawer__backdrop${openBackdrop}${closingBackdrop}`}
          aria-label={t('ownerTestDriveDetailClose')}
          onClick={() => requestDrawerClose()}
        />
        <aside
          className={`otd-property-drawer__sheet${openSheet}${closingSheet}`}
          role="dialog"
          aria-modal="true"
          aria-label={selectedProperty.title}
        >
          <div className="otd-property-drawer__handle" aria-hidden>
            <span />
          </div>
          <header className="otd-property-drawer__head">
            <img
              src={selectedProperty.image || FALLBACK_PROPERTY_IMAGE}
              alt=""
              className="otd-property-drawer__thumb"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_PROPERTY_IMAGE
              }}
            />
            <div className="otd-property-drawer__head-copy">
              <h2 className="otd-property-drawer__title">{selectedProperty.title}</h2>
              {selectedProperty.location && selectedProperty.location !== 'Не указано' ? (
                <p className="otd-property-drawer__meta">{selectedProperty.location}</p>
              ) : selectedProperty.displayId ? (
                <p className="otd-property-drawer__meta">{selectedProperty.displayId}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="otd-property-drawer__close"
              aria-label={t('ownerTestDriveDetailClose')}
              onClick={() => requestDrawerClose()}
            >
              <X size={20} strokeWidth={2.2} aria-hidden />
            </button>
          </header>
          <div className="otd-property-drawer__body">
            {renderMobileDrawerBody()}
          </div>
        </aside>
      </div>,
      document.body
    )
  }

  if (loading) {
    return (
      <>
        {isMobile ? renderMobileHero() : null}
        <OwnerTestDriveSplitSkeleton />
      </>
    )
  }

  if (propertyOptions.length === 0) {
    return (
      <>
        {isMobile ? renderMobileHero() : null}
        {renderEmptyProperties()}
      </>
    )
  }

  return (
    <>
      {isMobile ? renderMobileHero() : null}
      <div className={`otd-split${isMobile ? ' otd-split--mobile' : ''}`}>
        {showPropertyList ? (
          <section className="otd-split__left" aria-label={t('ownerTestDriveSplitPropertiesTitle')}>
            <header className="otd-split__left-head otd-desktop-only">
              <h2 className="otd-split__left-title">{t('ownerTestDriveSplitPropertiesTitle')}</h2>
              <span className="otd-split__left-count">{propertyOptions.length}</span>
            </header>
            {renderPropertyCards()}
          </section>
        ) : null}

        {showDetailPanel ? (
          <section className="otd-split__right" aria-label={t('ownerTest_navTestDrive')}>
            {renderDetailPanel()}
          </section>
        ) : null}
      </div>

      <OwnerTestDriveDetailModal
        row={selectedRow}
        userId={userId}
        onClose={() => setSelectedRow(null)}
        onUpdated={loadData}
      />
      {renderMobilePropertyDrawer()}
    </>
  )
}
