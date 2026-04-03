import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { FiArrowRight, FiColumns, FiMapPin, FiRefreshCw } from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { HiOutlineSparkles } from 'react-icons/hi'
import { useFavoriteAuctionItems } from '../hooks/useFavoriteAuctionItems'
import { getComparisonGroupKey } from '../utils/propertyFavoriteKey'
import { showNotification } from '../utils/toastHelper'
import { askPropertyCompareAssistant } from '../services/aiService'
import './Compare.css'

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'

function formatTypeLabel(groupKey) {
  if (!groupKey) return 'Объект'
  if (groupKey.startsWith('mock:')) {
    const sub = groupKey.slice(5)
    const m = {
      recommended: 'Подборка',
      nearby: 'Рядом',
      kvaritra: 'Квартира (демо)',
      apartment: 'Квартира (демо)',
      villa: 'Вилла (демо)',
      flat: 'Квартира (демо)',
      townhouse: 'Таунхаус (демо)',
      property: 'Объект',
    }
    return m[sub] || sub
  }
  if (groupKey === 'properties_apartments') return 'Квартира'
  if (groupKey === 'properties_houses') return 'Дом'
  if (groupKey === 'properties') return 'Объект'
  return groupKey
}

function formatPrice(price) {
  const n = Number(price)
  if (price == null || price === '' || Number.isNaN(n)) return '—'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  return `$${n.toLocaleString('en-US')}`
}

function effectivePrice(p) {
  const bid = p.currentBid != null && p.currentBid !== '' ? Number(p.currentBid) : NaN
  const isAuc = p.isAuction === true || p.is_auction === 1 || p.is_auction === true
  if (isAuc && !Number.isNaN(bid) && bid > 0) return bid
  const pr = p.price != null && p.price !== '' ? Number(p.price) : NaN
  return Number.isNaN(pr) ? null : pr
}

function areaM2(p) {
  const a = Number(p.sqft ?? p.area ?? 0)
  return a > 0 ? a : null
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

const BUILDING_TYPE_RU = {
  monolithic: 'Монолитный',
  brick: 'Кирпичный',
  panel: 'Панельный',
  block: 'Блочный',
  wood: 'Деревянный',
  frame: 'Каркасный',
  aerated_concrete: 'Газобетонный',
  foam_concrete: 'Пенобетонный',
  other: 'Другой',
}

function formatBuildingMaterial(p) {
  const code = p.building_type || p.buildingType
  if (!code) return '—'
  const s = String(code)
  return BUILDING_TYPE_RU[s] || s
}

/** Полный снимок для запроса к ИИ */
function serializePropertyForAi(p) {
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
    area_m2: p.sqft ?? p.area ?? null,
    rooms: p.beds ?? p.rooms ?? null,
    bathrooms: p.baths ?? p.bathrooms ?? null,
    year_built: yearBuiltNum(p),
    building_type_code: p.building_type || p.buildingType || null,
    building_type_label: formatBuildingMaterial(p) !== '—' ? formatBuildingMaterial(p) : null,
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

function buildRows(left, right) {
  const pL = effectivePrice(left)
  const pR = effectivePrice(right)
  const isAuc =
    left.isAuction === true ||
    left.is_auction === 1 ||
    right.isAuction === true ||
    right.is_auction === 1

  const rows = []
  rows.push({
    id: 'price',
    label: isAuc ? 'Текущая ставка / цена' : 'Цена',
    left: pL != null ? formatPrice(pL) : '—',
    right: pR != null ? formatPrice(pR) : '—',
    winner: compareMetric(pL, pR, 'lower'),
  })

  const aL = areaM2(left)
  const aR = areaM2(right)
  rows.push({
    id: 'area',
    label: 'Площадь',
    left: aL != null ? `${aL} м²` : '—',
    right: aR != null ? `${aR} м²` : '—',
    winner: compareMetric(aL, aR, 'higher'),
  })

  const bL = Number(left.beds || left.rooms || left.bedrooms || 0) || null
  const bR = Number(right.beds || right.rooms || right.bedrooms || 0) || null
  rows.push({
    id: 'beds',
    label: 'Комнаты',
    left: bL != null && bL > 0 ? String(bL) : '—',
    right: bR != null && bR > 0 ? String(bR) : '—',
    winner: compareMetric(bL, bR, 'higher'),
  })

  const btL = Number(left.baths || left.bathrooms || 0) || null
  const btR = Number(right.baths || right.bathrooms || 0) || null
  rows.push({
    id: 'baths',
    label: 'Санузлы',
    left: btL != null && btL > 0 ? String(btL) : '—',
    right: btR != null && btR > 0 ? String(btR) : '—',
    winner: compareMetric(btL, btR, 'higher'),
  })

  const yL = yearBuiltNum(left)
  const yR = yearBuiltNum(right)
  rows.push({
    id: 'year',
    label: 'Год постройки',
    left: yL != null ? String(yL) : '—',
    right: yR != null ? String(yR) : '—',
    winner: compareMetric(yL, yR, 'higher'),
  })

  let ppmL = null
  let ppmR = null
  if (pL != null && aL != null && aL > 0) ppmL = pL / aL
  if (pR != null && aR != null && aR > 0) ppmR = pR / aR
  rows.push({
    id: 'ppm',
    label: 'Цена за м²',
    left: ppmL != null ? formatPrice(ppmL) : '—',
    right: ppmR != null ? formatPrice(ppmR) : '—',
    winner: compareMetric(ppmL, ppmR, 'lower'),
  })

  rows.push({
    id: 'material',
    label: 'Материал постройки',
    left: formatBuildingMaterial(left),
    right: formatBuildingMaterial(right),
    winner: null,
    displayOnly: true,
  })

  return rows
}

function scoreRows(rows) {
  let left = 0
  let right = 0
  for (const r of rows) {
    if (r.winner === 'left') left += 1
    else if (r.winner === 'right') right += 1
  }
  return { left, right }
}

const Compare = () => {
  const navigate = useNavigate()
  const { favoriteAuctions } = useFavoriteAuctionItems()
  const [selectedKeys, setSelectedKeys] = useState(() => [])
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [aiRefreshKey, setAiRefreshKey] = useState(0)

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
          showNotification('Сравнивайте только объекты одного типа (например, квартиру с квартирой)')
          return
        }
        if (item.key === selectedKeys[0]) return
        setSelectedKeys([selectedKeys[0], item.key])
        return
      }
      setSelectedKeys([item.key])
    },
    [selectedKeys, groupFilter]
  )

  const clearSelection = () => setSelectedKeys([])

  const pair = useMemo(() => {
    if (selectedKeys.length !== 2) return null
    const a = favoriteAuctions.find((x) => x.key === selectedKeys[0])
    const b = favoriteAuctions.find((x) => x.key === selectedKeys[1])
    if (!a || !b) return null
    return { left: a, right: b }
  }, [favoriteAuctions, selectedKeys])

  const tableRows = useMemo(() => {
    if (!pair) return []
    return buildRows(pair.left.property, pair.right.property)
  }, [pair])

  const totals = useMemo(() => scoreRows(tableRows), [tableRows])

  const summary = useMemo(() => {
    if (!pair) return null
    const { left, right } = totals
    const nL = pair.left.property.name || pair.left.property.title || 'Объект 1'
    const nR = pair.right.property.name || pair.right.property.title || 'Объект 2'
    if (left > right) return { text: `По сумме параметров выгоднее: ${nL}`, side: 'left' }
    if (right > left) return { text: `По сумме параметров выгоднее: ${nR}`, side: 'right' }
    return { text: 'По выбранным параметрам паритет — решайте по своим приоритетам', side: 'tie' }
  }, [pair, totals])

  const aiScores = useMemo(
    () => (aiResult?.rows?.length ? scoreAiInfrastructure(aiResult.rows) : null),
    [aiResult]
  )

  useEffect(() => {
    if (!pair) {
      setAiResult(null)
      setAiError(null)
      setAiLoading(false)
      return
    }
    const ac = new AbortController()
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)

    askPropertyCompareAssistant(
      serializePropertyForAi(pair.left.property),
      serializePropertyForAi(pair.right.property),
      { signal: ac.signal }
    )
      .then((res) => {
        setAiResult(res)
        setAiLoading(false)
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setAiError(e?.message || 'Не удалось получить ответ ИИ')
        setAiLoading(false)
      })

    return () => ac.abort()
  }, [pair?.left?.key, pair?.right?.key, aiRefreshKey])

  const refreshAiAnalysis = useCallback(() => {
    setAiRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="compare-page">
      <Header />
      <div className="compare-container">
        <div className="compare-header">
          <h1 className="compare-title">
            <FiColumns className="compare-title-icon" aria-hidden />
            Сравнение
          </h1>
          <p className="compare-subtitle">
            Выберите два объекта из избранного одного типа — мы покажем таблицу и подскажем, где выгоднее по
            ключевым цифрам.
          </p>
          <div className="compare-header-actions">
            <Link to="/favorites" className="compare-link-muted">
              ← К списку «Понравилось»
            </Link>
          </div>
        </div>

        {favoriteAuctions.length === 0 ? (
          <div className="compare-empty">
            <FiColumns size={56} className="compare-empty-icon" />
            <h2 className="compare-empty-title">Нечего сравнивать</h2>
            <p className="compare-empty-text">Добавьте объекты в избранное, затем вернитесь сюда.</p>
            <button type="button" className="compare-empty-button" onClick={() => navigate('/auction')}>
              Перейти к аукционам
              <FiArrowRight size={18} />
            </button>
          </div>
        ) : (
          <>
            <section className="compare-pick-section" aria-labelledby="compare-pick-heading">
              <div className="compare-pick-toolbar">
                <h2 id="compare-pick-heading" className="compare-pick-heading">
                  Объекты из избранного
                </h2>
                {groupFilter && (
                  <span className="compare-type-pill">Тип: {formatTypeLabel(groupFilter)}</span>
                )}
                {selectedKeys.length > 0 && (
                  <button type="button" className="compare-clear-btn" onClick={clearSelection}>
                    Сбросить выбор
                  </button>
                )}
              </div>
              <p className="compare-hint">
                {selectedKeys.length === 0 && 'Нажмите на карточку, чтобы выбрать первый объект.'}
                {selectedKeys.length === 1 &&
                  'Выберите второй объект того же типа. Остальные карточки недоступны.'}
                {selectedKeys.length === 2 && 'Ниже — таблица сравнения. Можно сменить выбор кнопкой «Сбросить».'}
              </p>
              <ul className="compare-pick-grid">
                {favoriteAuctions.map((item) => {
                  const g = getComparisonGroupKey(item.property, item.mockCategory)
                  const selected = selectedKeys.includes(item.key)
                  const pos = selectedKeys.indexOf(item.key)
                  const disabled =
                    selectedKeys.length === 1 && groupFilter != null && g !== groupFilter && !selected
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        className={[
                          'compare-pick-card',
                          selected && 'compare-pick-card--selected',
                          disabled && 'compare-pick-card--disabled',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        disabled={disabled}
                        onClick={() => toggleSelect(item)}
                      >
                        <div className="compare-pick-card-image">
                          <img
                            src={item.property.image || item.property.images?.[0] || PLACEHOLDER_IMG}
                            alt=""
                            onError={(e) => {
                              e.target.src = PLACEHOLDER_IMG
                            }}
                          />
                          {selected && (
                            <span className="compare-pick-badge">{pos === 0 ? '1' : '2'}</span>
                          )}
                        </div>
                        <div className="compare-pick-card-body">
                          <span className="compare-pick-type">{formatTypeLabel(g)}</span>
                          <h3 className="compare-pick-title">{item.property.name || item.property.title}</h3>
                          <p className="compare-pick-loc">
                            <FiMapPin size={14} aria-hidden />
                            {item.property.location || '—'}
                          </p>
                          <div className="compare-pick-meta">
                            {Boolean(item.property.beds || item.property.rooms) && (
                              <span>
                                <MdBed size={16} /> {item.property.beds || item.property.rooms}
                              </span>
                            )}
                            {Boolean(item.property.baths) && (
                              <span>
                                <MdOutlineBathtub size={16} /> {item.property.baths}
                              </span>
                            )}
                            {Boolean(item.property.sqft || item.property.area) && (
                              <span>
                                <BiArea size={16} /> {item.property.sqft || item.property.area} м²
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            {pair && summary && (
              <section className="compare-table-section" aria-labelledby="compare-table-heading">
                <h2 id="compare-table-heading" className="compare-table-heading">
                  Сравнение
                </h2>
                <div className="compare-table-wrap">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th scope="col" className="compare-table-param">
                          Параметр
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
                              <span className="compare-win-tag">лучше</span>
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
                              <span className="compare-win-tag">лучше</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="compare-table-summary-row">
                        <th scope="row" className="compare-table-param">
                          Итог по параметрам
                        </th>
                        <td
                          colSpan={2}
                          className={[
                            'compare-table-summary',
                            summary.side === 'left' && 'compare-table-summary--left',
                            summary.side === 'right' && 'compare-table-summary--right',
                            summary.side === 'tie' && 'compare-table-summary--tie',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <strong>{summary.text}</strong>
                          <span className="compare-table-score">
                            {' '}
                            ({totals.left} : {totals.right})
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <section className="compare-ai-section" aria-labelledby="compare-ai-heading">
                  <div className="compare-ai-head">
                    <h2 id="compare-ai-heading" className="compare-ai-title">
                      <HiOutlineSparkles className="compare-ai-title-icon" aria-hidden />
                      Рекомендация и инфраструктура (ИИ)
                    </h2>
                    <button
                      type="button"
                      className="compare-ai-refresh"
                      onClick={refreshAiAnalysis}
                      disabled={aiLoading}
                    >
                      <FiRefreshCw size={18} className={aiLoading ? 'compare-ai-spin' : ''} aria-hidden />
                      Обновить анализ
                    </button>
                  </div>
                  <p className="compare-ai-disclaimer">
                    ИИ опирается на адрес и описание объектов и общеизвестные сведения о локациях. Перед сделкой
                    проверьте расстояния на карте и актуальную инфраструктуру.
                  </p>

                  {aiLoading && (
                    <div className="compare-ai-loading">
                      <span className="compare-ai-loading-dot" />
                      Запрашиваем анализ у умного помощника…
                    </div>
                  )}

                  {aiError && !aiLoading && (
                    <div className="compare-ai-error">
                      {aiError}
                      <button type="button" className="compare-ai-retry" onClick={refreshAiAnalysis}>
                        Повторить
                      </button>
                    </div>
                  )}

                  {!aiLoading && aiResult?.summary && (
                    <div className="compare-ai-summary">
                      <p>{aiResult.summary}</p>
                    </div>
                  )}

                  {!aiLoading && aiResult?.rows?.length > 0 && (
                    <div className="compare-table-wrap compare-ai-table-wrap">
                      <table className="compare-table compare-ai-table">
                        <thead>
                          <tr>
                            <th scope="col" className="compare-table-param">
                              Инфраструктура и окружение
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
                          {aiResult.rows.map((row, idx) => (
                            <tr key={`${row.aspect}-${idx}`}>
                              <th scope="row" className="compare-table-param">
                                {row.aspect}
                              </th>
                              <td
                                className={[
                                  'compare-table-cell',
                                  row.winner === 'left' && 'compare-table-cell--win',
                                  row.winner === 'tie' && 'compare-table-cell--tie',
                                  row.winner === 'unknown' && 'compare-table-cell--plain',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                              >
                                {row.left}
                                {row.winner === 'left' && <span className="compare-win-tag">лучше</span>}
                              </td>
                              <td
                                className={[
                                  'compare-table-cell',
                                  row.winner === 'right' && 'compare-table-cell--win',
                                  row.winner === 'tie' && 'compare-table-cell--tie',
                                  row.winner === 'unknown' && 'compare-table-cell--plain',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                              >
                                {row.right}
                                {row.winner === 'right' && <span className="compare-win-tag">лучше</span>}
                              </td>
                            </tr>
                          ))}
                          {aiScores && (
                            <tr className="compare-table-summary-row">
                              <th scope="row" className="compare-table-param">
                                Итог по строкам ИИ
                              </th>
                              <td colSpan={2} className="compare-table-summary compare-table-summary--tie">
                                <strong>
                                  Преимуществ по оценке ИИ: первый объект — {aiScores.left}, второй —{' '}
                                  {aiScores.right}
                                  {aiScores.tie > 0 ? `, паритет — ${aiScores.tie}` : ''}
                                </strong>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!aiLoading && aiResult && !aiResult.rows?.length && aiResult.summary && (
                    <p className="compare-ai-note">
                      Таблица не разобралась из ответа модели — ориентируйтесь на текст выше или нажмите
                      «Обновить анализ».
                    </p>
                  )}
                </section>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Compare
