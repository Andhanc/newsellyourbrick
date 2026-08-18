import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import { FiArrowRight } from 'react-icons/fi'
import FavoritePropertyCard from '../components/FavoritePropertyCard'
import CompareInvestorResults from '../components/compare/CompareInvestorResults'
import { useFavoriteAuctionItems } from '../hooks/useFavoriteAuctionItems'
import useMobileLayout from '../hooks/useMobileLayout'
import { getComparisonGroupKey, hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { showNotification } from '../utils/toastHelper'
import { askPropertyCompareAssistant } from '../services/aiService'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasPropertyListingTimer } from '../utils/auctionReminderBounds'
import './Compare.css'
import '../components/AuctionPropertyCard.css'
import '../components/DebtsPropertyCard.css'
import '../components/SharesPropertyCard.css'
import '../styles/hrShowcaseAuctionCards.css'
import '../styles/hrShowcaseDebtsCards.css'
import '../styles/discoverAuctionCards.css'
import '../components/ui/AuctionMobileLayout.css'
import { formatPropertyPrice } from '../utils/currency'
import { isAuctionListing, resolvePositivePropertyPrice } from '../utils/compareDecision'
import { createCompareAiRequestGuard } from '../utils/compareAiRequestGuard'

const COMPARE_PICK_SKELETON_COUNT = 4
const COMPARE_HEADER_ILLUSTRATION = '/images/favorites-compare-reference-style.png'

/** Плейсхолдер карточки выбора, пока каталог и избранное подгружаются */
function ComparePickCardSkeleton() {
  return (
    <li>
      <div className="auction-card auction-card--skeleton" aria-hidden>
        <div className="auction-card__media auction-card-skeleton__media" />
        <div className="auction-card__body auction-card-skeleton__body">
          <div className="auction-card-skeleton__line auction-card-skeleton__line--short" />
          <div className="auction-card-skeleton__line auction-card-skeleton__line--title" />
          <div className="auction-card-skeleton__line auction-card-skeleton__line--specs" />
          <div className="auction-card-skeleton__price-panel" />
          <div className="auction-card-skeleton__btn" />
        </div>
      </div>
    </li>
  )
}

function formatTypeLabel(groupKey, t) {
  if (!groupKey) return t('comparePage_typeObject')
  if (groupKey.startsWith('mock:')) {
    const sub = groupKey.slice(5)
    const m = {
      recommended: t('comparePage_typeRecommended'),
      nearby: t('comparePage_typeNearby'),
      kvaritra: t('comparePage_typeApartmentDemo'),
      apartment: t('comparePage_typeApartmentDemo'),
      villa: t('comparePage_typeVillaDemo'),
      flat: t('comparePage_typeApartmentDemo'),
      townhouse: t('comparePage_typeTownhouseDemo'),
      property: t('comparePage_typeObject'),
    }
    return m[sub] || sub
  }
  if (groupKey === 'properties_apartments') return t('comparePage_typeApartment')
  if (groupKey === 'properties_houses') return t('comparePage_typeHouse')
  if (groupKey === 'properties') return t('comparePage_typeObject')
  return groupKey
}

function formatPrice(price, currency = 'USD', dash = '—') {
  if (price == null || price === '') return dash
  return formatPropertyPrice(price, currency, { compact: true })
}

function toPositiveNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function areaM2(p) {
  const a = Number(p.sqft ?? p.area ?? 0)
  return a > 0 ? a : null
}

function livingAreaM2(p) {
  const a = Number(p.living_area ?? p.livingArea ?? 0)
  return a > 0 ? a : null
}

function landAreaM2(p) {
  const a = Number(p.land_area ?? p.landArea ?? 0)
  return a > 0 ? a : null
}

function auctionStartingPrice(p) {
  return [p.auction_starting_price, p.auctionStartingPrice, p.starting_price]
    .map(toPositiveNumber)
    .find((value) => value != null) ?? null
}

function shouldRenderAuctionRows(left, right) {
  return isAuctionListing(left) || isAuctionListing(right)
}

function isHouseLike(p) {
  const t = String(p.property_type || '').toLowerCase()
  if (t === 'house' || t === 'villa') return true
  return p.source_table === 'houses'
}

function isApartmentLike(p) {
  const t = String(p.property_type || '').toLowerCase()
  if (t === 'apartment' || t === 'commercial') return true
  return p.source_table === 'apartments'
}

function houseFloorsCount(p) {
  const n = Number(p.floors ?? p.storeys ?? 0)
  return Number.isFinite(n) && n > 0 ? n : null
}

function formatFloorInBuilding(p, t) {
  const f = Number(p.floor ?? p.floor_number)
  const tf = Number(p.total_floors ?? p.totalFloors)
  const hasF = Number.isFinite(f) && f > 0
  const hasTf = Number.isFinite(tf) && tf > 0
  if (hasF && hasTf) return t('comparePage_floorOf', { floor: f, total: tf })
  if (hasF) return String(f)
  return t('comparePage_dash')
}

function truthyAmenityFlag(v) {
  return v === 1 || v === true || v === '1' || v === 'yes'
}

function amenityListIncludes(p, code) {
  const a = p.amenities
  if (!Array.isArray(a)) return false
  return a.includes(code)
}

function countApartmentComfortFlags(p) {
  const keys = ['balcony', 'parking', 'elevator', 'electricity', 'internet', 'security', 'furniture']
  let n = 0
  for (const k of keys) {
    if (truthyAmenityFlag(p[k]) || amenityListIncludes(p, k)) n += 1
  }
  return n
}

function countHouseComfortFlags(p) {
  const keys = ['pool', 'garden', 'garage', 'parking', 'electricity', 'internet', 'security', 'furniture']
  let n = 0
  for (const k of keys) {
    if (truthyAmenityFlag(p[k]) || amenityListIncludes(p, k)) n += 1
  }
  return n
}

function comfortScore(p) {
  if (isHouseLike(p)) return countHouseComfortFlags(p)
  return countApartmentComfortFlags(p)
}

function hasComfortData(p) {
  const keys = isHouseLike(p)
    ? ['pool', 'garden', 'garage', 'parking', 'electricity', 'internet', 'security', 'furniture']
    : ['balcony', 'parking', 'elevator', 'electricity', 'internet', 'security', 'furniture']
  return Array.isArray(p.amenities) || keys.some((key) => Object.prototype.hasOwnProperty.call(p, key))
}

function compareMetric(a, b, mode) {
  if (a == null || b == null) return null
  if (Math.abs(a - b) < 1e-9) return 'tie'
  if (mode === 'lower') return a < b ? 'left' : 'right'
  return a > b ? 'left' : 'right'
}

function yearBuiltNum(p) {
  const y = p.year_built ?? p.yearBuilt
  if (y == null || y === '') return null
  const n = Number(y)
  return Number.isFinite(n) && n >= 1700 && n <= 2200 ? n : null
}

const BUILDING_TYPE_KEYS = {
  monolithic: 'comparePage_building_monolithic',
  brick: 'comparePage_building_brick',
  panel: 'comparePage_building_panel',
  block: 'comparePage_building_block',
  wood: 'comparePage_building_wood',
  frame: 'comparePage_building_frame',
  aerated_concrete: 'comparePage_building_aerated_concrete',
  foam_concrete: 'comparePage_building_foam_concrete',
  other: 'comparePage_building_other',
}

function formatBuildingMaterial(p, t) {
  const code = p.building_type || p.buildingType
  if (!code) return t('comparePage_dash')
  const s = String(code)
  const key = BUILDING_TYPE_KEYS[s]
  return key ? t(key) : s
}

/** Полный снимок для запроса к ИИ */
function serializePropertyForAi(p, t) {
  return {
    id: p.id,
    name: (p.name || p.title || '').slice(0, 200),
    location: (p.location || '').slice(0, 300),
    address: p.address ? String(p.address).slice(0, 300) : null,
    city: p.city || null,
    region: p.region || null,
    country: p.country || null,
    price: p.price,
    current_bid: p.currentBid,
    auction_starting_price: p.auction_starting_price ?? p.auctionStartingPrice ?? null,
    area_m2: p.sqft ?? p.area ?? null,
    living_area_m2: p.living_area ?? p.livingArea ?? null,
    land_area_m2: p.land_area ?? p.landArea ?? null,
    rooms: p.beds ?? p.rooms ?? p.bedrooms ?? null,
    bathrooms: p.baths ?? p.bathrooms ?? null,
    floor: p.floor ?? null,
    total_floors: p.total_floors ?? p.totalFloors ?? null,
    floors_in_house: p.floors ?? null,
    year_built: yearBuiltNum(p),
    building_type_code: p.building_type || p.buildingType || null,
    building_type_label: formatBuildingMaterial(p, t) !== t('comparePage_dash') ? formatBuildingMaterial(p, t) : null,
    comfort_flags_score: comfortScore(p),
    description: String(p.description || '').slice(0, 2000),
    source_table: p.source_table || null,
    tag: p.tag || null,
    coordinates:
      p.latitude != null && p.longitude != null
        ? { lat: p.latitude, lng: p.longitude }
        : null,
  }
}

function buildRows(left, right, t) {
  const dash = t('comparePage_dash')
  const pL = resolvePositivePropertyPrice(left)
  const pR = resolvePositivePropertyPrice(right)
  const isAuc = shouldRenderAuctionRows(left, right)
  const startL = auctionStartingPrice(left)
  const startR = auctionStartingPrice(right)

  const rows = []

  rows.push({
    id: 'price',
    label: isAuc ? t('comparePage_rowPriceAuction') : t('comparePage_rowPrice'),
    left: pL != null ? formatPrice(pL, left?.currency, dash) : dash,
    right: pR != null ? formatPrice(pR, right?.currency, dash) : dash,
    winner: compareMetric(pL, pR, 'lower'),
    decisionSignal: true,
  })

  if (isAuc && (startL != null || startR != null)) {
    rows.push({
      id: 'auction_start',
      label: t('comparePage_rowAuctionStart'),
      left: startL != null ? formatPrice(startL, left?.currency, dash) : dash,
      right: startR != null ? formatPrice(startR, right?.currency, dash) : dash,
      winner: compareMetric(startL, startR, 'lower'),
      decisionSignal: true,
    })
  }

  const aL = areaM2(left)
  const aR = areaM2(right)
  let ppmL = null
  let ppmR = null
  if (pL != null && aL != null && aL > 0) ppmL = pL / aL
  if (pR != null && aR != null && aR > 0) ppmR = pR / aR
  rows.push({
    id: 'ppm',
    label: t('comparePage_rowPpm'),
    left: ppmL != null ? formatPrice(ppmL, left?.currency, dash) : dash,
    right: ppmR != null ? formatPrice(ppmR, right?.currency, dash) : dash,
    winner: compareMetric(ppmL, ppmR, 'lower'),
    decisionSignal: true,
  })

  rows.push({
    id: 'area',
    label: t('comparePage_rowArea'),
    left: aL != null ? t('comparePage_areaM2', { area: aL }) : dash,
    right: aR != null ? t('comparePage_areaM2', { area: aR }) : dash,
    winner: compareMetric(aL, aR, 'higher'),
  })

  const livL = livingAreaM2(left)
  const livR = livingAreaM2(right)
  if (livL != null || livR != null) {
    rows.push({
      id: 'living_area',
      label: t('comparePage_rowLivingArea'),
      left: livL != null ? t('comparePage_areaM2', { area: livL }) : dash,
      right: livR != null ? t('comparePage_areaM2', { area: livR }) : dash,
      winner: compareMetric(livL, livR, 'higher'),
    })
  }

  const landL = landAreaM2(left)
  const landR = landAreaM2(right)
  const bothHouse = isHouseLike(left) && isHouseLike(right)
  if (bothHouse && (landL != null || landR != null)) {
    rows.push({
      id: 'land_area',
      label: t('comparePage_rowLandArea'),
      left: landL != null ? t('comparePage_areaM2', { area: landL }) : dash,
      right: landR != null ? t('comparePage_areaM2', { area: landR }) : dash,
      winner: compareMetric(landL, landR, 'higher'),
    })
  }

  const bL = Number(left.beds || left.rooms || left.bedrooms || 0) || null
  const bR = Number(right.beds || right.rooms || right.bedrooms || 0) || null
  rows.push({
    id: 'beds',
    label: bothHouse ? t('comparePage_rowBedsHouse') : t('comparePage_rowBeds'),
    left: bL != null && bL > 0 ? String(bL) : dash,
    right: bR != null && bR > 0 ? String(bR) : dash,
    winner: compareMetric(bL, bR, 'higher'),
  })

  const btL = Number(left.baths || left.bathrooms || 0) || null
  const btR = Number(right.baths || right.bathrooms || 0) || null
  rows.push({
    id: 'baths',
    label: t('comparePage_rowBaths'),
    left: btL != null && btL > 0 ? String(btL) : dash,
    right: btR != null && btR > 0 ? String(btR) : dash,
    winner: compareMetric(btL, btR, 'higher'),
  })

  const yL = yearBuiltNum(left)
  const yR = yearBuiltNum(right)
  rows.push({
    id: 'year',
    label: t('comparePage_rowYear'),
    left: yL != null ? String(yL) : dash,
    right: yR != null ? String(yR) : dash,
    winner: compareMetric(yL, yR, 'higher'),
  })

  if (bothHouse) {
    const hfL = houseFloorsCount(left)
    const hfR = houseFloorsCount(right)
    if (hfL != null || hfR != null) {
      rows.push({
        id: 'house_floors',
        label: t('comparePage_rowHouseFloors'),
        left: hfL != null ? String(hfL) : dash,
        right: hfR != null ? String(hfR) : dash,
        winner: compareMetric(hfL, hfR, 'higher'),
      })
    }
  }

  const bothApt = isApartmentLike(left) && isApartmentLike(right)
  if (bothApt) {
    rows.push({
      id: 'floor',
      label: t('comparePage_rowFloor'),
      left: formatFloorInBuilding(left, t),
      right: formatFloorInBuilding(right, t),
      winner: null,
      displayOnly: true,
    })
  }

  const cL = comfortScore(left)
  const cR = comfortScore(right)
  const comfortKnownL = hasComfortData(left)
  const comfortKnownR = hasComfortData(right)
  const comfortMax = bothHouse ? 8 : 7
  rows.push({
    id: 'comfort',
    label: t('comparePage_rowComfort'),
    left: comfortKnownL ? `${cL} / ${comfortMax}` : t('comparePage_noData'),
    right: comfortKnownR ? `${cR} / ${comfortMax}` : t('comparePage_noData'),
    winner: comfortKnownL && comfortKnownR ? compareMetric(cL, cR, 'higher') : null,
  })

  rows.push({
    id: 'material',
    label: t('comparePage_rowMaterial'),
    left: formatBuildingMaterial(left, t),
    right: formatBuildingMaterial(right, t),
    winner: null,
    displayOnly: true,
  })

  return rows
}


function ComparePickListingGrid({
  items,
  selectedKeys,
  groupFilter,
  onToggleSelect,
  isFavorite,
  onToggleFavorite,
}) {
  const { withTimer, withoutTimer, splitByTimer } = useMemo(() => {
    const timerList = []
    const noTimerList = []
    for (const item of items) {
      if (hasPropertyListingTimer(item.property)) {
        timerList.push(item)
      } else {
        noTimerList.push(item)
      }
    }
    return {
      withTimer: timerList,
      withoutTimer: noTimerList,
      splitByTimer: timerList.length > 0 && noTimerList.length > 0,
    }
  }, [items])

  const gridClassName =
    'compare-pick-grid compare-pick-grid--listing properties-grid properties-grid--auction-cards auction-mobile-stack--desktop-cards'

  const renderItem = (item) => {
    const g = getComparisonGroupKey(item.property, item.mockCategory)
    const selected = selectedKeys.includes(item.key)
    const pos = selectedKeys.indexOf(item.key)
    const disabled =
      selectedKeys.length === 1 && groupFilter != null && g !== groupFilter && !selected

    return (
      <li
        key={item.key}
        className={[
          'compare-pick-grid-item',
          selected && 'compare-pick-grid-item--selected',
          disabled && 'compare-pick-grid-item--disabled',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {selected ? (
          <span className="compare-pick-badge compare-pick-badge--listing">
            {pos === 0 ? '1' : '2'}
          </span>
        ) : null}
        <FavoritePropertyCard
          item={item}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onOpen={() => {
            if (!disabled) onToggleSelect(item)
          }}
          onOpenShare={() => {
            if (!disabled) onToggleSelect(item)
          }}
          formatPrice={formatPrice}
        />
      </li>
    )
  }

  const grids = splitByTimer ? (
    <div className="compare-pick-sections">
      <ul className={gridClassName}>{withTimer.map(renderItem)}</ul>
      <div className="compare-pick-divider" role="separator" aria-hidden="true" />
      <ul className={gridClassName}>{withoutTimer.map(renderItem)}</ul>
    </div>
  ) : (
    <ul className={gridClassName}>{items.map(renderItem)}</ul>
  )

  return (
    <div className="discover-auction-cards hr-showcases hr-showcases--auction-listing">
      {grids}
    </div>
  )
}

const Compare = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useMobileLayout(767)
  const { favoritesLoading, isFavorite, toggleFavorite } = usePropertyFavorites()
  const { favoriteAuctions, catalogLoading } = useFavoriteAuctionItems()

  const listLoading = catalogLoading || favoritesLoading
  const handleToggleFavorite = (property, mockCategory) => {
    const category = hasDbBackedProperty(property) ? undefined : (mockCategory || 'property')
    return toggleFavorite(property, category)
  }
  const [selectedKeys, setSelectedKeys] = useState(() => [])
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const aiRequestGuardRef = useRef(null)
  if (aiRequestGuardRef.current == null) {
    aiRequestGuardRef.current = createCompareAiRequestGuard()
  }

  const firstKey = selectedKeys[0] ?? null
  const firstItem = useMemo(
    () => (firstKey ? favoriteAuctions.find((x) => x.key === firstKey) : null),
    [favoriteAuctions, firstKey]
  )
  const groupFilter = firstItem
    ? getComparisonGroupKey(firstItem.property, firstItem.mockCategory)
    : null

  const toggleSelect = useCallback(
    (item) => {
      const g = getComparisonGroupKey(item.property, item.mockCategory)
      if (selectedKeys.includes(item.key)) {
        setSelectedKeys((prev) => prev.filter((k) => k !== item.key))
        return
      }
      if (selectedKeys.length === 0) {
        setSelectedKeys([item.key])
        return
      }
      if (selectedKeys.length === 1) {
        if (g !== groupFilter) {
          showNotification(t('comparePage_sameTypeOnly'))
          return
        }
        if (item.key === selectedKeys[0]) return
        setSelectedKeys([selectedKeys[0], item.key])
        return
      }
      setSelectedKeys([item.key])
    },
    [selectedKeys, groupFilter, t]
  )

  const clearSelection = () => setSelectedKeys([])

  const replaceSelectedSide = useCallback((side) => {
    setSelectedKeys((previous) => {
      if (previous.length !== 2) return previous
      return side === 'left' ? [previous[1]] : [previous[0]]
    })
  }, [])

  const pair = useMemo(() => {
    if (selectedKeys.length !== 2) return null
    const a = favoriteAuctions.find((x) => x.key === selectedKeys[0])
    const b = favoriteAuctions.find((x) => x.key === selectedKeys[1])
    if (!a || !b) return null
    return { left: a, right: b }
  }, [favoriteAuctions, selectedKeys])

  const tableRows = useMemo(() => {
    if (!pair) return []
    return buildRows(pair.left.property, pair.right.property, t)
  }, [pair, t, i18n.language])

  const requestAiAnalysis = useCallback(async () => {
    if (!pair || aiLoading) return

    const { requestId, signal } = aiRequestGuardRef.current.start()
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await askPropertyCompareAssistant(
        serializePropertyForAi(pair.left.property, t),
        serializePropertyForAi(pair.right.property, t),
        { signal },
      )
      if (aiRequestGuardRef.current.isCurrent(requestId)) setAiResult(result)
    } catch (error) {
      if (aiRequestGuardRef.current.isCurrent(requestId) && error?.name !== 'AbortError') {
        setAiError(error?.message || t('comparePage_aiErrorFallback'))
      }
    } finally {
      if (aiRequestGuardRef.current.isCurrent(requestId)) setAiLoading(false)
    }
  }, [aiLoading, pair, t])

  useEffect(() => {
    aiRequestGuardRef.current.cancel()
    setAiResult(null)
    setAiError(null)
    setAiLoading(false)
  }, [pair?.left?.key, pair?.right?.key])

  useEffect(() => {
    return () => {
      aiRequestGuardRef.current.cancel()
    }
  }, [])

  return (
    <div className="compare-page">
      <Header />
      <div className="compare-container">
        <div className="compare-header">
          <div className="compare-header__visual" aria-hidden>
            <img
              src={COMPARE_HEADER_ILLUSTRATION}
              alt=""
              className="compare-header__image"
              loading="lazy"
            />
          </div>
          <div className="compare-header__copy">
            <h1 className="compare-title">{t('comparePage_title')}</h1>
            <p className="compare-subtitle">
              {t('comparePage_subtitle')}
            </p>
            <div className="compare-header-actions">
              <Link to="/favorites" className="compare-link-muted">
                {t('comparePage_backToFavorites')}
              </Link>
            </div>
          </div>
        </div>

        {listLoading ? (
          <section className="compare-pick-section" aria-busy="true">
            <div className="compare-pick-toolbar">
              <h2 className="compare-pick-heading">{t('comparePage_fromFavorites')}</h2>
            </div>
            <div className="compare-hint compare-hint--skeleton" aria-hidden="true">
              <span className="compare-skel-line compare-skel-line--hint" />
            </div>
            <div className="discover-auction-cards hr-showcases hr-showcases--auction-listing">
              <ul className="compare-pick-grid compare-pick-grid--skeleton properties-grid properties-grid--auction-cards auction-mobile-stack--desktop-cards">
                {Array.from({ length: COMPARE_PICK_SKELETON_COUNT }, (_, i) => (
                  <ComparePickCardSkeleton key={`compare-pick-skel-${i}`} />
                ))}
              </ul>
            </div>
          </section>
        ) : favoriteAuctions.length === 0 ? (
          <section className="compare-empty" aria-labelledby="compare-empty-title">
            <div className="compare-empty__visual" aria-hidden>
              <img
                src="/images/compare/house-magnifier.png"
                alt=""
                className="compare-empty__image"
                loading="lazy"
              />
            </div>
            <div className="compare-empty__copy">
              <h2 id="compare-empty-title" className="compare-empty-title">
                {t('comparePage_emptyTitle')}
              </h2>
              <p className="compare-empty-text">
                {t('comparePage_emptyText')}
              </p>
              <button type="button" className="compare-empty-button" onClick={() => navigate('/auction')}>
                {t('comparePage_goToAuctions')}
                <FiArrowRight size={16} aria-hidden />
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="compare-pick-section" aria-labelledby="compare-pick-heading">
              <div className="compare-pick-toolbar">
                <h2 id="compare-pick-heading" className="compare-pick-heading">
                  {t('comparePage_fromFavorites')}
                </h2>
                {groupFilter && (
                  <span className="compare-type-pill">{t('comparePage_typePill', { type: formatTypeLabel(groupFilter, t) })}</span>
                )}
                {selectedKeys.length > 0 && (
                  <button type="button" className="compare-clear-btn" onClick={clearSelection}>
                    {t('comparePage_clearSelection')}
                  </button>
                )}
              </div>
              <p className="compare-hint">
                {selectedKeys.length === 0 && t('comparePage_hint0')}
                {selectedKeys.length === 1 && t('comparePage_hint1')}
                {selectedKeys.length === 2 && t('comparePage_hint2')}
              </p>
              {isMobile && pair ? (
                <div className="compare-pick-locked">
                  <span>{t('comparePage_pairLocked')}</span>
                  <button type="button" onClick={clearSelection}>{t('comparePage_pickOtherPair')}</button>
                </div>
              ) : (
                <ComparePickListingGrid
                  items={favoriteAuctions}
                  selectedKeys={selectedKeys}
                  groupFilter={groupFilter}
                  onToggleSelect={toggleSelect}
                  isFavorite={isFavorite}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
            </section>

            {pair && (
              <CompareInvestorResults
                pair={pair}
                rows={tableRows}
                onReplace={replaceSelectedSide}
                aiResult={aiResult}
                aiLoading={aiLoading}
                aiError={aiError}
                onRunAi={requestAiAnalysis}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Compare
