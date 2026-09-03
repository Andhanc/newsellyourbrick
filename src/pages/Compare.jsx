import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CompareInvestorProDrawer from '../components/CompareInvestorProDrawer'
import { useSubscriptionCalculatorAccess } from '../hooks/useSubscriptionCalculatorAccess'
import axios from 'axios'
import Header from '../components/Header'
import { mapListingToCalculatorData, pickCityForAuctionCalculator } from '../utils/propertyCalculatorMapping'
import { FiArrowRight, FiBarChart2, FiCheckCircle, FiRefreshCw, FiLoader } from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'
import PropertyListingCard from '../components/PropertyListingCard'
import CompareMobileMetrics from '../components/compare/CompareMobileMetrics'
import CompareMobileMarketEstimate from '../components/compare/CompareMobileMarketEstimate'
import CompareMobilePicker from '../components/compare/CompareMobilePicker'
import CompareDecisionSummary from '../components/compare/CompareDecisionSummary'
import { CompareShowdown } from '../components/compare/CompareShowdown'
import { useFavoriteAuctionItems } from '../hooks/useFavoriteAuctionItems'
import useMobileLayout from '../hooks/useMobileLayout'
import { filterComparePickerItems, getComparisonGroupKey } from '../utils/propertyFavoriteKey'
import { showNotification } from '../utils/toastHelper'
import { askPropertyCompareAssistant } from '../services/aiService'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { hasPropertyListingTimer } from '../utils/auctionReminderBounds'
import './Compare.css'
import '../components/PropertyListingGrid.css'
import { formatPropertyPrice } from '../utils/currency'
import { writeInvestorScenario } from '../utils/investorScenarioContext'
import {
  clearCompareSnapshot,
  readCompareSnapshot,
  writeCompareSnapshot,
} from '../utils/compareSnapshot'
import { getStoredNumericUserId } from '../services/authService'
import { scrollMainElementIntoView } from '../utils/mainScroll'
import {
  isAuctionListing,
  resolvePositivePropertyPrice,
  selectComparisonItem,
  summarizeComparisonRows,
} from '../utils/compareDecision'
import { createCompareAiRequestGuard } from '../utils/compareAiRequestGuard'

const COMPARE_PICK_SKELETON_COUNT = 4
const COMPARE_HERO_DOSSIERS = '/images/compare/compare-hero-dossiers-v2.webp'

/** Плейсхолдер карточки выбора, пока каталог и избранное подгружаются */
function ComparePickCardSkeleton() {
  return (
    <li>
      <div className="compare-pick-card compare-pick-card--skeleton" aria-hidden="true">
        <div className="compare-pick-card-image">
          <div className="compare-skel-shimmer compare-skel-shimmer--media" />
        </div>
        <div className="compare-pick-card-body">
          <span className="compare-skel-line compare-skel-line--type" />
          <span className="compare-skel-line compare-skel-line--title" />
          <span className="compare-skel-line compare-skel-line--title-narrow" />
          <span className="compare-skel-line compare-skel-line--loc" />
          <div className="compare-pick-meta compare-pick-meta--skeleton">
            <span className="compare-skel-pill" />
            <span className="compare-skel-pill" />
            <span className="compare-skel-pill compare-skel-pill--grow" />
          </div>
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
  if (groupKey.startsWith('sale:')) {
    const sub = groupKey.slice(5)
    const m = {
      standard: t('comparePage_saleStandard'),
      auction: t('comparePage_saleStandard'),
      buy_now: t('comparePage_saleStandard'),
      debt: t('comparePage_saleDebt'),
      shares: t('comparePage_saleShares'),
    }
    return m[sub] || sub
  }
  if (groupKey.startsWith('type:')) {
    const sub = groupKey.slice(5)
    const m = {
      apartment: t('comparePage_typeApartment'),
      villa: t('comparePage_typeVilla'),
      house: t('comparePage_typeHouse'),
      townhouse: t('comparePage_typeTownhouse'),
      commercial: t('comparePage_typeCommercial'),
      land: t('comparePage_typeLand'),
      object: t('comparePage_typeObject'),
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

function scoreAiInfrastructure(rows) {
  let left = 0
  let right = 0
  let tie = 0
  for (const r of rows) {
    if (r.winner === 'left') left += 1
    else if (r.winner === 'right') right += 1
    else if (r.winner === 'tie') tie += 1
  }
  return { left, right, tie }
}

function buildAiScoreView(scores) {
  if (!scores) return null
  const decided = scores.left + scores.right
  return {
    ...scores,
    total: decided + scores.tie,
    leftPct: decided > 0 ? Math.round((scores.left / decided) * 100) : 0,
    rightPct: decided > 0 ? Math.round((scores.right / decided) * 100) : 0,
  }
}

/** Данные карточки аукциона → формат `initialPropertyData` калькулятора */
function mapAuctionCardToCalculatorSource(property) {
  const pt = String(property.property_type || property.propertyType || '').toLowerCase()
  let propertyType = 'apartment'
  if (pt === 'house') propertyType = 'house'
  else if (pt === 'villa') propertyType = 'villa'
  else if (pt === 'commercial') propertyType = 'commercial'
  else if (pt === 'land') propertyType = 'land'

  const areaRaw = property.sqft ?? property.area
  const area = areaRaw != null && areaRaw !== '' ? String(areaRaw) : ''

  const rooms = property.beds ?? property.rooms ?? property.bedrooms
  const city = pickCityForAuctionCalculator(property)

  return {
    propertyType,
    area,
    rooms,
    bedrooms: property.bedrooms,
    city,
    country: property.country ?? null,
    address: property.address != null ? String(property.address) : '',
    location: property.location != null ? String(property.location) : '',
  }
}

async function estimateMarketPrice(initialSource, t) {
  const mapped = mapListingToCalculatorData(initialSource)
  const areaNum = parseInt(mapped.area, 10)
  if (!mapped.area || !Number.isFinite(areaNum) || areaNum < 1) {
    throw new Error(t('comparePage_errNeedArea'))
  }
  if (!String(mapped.city || '').trim()) {
    throw new Error(t('comparePage_errNeedCity'))
  }

  let district = mapped.district || 'all'
  const streetForDetect =
    mapped.street ||
    sanitizeCalcAddress(initialSource.address) ||
    sanitizeCalcAddress(initialSource.location) ||
    ''

  if (streetForDetect) {
    try {
      const d = await axios.post('/api/properties/detect-district', {
        address: streetForDetect,
        city: mapped.city,
        country: initialSource.country ?? null,
      })
      if (d.data?.success && d.data?.data?.district) {
        district = d.data.data.district
      }
    } catch (_) {
      /* ок — считаем с «Весь город» */
    }
  }

  const skipRooms = mapped.propertyType === 'land' || mapped.propertyType === 'commercial'
  const roomsPayload =
    skipRooms ? null : mapped.rooms === 'studio' ? 'studio' : parseInt(mapped.rooms, 10)

  const response = await axios.post(
    '/api/properties/calculate-price',
    {
      area: areaNum,
      rooms: roomsPayload,
      city: mapped.city,
      country: initialSource.country ?? null,
      street: streetForDetect || null,
      district: district || 'all',
      propertyType: mapped.propertyType,
      maxPrice: null,
      minPrice: null,
    },
    { timeout: 480000 }
  )

  if (!response.data?.success) {
    throw new Error(response.data?.error || t('comparePage_errCalc'))
  }
  return response.data.data
}

function sanitizeCalcAddress(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (/cerca de mi ubicaci[oó]n actual/i.test(text)) return ''
  if (/near my current location/i.test(text)) return ''
  return text
}

function formatCalcEur(price, dash = '—') {
  if (price == null || price === '') return dash
  const n = Number(price)
  if (!Number.isFinite(n)) return dash
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
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

function ComparePickListingGrid({ items, selectedKeys, groupFilter, onToggleSelect }) {
  const { withTimer, withoutTimer, splitByTimer } = useMemo(() => {
    const timerList = []
    const noTimerList = []
    for (const item of items) {
      if (hasPropertyListingTimer(formatPropertyForListingCard(item.property))) {
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
    'compare-pick-grid compare-pick-grid--listing properties-grid property-listing-grid'

  const renderItem = (item) => {
    const g = getComparisonGroupKey(item.property, item.mockCategory)
    const selected = selectedKeys.includes(item.key)
    const pos = selectedKeys.indexOf(item.key)
    const disabled =
      selectedKeys.length === 1 && groupFilter != null && g !== groupFilter && !selected
    const property = formatPropertyForListingCard(item.property)

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
        <PropertyListingCard
          property={property}
          onOpen={() => {
            if (!disabled) onToggleSelect(item)
          }}
          showActions={false}
          showFavorite={false}
          pinFooter
          favoriteMockCategory={item.mockCategory}
          className={[
            selected && 'property-card--compare-selected',
            disabled && 'property-card--compare-disabled',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </li>
    )
  }

  if (splitByTimer) {
    return (
      <div className="property-listing-grid-sections">
        <ul className={gridClassName}>{withTimer.map(renderItem)}</ul>
        <div className="property-listing-grid-divider" role="separator" aria-hidden="true" />
        <ul className={gridClassName}>{withoutTimer.map(renderItem)}</ul>
      </div>
    )
  }

  return <ul className={gridClassName}>{items.map(renderItem)}</ul>
}

const Compare = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useMobileLayout(767)
  const { favoritesLoading } = usePropertyFavorites()
  const { favoriteAuctions, catalogLoading } = useFavoriteAuctionItems()
  const { resolved: subscriptionResolved, allowed: hasCalculatorAccess } =
    useSubscriptionCalculatorAccess()

  const listLoading = catalogLoading || favoritesLoading
  const compareUserId = getStoredNumericUserId()
  const snapshotRef = useRef(undefined)
  if (snapshotRef.current === undefined) {
    snapshotRef.current = readCompareSnapshot({ userId: compareUserId })
  }
  const skipShowdownForPairRef = useRef(
    snapshotRef.current?.showdownCompleted ? snapshotRef.current.pairKey : null,
  )
  const [compareInvestorDrawerOpen, setCompareInvestorDrawerOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState(() => (
    Array.isArray(snapshotRef.current?.selectedKeys) ? snapshotRef.current.selectedKeys : []
  ))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [aiResult, setAiResult] = useState(() => snapshotRef.current?.aiResult ?? null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(() => snapshotRef.current?.aiError ?? null)
  const aiRequestGuardRef = useRef(null)
  if (aiRequestGuardRef.current == null) {
    aiRequestGuardRef.current = createCompareAiRequestGuard()
  }
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcData, setCalcData] = useState(() => (
    snapshotRef.current?.calcData ?? { left: null, right: null }
  ))
  const [calcError, setCalcError] = useState(() => (
    snapshotRef.current?.calcError ?? { left: null, right: null }
  ))
  const compareCalculatorStartedKeyRef = useRef(
    snapshotRef.current?.calcData?.left
      || snapshotRef.current?.calcData?.right
      || snapshotRef.current?.calcError?.left
      || snapshotRef.current?.calcError?.right
      ? snapshotRef.current.pairKey
      : null,
  )
  const heroRef = useRef(null)
  const [heroVisible, setHeroVisible] = useState(true)
  const [showdownStage, setShowdownStage] = useState(() => (
    snapshotRef.current?.showdownCompleted ? 'complete' : 'idle'
  ))
  const [showdownMinDone, setShowdownMinDone] = useState(false)
  const [showdownForceDone, setShowdownForceDone] = useState(false)
  const [showdownAnalysisStartedKey, setShowdownAnalysisStartedKey] = useState(() => (
    snapshotRef.current?.aiResult || snapshotRef.current?.aiError
      ? snapshotRef.current.pairKey
      : null
  ))
  const [showdownCompletedKey, setShowdownCompletedKey] = useState(() => (
    snapshotRef.current?.showdownCompleted ? snapshotRef.current.pairKey : null
  ))

  const firstKey = selectedKeys[0] ?? null
  const firstItem = useMemo(
    () => (firstKey ? favoriteAuctions.find((x) => x.key === firstKey) : null),
    [favoriteAuctions, firstKey]
  )
  const groupFilter = firstItem
    ? getComparisonGroupKey(firstItem.property, firstItem.mockCategory)
    : null
  const pickerItems = useMemo(
    () => filterComparePickerItems(favoriteAuctions, selectedKeys, groupFilter),
    [favoriteAuctions, selectedKeys, groupFilter],
  )

  const discardCompareSnapshot = useCallback(() => {
    snapshotRef.current = null
    skipShowdownForPairRef.current = null
    compareCalculatorStartedKeyRef.current = null
    clearCompareSnapshot({ userId: compareUserId })
  }, [compareUserId])

  const toggleSelect = useCallback(
    (item) => {
      const g = getComparisonGroupKey(item.property, item.mockCategory)
      if (selectedKeys.includes(item.key)) {
        discardCompareSnapshot()
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
        setPickerOpen(false)
        return
      }
      discardCompareSnapshot()
      setSelectedKeys([item.key])
    },
    [discardCompareSnapshot, selectedKeys, groupFilter, t]
  )

  const clearSelection = () => {
    discardCompareSnapshot()
    setSelectedKeys([])
    setPickerOpen(false)
    window.requestAnimationFrame(() => {
      if (heroRef.current) scrollMainElementIntoView(heroRef.current, { offset: 0, behavior: 'smooth' })
    })
  }

  const replaceSelectedSide = useCallback((side) => {
    discardCompareSnapshot()
    setSelectedKeys((previous) => {
      if (previous.length !== 2) return previous
      return side === 'left' ? [previous[1]] : [previous[0]]
    })
    if (isMobile) setPickerOpen(true)
  }, [discardCompareSnapshot, isMobile])

  const pair = useMemo(() => {
    if (selectedKeys.length !== 2) return null
    const a = favoriteAuctions.find((x) => x.key === selectedKeys[0])
    const b = favoriteAuctions.find((x) => x.key === selectedKeys[1])
    if (!a || !b) return null
    return { left: a, right: b }
  }, [favoriteAuctions, selectedKeys])

  const pairKey = pair ? `${pair.left.key}::${pair.right.key}` : null

  useEffect(() => {
    if (listLoading || selectedKeys.length !== 2) return
    const missing = selectedKeys.some((key) => !favoriteAuctions.some((item) => item.key === key))
    if (!missing) return
    discardCompareSnapshot()
    setSelectedKeys([])
  }, [discardCompareSnapshot, favoriteAuctions, listLoading, selectedKeys])

  useEffect(() => {
    if (selectedKeys.length !== 2 || !pairKey) return
    writeCompareSnapshot({
      selectedKeys,
      pairKey,
      aiResult,
      aiError,
      calcData,
      calcError,
      showdownCompleted: showdownCompletedKey === pairKey,
    }, { userId: compareUserId })
  }, [
    aiError,
    aiResult,
    calcData,
    calcError,
    compareUserId,
    pairKey,
    selectedKeys,
    showdownCompletedKey,
  ])

  const openInvestorPanel = useCallback((side) => {
    const selected = selectComparisonItem(pair, side)
    if (!selected) return
    const scenario = writeInvestorScenario({
      source: 'compare',
      propertyKeys: [pair.left.key, pair.right.key],
      selectedKey: selected.key,
    })
    navigate('/calculator', {
      state: {
        calculatorFromProperty: selected.property,
        calculatorSelectedKey: selected.key,
        calculatorStrategy: 'rent',
        calculatorScenarioCreatedAt: scenario?.createdAt ?? null,
      },
    })
  }, [navigate, pair])

  const tableRows = useMemo(() => {
    if (!pair) return []
    return buildRows(pair.left.property, pair.right.property, t)
  }, [pair, t, i18n.language])

  const decisionSummary = useMemo(() => summarizeComparisonRows(tableRows), [tableRows])

  const aiScores = useMemo(
    () => (aiResult?.rows?.length ? scoreAiInfrastructure(aiResult.rows) : null),
    [aiResult]
  )
  const aiScoreView = useMemo(() => buildAiScoreView(aiScores), [aiScores])

  const requestAiAnalysis = useCallback(async (options = {}) => {
    if (!pair || aiLoading) return
    if (!subscriptionResolved) return
    if (!hasCalculatorAccess) {
      if (options?.openEntitlement !== false) setCompareInvestorDrawerOpen(true)
      return
    }

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
  }, [aiLoading, hasCalculatorAccess, pair, subscriptionResolved, t])

  useEffect(() => {
    const nextPairKey = pair?.left?.key && pair?.right?.key
      ? `${pair.left.key}::${pair.right.key}`
      : null
    const snap = snapshotRef.current
    if (!nextPairKey) {
      if (snap?.selectedKeys?.length === 2) return
    }
    if (nextPairKey && snap?.pairKey === nextPairKey) {
      setAiResult(snap.aiResult ?? null)
      setAiError(snap.aiError ?? null)
      setAiLoading(false)
      setCalcData(snap.calcData ?? { left: null, right: null })
      setCalcError(snap.calcError ?? { left: null, right: null })
      setCalcLoading(false)
      if (snap.aiResult || snap.aiError) setShowdownAnalysisStartedKey(nextPairKey)
      if (snap.calcData?.left || snap.calcData?.right || snap.calcError?.left || snap.calcError?.right) {
        compareCalculatorStartedKeyRef.current = nextPairKey
      }
      return
    }
    if (snap && nextPairKey && snap.pairKey !== nextPairKey) {
      snapshotRef.current = null
      skipShowdownForPairRef.current = null
    }
    aiRequestGuardRef.current.cancel()
    setAiResult(null)
    setAiError(null)
    setAiLoading(false)
    setCompareInvestorDrawerOpen(false)
    setCalcData({ left: null, right: null })
    setCalcError({ left: null, right: null })
    setCalcLoading(false)
  }, [pair?.left?.key, pair?.right?.key])

  useEffect(() => {
    return () => aiRequestGuardRef.current.cancel()
  }, [])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.3)),
      {
        root: document.querySelector('.app-layout'),
        threshold: [0, 0.3, 0.65],
      },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  const canRunCompareCalculator = useMemo(() => {
    if (!pair) return false
    for (const side of ['left', 'right']) {
      const p = pair[side].property
      const a = Number(p.sqft ?? p.area ?? 0)
      const cityGuess = pickCityForAuctionCalculator(p)
      if (!Number.isFinite(a) || a < 1 || !String(cityGuess || '').trim()) return false
    }
    return true
  }, [pair])

  const showInvestorPanelCta = useMemo(() => {
    if (calcLoading) return false
    return Boolean(calcData.left || calcData.right || calcError.left || calcError.right)
  }, [calcData.left, calcData.right, calcError.left, calcError.right, calcLoading])

  const runCompareCalculator = useCallback(async () => {
    if (!pair) return
    setCalcLoading(true)
    setCalcData({ left: null, right: null })
    setCalcError({ left: null, right: null })

    const leftSrc = mapAuctionCardToCalculatorSource(pair.left.property)
    const rightSrc = mapAuctionCardToCalculatorSource(pair.right.property)

    const nextErr = { left: null, right: null }

    try {
      // По очереди: два параллельных calculate-price грузят два Puppeteer — сервер часто падает (502 / ECONNRESET).
      try {
        const leftVal = await estimateMarketPrice(leftSrc, t)
        setCalcData((prev) => ({ ...prev, left: leftVal }))
      } catch (e) {
        nextErr.left = e?.message || t('comparePage_errCalcLeft')
        setCalcError((prev) => ({ ...prev, left: nextErr.left }))
      }

      try {
        const rightVal = await estimateMarketPrice(rightSrc, t)
        setCalcData((prev) => ({ ...prev, right: rightVal }))
      } catch (e) {
        nextErr.right = e?.message || t('comparePage_errCalcRight')
        setCalcError((prev) => ({ ...prev, right: nextErr.right }))
      }

      if (nextErr.left && nextErr.right) {
        showNotification(nextErr.left, 'error')
      } else if (nextErr.left || nextErr.right) {
        showNotification(t('comparePage_errCalcPartial'), 'warning')
      }
    } finally {
      setCalcLoading(false)
    }
  }, [pair, t])

  useEffect(() => {
    if (!pairKey) {
      compareCalculatorStartedKeyRef.current = null
      return
    }
    if (!canRunCompareCalculator || compareCalculatorStartedKeyRef.current === pairKey) return
    compareCalculatorStartedKeyRef.current = pairKey
    void runCompareCalculator()
  }, [canRunCompareCalculator, pairKey, runCompareCalculator])

  const aiReadyForShowdown = Boolean(
    subscriptionResolved && (!hasCalculatorAccess || aiResult || aiError),
  )
  const calcReadyForShowdown = Boolean(
    !canRunCompareCalculator || (
      !calcLoading &&
      (calcData.left || calcError.left) &&
      (calcData.right || calcError.right)
    ),
  )

  useEffect(() => {
    if (!isMobile || !pairKey) {
      if (!pairKey && skipShowdownForPairRef.current) return undefined
      setShowdownStage('idle')
      if (!skipShowdownForPairRef.current) setShowdownCompletedKey(null)
      return undefined
    }

    if (skipShowdownForPairRef.current === pairKey) {
      setShowdownStage('complete')
      setShowdownCompletedKey(pairKey)
      return undefined
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setShowdownStage('playing')
    setShowdownMinDone(false)
    setShowdownForceDone(false)
    setShowdownAnalysisStartedKey(null)
    setShowdownCompletedKey(null)

    const minimumTimer = window.setTimeout(
      () => setShowdownMinDone(true),
      reduceMotion ? 180 : 1900,
    )
    const fallbackTimer = window.setTimeout(
      () => setShowdownForceDone(true),
      reduceMotion ? 360 : 8000,
    )

    return () => {
      window.clearTimeout(minimumTimer)
      window.clearTimeout(fallbackTimer)
    }
  }, [isMobile, pairKey])

  useEffect(() => {
    if (
      showdownStage !== 'playing' ||
      !pair ||
      !pairKey ||
      !subscriptionResolved ||
      showdownAnalysisStartedKey === pairKey
    ) return

    setShowdownAnalysisStartedKey(pairKey)
    if (hasCalculatorAccess) void requestAiAnalysis({ openEntitlement: false })
  }, [
    hasCalculatorAccess,
    pair,
    pairKey,
    requestAiAnalysis,
    showdownAnalysisStartedKey,
    showdownStage,
    subscriptionResolved,
  ])

  useEffect(() => {
    if (showdownStage !== 'playing' || !showdownMinDone || !pairKey) return
    const analysisReady = showdownAnalysisStartedKey === pairKey && aiReadyForShowdown && calcReadyForShowdown
    if (analysisReady || showdownForceDone) setShowdownStage('exiting')
  }, [
    aiReadyForShowdown,
    calcReadyForShowdown,
    pairKey,
    showdownAnalysisStartedKey,
    showdownForceDone,
    showdownMinDone,
    showdownStage,
  ])

  useEffect(() => {
    if (showdownStage !== 'exiting' || !pairKey) return undefined
    const finishTimer = window.setTimeout(() => {
      setShowdownStage('complete')
      setShowdownCompletedKey(pairKey)
      window.requestAnimationFrame(() => {
        const target = document.querySelector('.compare-table-section')
        if (target) scrollMainElementIntoView(target, { offset: 118, behavior: 'smooth' })
      })
    }, 340)
    return () => window.clearTimeout(finishTimer)
  }, [pairKey, showdownStage])

  useEffect(() => {
    const layout = document.querySelector('.app-layout')
    if (!layout) return undefined
    const active = showdownStage === 'playing' || showdownStage === 'exiting'
    layout.classList.toggle('compare-showdown-open', active)
    return () => layout.classList.remove('compare-showdown-open')
  }, [showdownStage])

  const dash = t('comparePage_dash')

  return (
    <div
      className={`compare-page${heroVisible ? ' compare-page--hero-visible' : ''}${showdownStage === 'playing' || showdownStage === 'exiting' ? ' compare-page--showdown-active' : ''}`}
    >
      <Header />
      <CompareShowdown
        pair={pair}
        stage={showdownStage}
      />
      <section ref={heroRef} className="compare-hero" aria-labelledby="compare-hero-title">
        {isMobile ? (
          <CompareMobilePicker
            items={pickerItems}
            selectedKeys={selectedKeys}
            groupFilter={groupFilter}
            open={pickerOpen}
            onOpen={() => setPickerOpen(true)}
            onClose={() => setPickerOpen(false)}
            onBack={() => navigate('/favorites')}
            onToggleSelect={toggleSelect}
            loading={listLoading}
          />
        ) : <div className="compare-hero__panel">
          <div className="compare-hero__copy">
            <div className="compare-hero__brand" aria-label="SellYourBrick">
              <span className="compare-hero__brand-word">Sell</span>
              <span className="compare-hero__brand-word compare-hero__brand-word--accent">Your</span>
              <span className="compare-hero__brand-word">Brick</span>
            </div>
            <h1 id="compare-hero-title" className="compare-hero__title">
              {t('comparePage_heroTitle')}
            </h1>
          </div>

          <div className="compare-hero__visual" aria-hidden="true">
            <img
              src={COMPARE_HERO_DOSSIERS}
              alt=""
              className="compare-hero__image"
              width="900"
              height="1350"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </div>}
      </section>

      <div
        className={`compare-container${listLoading || favoriteAuctions.length > 0 ? ' compare-container--has-card-strip' : ''}${isMobile && !pair ? ' compare-container--mobile-idle' : ''}`}
      >
        {!isMobile && <div className="compare-after-hero-nav">
          <Link to="/favorites" className="compare-link-muted">
            {t('comparePage_backToFavorites')}
          </Link>
        </div>}

        {listLoading ? (
          <section className="compare-pick-section" aria-busy="true">
            <div className="compare-pick-toolbar">
              <h2 className="compare-pick-heading">{t('comparePage_fromFavorites')}</h2>
            </div>
            <div className="compare-hint compare-hint--skeleton" aria-hidden="true">
              <span className="compare-skel-line compare-skel-line--hint" />
            </div>
            <ul className="compare-pick-grid compare-pick-grid--skeleton">
              {Array.from({ length: COMPARE_PICK_SKELETON_COUNT }, (_, i) => (
                <ComparePickCardSkeleton key={`compare-pick-skel-${i}`} />
              ))}
            </ul>
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
            {(!isMobile || !pair) && <section className="compare-pick-section" aria-labelledby="compare-pick-heading">
              <div className="compare-pick-toolbar">
                <h2 id="compare-pick-heading" className="compare-pick-heading">
                  {t('comparePage_fromFavorites')}
                </h2>
                {groupFilter && (
                  <span className="compare-type-pill">{t('comparePage_typePill', { type: formatTypeLabel(groupFilter, t) })}</span>
                )}
                {selectedKeys.length > 0 && (
                  <button type="button" className="compare-clear-btn" onClick={clearSelection}>
                    {t(selectedKeys.length === 2 ? 'comparePage_pickOtherPair' : 'comparePage_clearSelection')}
                  </button>
                )}
              </div>
              <p className="compare-hint">
                {selectedKeys.length === 0 && t('comparePage_hint0')}
                {selectedKeys.length === 1 && (
                  pickerItems.length < 2 ? t('comparePage_hint1Solo') : t('comparePage_hint1')
                )}
                {selectedKeys.length === 2 && t('comparePage_hint2')}
              </p>
              <ComparePickListingGrid
                items={pickerItems}
                selectedKeys={selectedKeys}
                groupFilter={groupFilter}
                onToggleSelect={toggleSelect}
              />
            </section>}

            {pair && (
              <section
                className={`compare-table-section${isMobile && showdownCompletedKey === pairKey ? ' compare-table-section--cinematic-result' : ''}`}
                aria-labelledby="compare-table-heading"
              >
                <h2 id="compare-table-heading" className="compare-table-heading">
                  {t('comparePage_title')}
                </h2>
                {isMobile ? (
                  <>
                    <CompareMobileMetrics
                      left={pair.left}
                      right={pair.right}
                      rows={tableRows}
                      onReplace={replaceSelectedSide}
                      onClear={clearSelection}
                    />
                    <CompareMobileMarketEstimate
                      pair={pair}
                      calcLoading={calcLoading}
                      calcData={calcData}
                      calcError={calcError}
                      dash={dash}
                      formatValue={formatCalcEur}
                    />
                    <CompareDecisionSummary
                      pair={pair}
                      summary={decisionSummary}
                      onOpenCalculator={openInvestorPanel}
                    />
                  </>
                ) : (
                  <div className="compare-table-wrap">
                    <table className="compare-table">
                    <thead>
                      <tr>
                        <th scope="col" className="compare-table-param">
                          {t('comparePage_param')}
                        </th>
                        <th scope="col" className="compare-table-col">
                          <span className="compare-table-col-head">
                            {pair.left.property.name || pair.left.property.title}
                          </span>
                        </th>
                        <th scope="col" className="compare-table-col">
                          <span className="compare-table-col-head">
                            {pair.right.property.name || pair.right.property.title}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <tr key={row.id}>
                          <th scope="row" className="compare-table-param">
                            {row.label}
                          </th>
                          <td
                            className={[
                              'compare-table-cell',
                              !row.displayOnly && row.winner === 'left' && 'compare-table-cell--win',
                              !row.displayOnly && row.winner === 'tie' && 'compare-table-cell--tie',
                              row.displayOnly && 'compare-table-cell--plain',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {row.left}
                            {!row.displayOnly && row.winner === 'left' && (
                              <span className="compare-win-tag">{t('comparePage_better')}</span>
                            )}
                          </td>
                          <td
                            className={[
                              'compare-table-cell',
                              !row.displayOnly && row.winner === 'right' && 'compare-table-cell--win',
                              !row.displayOnly && row.winner === 'tie' && 'compare-table-cell--tie',
                              row.displayOnly && 'compare-table-cell--plain',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {row.right}
                            {!row.displayOnly && row.winner === 'right' && (
                              <span className="compare-win-tag">{t('comparePage_better')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                )}

                {!isMobile && (
                  <CompareDecisionSummary
                    pair={pair}
                    summary={decisionSummary}
                    onOpenCalculator={openInvestorPanel}
                  />
                )}

                {!isMobile && showInvestorPanelCta && (
                  <section className="compare-investor-cta" aria-labelledby="compare-investor-cta-heading">
                    <div className="compare-investor-cta-inner">
                      <div className="compare-investor-cta-copy">
                        <h2 id="compare-investor-cta-heading" className="compare-investor-cta-title">
                          <FiBarChart2 className="compare-investor-cta-title-icon" aria-hidden />
                          {t('comparePage_investorTitle')}
                        </h2>
                        <p className="compare-investor-cta-text">
                          {t('comparePage_investorText')}
                        </p>
                      </div>
                      <div className="compare-investor-cta-actions">
                        <button type="button" className="compare-investor-cta-link" onClick={() => openInvestorPanel('left')}>
                          {t('comparePage_calcObject1')} <FiArrowRight size={18} aria-hidden />
                        </button>
                        <button type="button" className="compare-investor-cta-link" onClick={() => openInvestorPanel('right')}>
                          {t('comparePage_calcObject2')} <FiArrowRight size={18} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                <section className="compare-ai-section" aria-labelledby="compare-ai-heading">
                  <div className="compare-ai-head">
                    <div className="compare-ai-title-wrap">
                      <span className="compare-ai-title-icon" aria-hidden>
                        <HiOutlineSparkles />
                      </span>
                      <h2 id="compare-ai-heading" className="compare-ai-title">
                        {t('comparePage_aiTitle')}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="compare-ai-refresh"
                      onClick={requestAiAnalysis}
                      disabled={aiLoading || !subscriptionResolved}
                      aria-describedby={!subscriptionResolved ? 'compare-ai-entitlement-help' : undefined}
                      title={!subscriptionResolved ? t('comparePage_aiWaitTitle') : undefined}
                    >
                      <FiRefreshCw size={18} className={aiLoading ? 'compare-ai-spin' : ''} aria-hidden />
                      {aiResult ? t('comparePage_aiRefresh') : t('comparePage_aiGet')}
                    </button>
                  </div>
                  <p className="compare-ai-disclaimer">
                    {t('comparePage_aiDisclaimer')}
                  </p>
                  {!subscriptionResolved ? (
                    <p id="compare-ai-entitlement-help" className="compare-ai-entitlement-help" role="status" aria-live="polite">
                      {t('comparePage_aiEntitlementHelp')}
                    </p>
                  ) : null}

                  {!aiLoading && !aiError && !aiResult && (
                    <div className="compare-ai-idle">
                      <strong>{t('comparePage_aiIdleStrong')}</strong>
                      <span>{t('comparePage_aiIdleText')}</span>
                      <button
                        type="button"
                        className="compare-ai-idle-action"
                        onClick={requestAiAnalysis}
                        disabled={!subscriptionResolved}
                        aria-describedby={!subscriptionResolved ? 'compare-ai-entitlement-help' : undefined}
                        title={!subscriptionResolved ? t('comparePage_aiWaitTitle') : undefined}
                      >
                        {t('comparePage_aiGet')}
                      </button>
                    </div>
                  )}

                  {aiLoading && (
                    <div className="compare-ai-loading" role="status" aria-live="polite">
                      <span className="compare-ai-loading-dot" />
                      {t('comparePage_aiLoading')}
                    </div>
                  )}

                  {aiError && !aiLoading && (
                    <div className="compare-ai-error" role="alert">
                      {aiError}
                      <button type="button" className="compare-ai-retry" onClick={requestAiAnalysis}>
                        {t('comparePage_aiRetry')}
                      </button>
                    </div>
                  )}

                  {!aiLoading && aiResult?.summary && (
                    <div className="compare-ai-summary">
                      <span className="compare-ai-summary-icon" aria-hidden>
                        <HiOutlineSparkles />
                      </span>
                      <div>
                        <span className="compare-ai-summary-label">{t('comparePage_resultEyebrow')}</span>
                        <p>{aiResult.summary}</p>
                      </div>
                    </div>
                  )}

                  {!aiLoading && aiResult?.rows?.length > 0 && (
                    <div className="compare-ai-results">
                      {aiScoreView ? (
                        <div
                          className="compare-ai-scoreboard"
                          role="img"
                          aria-label={t('comparePage_aiMobileScore', { left: aiScoreView.left, right: aiScoreView.right })}
                        >
                          <article
                            className={`compare-ai-score-card${aiScoreView.left > aiScoreView.right ? ' compare-ai-score-card--lead' : ''}`}
                            style={{ '--ai-score-share': `${aiScoreView.leftPct}%` }}
                          >
                            <div className="compare-ai-score-card__top">
                              <span>{t('comparePage_object1')}</span>
                              <strong>{aiScoreView.left}</strong>
                            </div>
                            <div className="compare-ai-score-track" aria-hidden><span /></div>
                            <small>{pair.left.property.name || pair.left.property.title}</small>
                          </article>
                          <article
                            className={`compare-ai-score-card${aiScoreView.right > aiScoreView.left ? ' compare-ai-score-card--lead' : ''}`}
                            style={{ '--ai-score-share': `${aiScoreView.rightPct}%` }}
                          >
                            <div className="compare-ai-score-card__top">
                              <span>{t('comparePage_object2')}</span>
                              <strong>{aiScoreView.right}</strong>
                            </div>
                            <div className="compare-ai-score-track" aria-hidden><span /></div>
                            <small>{pair.right.property.name || pair.right.property.title}</small>
                          </article>
                        </div>
                      ) : null}

                      <div className="compare-ai-evidence-grid">
                        {aiResult.rows.map((row, idx) => (
                          <article className="compare-ai-mobile-card" key={`${row.aspect}-${idx}`}>
                            <div className="compare-ai-card-head">
                              <span>{String(idx + 1).padStart(2, '0')}</span>
                              <h3>{row.aspect}</h3>
                            </div>
                            <div className="compare-ai-mobile-values">
                              <div className={row.winner === 'left' ? 'compare-ai-mobile-value compare-ai-mobile-value--win' : 'compare-ai-mobile-value'}>
                                <span>{t('comparePage_object1')}</span>
                                <strong>{row.left}</strong>
                                {row.winner === 'left' ? <FiCheckCircle className="compare-ai-value-mark" aria-hidden /> : null}
                              </div>
                              <div className={row.winner === 'right' ? 'compare-ai-mobile-value compare-ai-mobile-value--win' : 'compare-ai-mobile-value'}>
                                <span>{t('comparePage_object2')}</span>
                                <strong>{row.right}</strong>
                                {row.winner === 'right' ? <FiCheckCircle className="compare-ai-value-mark" aria-hidden /> : null}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>

                      {aiScores ? (
                        <p className="compare-ai-mobile-score">
                          {t('comparePage_aiMobileScore', { left: aiScores.left, right: aiScores.right })}
                          {aiScores.tie > 0 ? t('comparePage_aiMobileScoreTie', { tie: aiScores.tie }) : ''}.
                        </p>
                      ) : null}
                    </div>
                  )}

                  {!aiLoading && aiResult && !aiResult.rows?.length && aiResult.summary && (
                    <p className="compare-ai-note">
                      {t('comparePage_aiNote')}
                    </p>
                  )}
                </section>

                {!isMobile && <>
                {(calcLoading || calcData.left || calcData.right || calcError.left || calcError.right) && (
                  <div className="compare-calculator-results" aria-live="polite">
                    <h3 className="compare-calculator-results-title">{t('comparePage_calcResultsTitle')}</h3>
                    <div className="compare-table-wrap compare-calculator-results-wrap">
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th scope="col" className="compare-table-param">
                              {t('comparePage_calcMetric')}
                            </th>
                            <th scope="col" className="compare-table-col">
                              <span className="compare-table-col-head">
                                {pair.left.property.name || pair.left.property.title}
                              </span>
                            </th>
                            <th scope="col" className="compare-table-col">
                              <span className="compare-table-col-head">
                                {pair.right.property.name || pair.right.property.title}
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th scope="row" className="compare-table-param">
                              {t('comparePage_calcRecommendedPrice')}
                            </th>
                            <td className="compare-table-cell compare-calculator-result-cell">
                              {calcLoading && !calcData.left ? (
                                <span className="compare-calculator-pending">
                                  <FiLoader size={16} className="compare-calculator-trigger-spin" aria-hidden />
                                  {t('comparePage_calcPending')}
                                </span>
                              ) : calcError.left ? (
                                <span className="compare-calculator-cell-error">{calcError.left}</span>
                              ) : (
                                formatCalcEur(calcData.left?.recommendedPrice, dash)
                              )}
                            </td>
                            <td className="compare-table-cell compare-calculator-result-cell">
                              {calcLoading && !calcData.right ? (
                                <span className="compare-calculator-pending">
                                  <FiLoader size={16} className="compare-calculator-trigger-spin" aria-hidden />
                                  {t('comparePage_calcPending')}
                                </span>
                              ) : calcError.right ? (
                                <span className="compare-calculator-cell-error">{calcError.right}</span>
                              ) : (
                                formatCalcEur(calcData.right?.recommendedPrice, dash)
                              )}
                            </td>
                          </tr>
                          <tr>
                            <th scope="row" className="compare-table-param">
                              {t('comparePage_calcPricePerSqm')}
                            </th>
                            <td className="compare-table-cell">{formatCalcEur(calcData.left?.recommendedPricePerSqm, dash)}</td>
                            <td className="compare-table-cell">{formatCalcEur(calcData.right?.recommendedPricePerSqm, dash)}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="compare-table-param">
                              {t('comparePage_calcSources')}
                            </th>
                            <td className="compare-table-cell compare-calculator-meta">
                              {calcData.left?.searchParams?.sources?.length
                                ? calcData.left.searchParams.sources.join(', ')
                                : dash}
                            </td>
                            <td className="compare-table-cell compare-calculator-meta">
                              {calcData.right?.searchParams?.sources?.length
                                ? calcData.right.searchParams.sources.join(', ')
                                : dash}
                            </td>
                          </tr>
                          <tr>
                            <th scope="row" className="compare-table-param">
                              {t('comparePage_calcNote')}
                            </th>
                            <td className="compare-table-cell compare-calculator-note">{calcData.left?.note || dash}</td>
                            <td className="compare-table-cell compare-calculator-note">{calcData.right?.note || dash}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="compare-calculator-similar-grid">
                      <div className="compare-calculator-similar-col">
                        <h4 className="compare-calculator-similar-heading">{t('comparePage_similarLeft')}</h4>
                        {calcData.left?.similarProperties?.length ? (
                          <ul className="compare-calculator-similar-list">
                            {calcData.left.similarProperties.slice(0, 6).map((prop, idx) => {
                              const key = prop.link || `L-${idx}`
                              return (
                                <li key={key} className="compare-calculator-similar-item">
                                  <span className="compare-calculator-similar-price">
                                    {formatCalcEur(prop.price, dash)}
                                    {prop.source ? (
                                      <span className="compare-calculator-similar-source"> · {prop.source}</span>
                                    ) : null}
                                  </span>
                                  <span className="compare-calculator-similar-dims">
                                    {prop.area ? t('comparePage_areaM2', { area: prop.area }) : ''}
                                    {prop.rooms != null ? `${prop.area ? ' · ' : ''}${t('comparePage_similarRooms', { count: prop.rooms })}` : ''}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : calcData.left && !calcError.left ? (
                          <p className="compare-calculator-similar-empty">{t('comparePage_similarEmpty')}</p>
                        ) : (
                          !calcLoading && <p className="compare-calculator-similar-empty">{dash}</p>
                        )}
                      </div>
                      <div className="compare-calculator-similar-col">
                        <h4 className="compare-calculator-similar-heading">{t('comparePage_similarRight')}</h4>
                        {calcData.right?.similarProperties?.length ? (
                          <ul className="compare-calculator-similar-list">
                            {calcData.right.similarProperties.slice(0, 6).map((prop, idx) => {
                              const key = prop.link || `R-${idx}`
                              return (
                                <li key={key} className="compare-calculator-similar-item">
                                  <span className="compare-calculator-similar-price">
                                    {formatCalcEur(prop.price, dash)}
                                    {prop.source ? (
                                      <span className="compare-calculator-similar-source"> · {prop.source}</span>
                                    ) : null}
                                  </span>
                                  <span className="compare-calculator-similar-dims">
                                    {prop.area ? t('comparePage_areaM2', { area: prop.area }) : ''}
                                    {prop.rooms != null ? `${prop.area ? ' · ' : ''}${t('comparePage_similarRooms', { count: prop.rooms })}` : ''}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : calcData.right && !calcError.right ? (
                          <p className="compare-calculator-similar-empty">{t('comparePage_similarEmpty')}</p>
                        ) : (
                          !calcLoading && <p className="compare-calculator-similar-empty">{dash}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                </>}
              </section>
            )}
          </>
        )}
      </div>

      <CompareInvestorProDrawer
        isOpen={compareInvestorDrawerOpen}
        onClose={() => setCompareInvestorDrawerOpen(false)}
        onOpenInvestorPanel={() => navigate('/calculator')}
      />
    </div>
  )
}

export default Compare
