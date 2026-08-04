import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  Banknote,
  BarChart3,
  BrainCircuit,
  Check,
  CircleAlert,
  ExternalLink,
  Gauge,
  House,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import './InvestorAiExperience.css'

const LOADING_STEPS = [
  { title: 'Собираем рынок', text: 'Проверяем свежие ставки, цены и аренду' },
  { title: 'Строим сценарии', text: 'Сравниваем осторожный, базовый и сильный рынок' },
  { title: 'Оцениваем ипотеку', text: 'Считаем диапазон финансирования и нагрузку' },
  { title: 'Формируем вывод', text: 'Собираем риски и конкретные рекомендации' },
]

const SCORE_REVEAL_DURATION = 1350

const TAB_ITEMS = [
  { id: 'overview', label: 'Обзор', Icon: Gauge },
  { id: 'forecast', label: 'Прогноз', Icon: BarChart3 },
  { id: 'mortgage', label: 'Ипотека', Icon: Landmark },
]

const money = (value, currency = 'EUR') => new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency,
  maximumFractionDigits: 0,
}).format(Number(value) || 0)

const compactMoney = (value, currency = 'EUR') => new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency,
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Number(value) || 0)

const percent = (value) => `${(Number(value) || 0).toFixed(1)}%`
const signedPercent = (value) => {
  const numeric = Number(value) || 0
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`
}

const signedMoney = (value, currency = 'EUR') => {
  const numeric = Number(value) || 0
  const sign = numeric > 0 ? '+' : numeric < 0 ? '−' : ''
  return `${sign}${money(Math.abs(numeric), currency)}`
}

function buildResultFactors(analysis) {
  const metrics = analysis?.metrics || {}
  const points = analysis?.scenarios?.base?.yearlyPoints || []
  const lastPoint = points.at(-1) || {}
  const horizonYears = Math.max(1, Number(lastPoint.year) || points.length || 1)
  const totalInvestment = Math.max(1, Number(metrics.totalInvestment) || 1)
  const netProfit = Number(metrics.netProfit) || 0
  const displayedRoi = Number(metrics.totalRoiPct)
  const reconciledProfit = Number.isFinite(displayedRoi)
    ? totalInvestment * (displayedRoi / 100)
    : netProfit
  const growthRate = (Number(analysis?.assumptions?.base?.annualPriceGrowthPct) || 0) / 100
  const finalPropertyValue = Number(lastPoint.propertyValue) || totalInvestment
  const impliedStartValue = growthRate > -1
    ? finalPropertyValue / ((1 + growthRate) ** horizonYears)
    : totalInvestment
  const growthAmount = Math.max(0, finalPropertyValue - impliedStartValue)
  const rentalAmount = points.reduce((sum, point) => {
    const annualRent = Number(point.annualRent) || 0
    const vacancyRate = Math.min(100, Math.max(0, Number(point.vacancyRatePct) || 0))
    return sum + annualRent * (1 - vacancyRate / 100)
  }, 0)
  const entryGap = Math.max(0, totalInvestment - (Number(metrics.targetPurchasePrice) || totalInvestment))
  const entryAmount = -entryGap
  const financeAmount = -points.reduce((sum, point) => {
    const payment = Number(point.mortgagePayment) || 0
    const principal = Number(point.mortgagePrincipalPaid) || 0
    return sum + Math.max(0, payment - principal)
  }, 0)
  const costsAmount = reconciledProfit - growthAmount - rentalAmount - entryAmount - financeAmount

  const factors = [
    {
      id: 'growth',
      label: 'Рост стоимости',
      amount: growthAmount,
      explanation: `Базовый сценарий учитывает изменение стоимости объекта за ${horizonYears} ${horizonYears === 1 ? 'год' : 'лет'}.`,
    },
    {
      id: 'rent',
      label: 'Арендный поток',
      amount: rentalAmount,
      explanation: 'Эффективная аренда рассчитана с учётом прогнозируемых периодов вакантности.',
    },
    {
      id: 'entry',
      label: 'Цена входа',
      amount: entryAmount,
      explanation: entryGap > 0
        ? 'Разница между текущими вложениями и целевой ценой покупки уменьшает запас прочности.'
        : 'Цена входа находится в пределах расчётного ориентира.',
    },
    {
      id: 'finance',
      label: 'Финансирование',
      amount: financeAmount,
      explanation: 'Здесь показано влияние процентов по ипотеке без погашения основной суммы долга.',
    },
    {
      id: 'costs',
      label: 'Расходы и простой',
      amount: costsAmount,
      explanation: 'Операционные расходы, простой, покупательские затраты и остальные корректировки сценария.',
    },
  ].map((factor) => ({
    ...factor,
    percent: (factor.amount / totalInvestment) * 100,
  }))

  if (Number.isFinite(displayedRoi)) {
    const roundedKnownTotal = factors
      .slice(0, -1)
      .reduce((sum, factor) => sum + Number(factor.percent.toFixed(1)), 0)
    const reconciledCostsPercent = displayedRoi - roundedKnownTotal
    factors[factors.length - 1] = {
      ...factors.at(-1),
      percent: reconciledCostsPercent,
      amount: totalInvestment * (reconciledCostsPercent / 100),
    }
  }

  return factors
}

function buildMarketOutcomeSummary(analysis) {
  const configs = [
    { id: 'pessimistic', dataKey: 'cautious', label: 'Осторожный', color: '#ff9d8c' },
    { id: 'base', dataKey: 'base', label: 'Базовый', color: '#ffffff' },
    { id: 'optimistic', dataKey: 'strong', label: 'Сильный', color: '#e5ff6b' },
  ]
  const scenarioMaps = new Map(configs.map((config) => [
    config.id,
    new Map((analysis?.scenarios?.[config.id]?.yearlyPoints || []).map((point) => [Number(point.year), point])),
  ]))
  const years = [...new Set(configs.flatMap((config) => [...scenarioMaps.get(config.id).keys()]))].sort((a, b) => a - b)
  const chartRows = years.map((year) => ({
    year,
    ...Object.fromEntries(configs.map((config) => [
      config.dataKey,
      Number(scenarioMaps.get(config.id).get(year)?.propertyValue) || 0,
    ])),
  }))
  const outcomes = configs.map((config) => {
    const points = analysis?.scenarios?.[config.id]?.yearlyPoints || []
    const first = points[0] || {}
    const last = points.at(-1) || first
    const firstValue = Number(first.propertyValue) || 0
    const finalValue = Number(last.propertyValue) || firstValue
    return {
      ...config,
      year: Number(last.year) || years.at(-1) || 1,
      finalValue,
      changePct: firstValue > 0 ? ((finalValue - firstValue) / firstValue) * 100 : 0,
    }
  })

  const baseOutcome = outcomes.find((outcome) => outcome.id === 'base')
  const horizonYears = baseOutcome?.year || years.at(-1) || 1
  const baseFinalValue = baseOutcome?.finalValue || 0

  return {
    chartRows,
    outcomes,
    horizonYears,
    baseFinalValue,
  }
}

function buildLiquiditySummary(analysis) {
  const market = analysis?.marketContext || {}
  const baseAssumptions = analysis?.assumptions?.base || {}
  const growth = (
    (Number(market?.annualPriceGrowthPctRange?.min) || 0)
    + (Number(market?.annualPriceGrowthPctRange?.max) || 0)
  ) / 2
  const rentalYield = (
    (Number(market?.annualRentalYieldPctRange?.min) || 0)
    + (Number(market?.annualRentalYieldPctRange?.max) || 0)
  ) / 2
  const vacancy = Number(baseAssumptions?.vacancyRatePct) || 0
  const score = Math.min(92, Math.max(18, Math.round(54 + growth * 3.4 + rentalYield * 2.2 - vacancy * 1.8)))

  return {
    score,
    label: score >= 76 ? 'Высокая' : score >= 56 ? 'Средняя' : 'Ограниченная',
    growth,
    rentalYield,
    vacancy,
  }
}

function buildCashFlowSummary(analysis) {
  const points = analysis?.scenarios?.base?.yearlyPoints || []
  const years = Math.max(1, points.length)
  const totalNetCashFlow = points.reduce((sum, point) => sum + (Number(point.netCashFlow) || 0), 0)
  const averageAnnualRent = points.reduce((sum, point) => sum + (Number(point.annualRent) || 0), 0) / years
  const averageAnnualCosts = points.reduce((sum, point) => sum + (Number(point.operatingCosts) || 0), 0) / years
  const averageVacancy = points.reduce((sum, point) => sum + (Number(point.vacancyRatePct) || 0), 0) / years

  return {
    points,
    averageMonthly: totalNetCashFlow / years / 12,
    averageAnnualRent,
    averageAnnualCosts,
    averageVacancy,
  }
}

function LoadingScene({ propertyTitle }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStep((current) => Math.min(LOADING_STEPS.length - 1, current + 1))
    }, 1050)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="investor-ai-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
      transition={{ duration: 0.55 }}
      role="status"
      aria-live="polite"
    >
      <div className="investor-ai-loader__grid" aria-hidden="true" />
      <motion.div
        className="investor-ai-loader__halo"
        aria-hidden="true"
        animate={{ opacity: [0.45, 0.92, 0.58], scaleX: [0.72, 1.08, 0.85], y: [20, -10, 5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="investor-ai-loader__topline">
        <span><Sparkles size={15} /> AI INVESTMENT LAB</span>
        <span>LIVE</span>
      </div>
      <div className="investor-ai-loader__core">
        <motion.span
          className="investor-ai-loader__icon"
          animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BrainCircuit size={36} strokeWidth={1.6} />
        </motion.span>
        <p>Умная панель анализирует</p>
        <h2>{propertyTitle || 'ваш инвестиционный сценарий'}</h2>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            className="investor-ai-loader__step-copy"
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
            transition={{ duration: 0.42 }}
          >
            <strong>{LOADING_STEPS[activeStep].title}</strong>
            <span>{LOADING_STEPS[activeStep].text}</span>
          </motion.div>
        </AnimatePresence>

        <div className="investor-ai-loader__timeline" aria-hidden="true">
          {LOADING_STEPS.map((step, index) => (
            <span key={step.title} className={index <= activeStep ? 'is-active' : ''} />
          ))}
        </div>
      </div>
      <div className="investor-ai-loader__foot">Сценарная оценка · не является банковским одобрением</div>
    </motion.div>
  )
}

function MetricBar({ label, value, caption }) {
  const width = Math.min(100, Math.max(8, Number(value) || 0))
  return (
    <div className="investor-ai-result__metric-bar">
      <div><span>{label}</span><strong>{caption}</strong></div>
      <span className="investor-ai-result__metric-track" aria-hidden="true">
        <motion.span initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
      </span>
    </div>
  )
}

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="investor-ai-chart-tooltip">
      <strong>{label} год</strong>
      {payload.map((item) => (
        <span key={item.dataKey}><i style={{ backgroundColor: item.color }} />{item.name}: {compactMoney(item.value, currency)}</span>
      ))}
    </div>
  )
}

function OutcomePriceMarker({ cx, cy, index, value, currency, total, color, showStart = false }) {
  const isStart = showStart && index === 0
  const isEnd = index === total - 1
  if ((!isStart && !isEnd) || !Number.isFinite(cx) || !Number.isFinite(cy)) return null

  const price = compactMoney(value, currency)
  const label = isStart ? `Старт · ${price}` : price
  const width = isStart ? 104 : 82
  const height = 28
  const x = isStart ? cx + 8 : cx - width - 9
  const y = isStart ? cy - height - 10 : cy - (height / 2)

  return (
    <g className={`investor-score-screen__chart-price-label${isStart ? ' is-start' : ' is-end'}`} aria-hidden="true">
      <circle cx={cx} cy={cy} r="4.5" fill={color} stroke="#050606" strokeWidth="2" />
      <rect x={x} y={y} width={width} height={height} rx="9" fill="#f7f8f4" stroke={isStart ? 'rgba(8,10,10,.16)' : color} strokeWidth="1.25" />
      <text x={x + (width / 2)} y={y + 18.5} textAnchor="middle">{label}</text>
    </g>
  )
}

function MarketOutcomeChart({ summary, currency }) {
  const total = summary.chartRows.length
  return (
    <div className="investor-score-screen__outcome-chart" aria-label="Прогноз стоимости объекта по трём сценариям рынка">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={summary.chartRows} margin={{ top: 24, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.16)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,.68)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Line
            name="Осторожный"
            type="monotone"
            dataKey="cautious"
            stroke="#ff9d8c"
            strokeWidth={2.8}
            dot={(props) => <OutcomePriceMarker {...props} total={total} currency={currency} color="#ff9d8c" />}
            activeDot={{ r: 4, fill: '#ff9d8c', stroke: '#fff', strokeWidth: 1.5 }}
          />
          <Line
            name="Базовый"
            type="monotone"
            dataKey="base"
            stroke="#ffffff"
            strokeWidth={3.8}
            dot={(props) => <OutcomePriceMarker {...props} total={total} currency={currency} color="#ffffff" />}
            activeDot={{ r: 5, fill: '#ffffff', stroke: '#0099a9', strokeWidth: 2 }}
          />
          <Line
            name="Сильный"
            type="monotone"
            dataKey="strong"
            stroke="#e5ff6b"
            strokeWidth={2.8}
            dot={(props) => <OutcomePriceMarker {...props} total={total} currency={currency} color="#e5ff6b" showStart />}
            activeDot={{ r: 4, fill: '#e5ff6b', stroke: '#fff', strokeWidth: 1.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function FocusedCashFlowChart({ points, currency }) {
  return (
    <div className="investor-score-screen__cash-chart" aria-label="Чистый денежный поток по годам">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 14, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.16)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,.68)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Bar name="Чистый поток" dataKey="netCashFlow" radius={[8, 8, 2, 2]} maxBarSize={24}>
            {points.map((point, index) => (
              <Cell
                key={`cash-flow-${point.year}`}
                fill={index === points.length - 1 ? '#55f4ff' : 'rgba(132, 143, 145, 0.72)'}
                style={index === points.length - 1 ? { filter: 'drop-shadow(0 0 8px rgba(85, 244, 255, 0.72))' } : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ScenarioChart({ analysis, currency }) {
  const rows = useMemo(() => {
    const base = analysis?.scenarios?.base?.yearlyPoints || []
    const pessimistic = new Map((analysis?.scenarios?.pessimistic?.yearlyPoints || []).map((point) => [point.year, point]))
    const optimistic = new Map((analysis?.scenarios?.optimistic?.yearlyPoints || []).map((point) => [point.year, point]))
    return base.map((point) => ({
      year: point.year,
      base: point.propertyValue,
      pessimistic: pessimistic.get(point.year)?.propertyValue,
      optimistic: optimistic.get(point.year)?.propertyValue,
    }))
  }, [analysis])

  return (
    <div className="investor-ai-result__chart" aria-label="Прогноз стоимости объекта по сценариям">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#8d9294', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => compactMoney(value, currency)} tick={{ fill: '#8d9294', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Line name="Осторожный" type="monotone" dataKey="pessimistic" stroke="#777d80" strokeWidth={2} dot={false} />
          <Line name="Базовый" type="monotone" dataKey="base" stroke="#55d6d9" strokeWidth={3.4} dot={{ r: 2, fill: '#55d6d9' }} />
          <Line name="Сильный" type="monotone" dataKey="optimistic" stroke="#d9ff5c" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function CashFlowChart({ points, currency }) {
  return (
    <div className="investor-ai-result__chart investor-ai-result__chart--small" aria-label="Денежный поток по годам">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#858a8d', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => compactMoney(value, currency)} tick={{ fill: '#858a8d', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Bar name="Денежный поток" dataKey="netCashFlow" fill="#55d6d9" radius={[7, 7, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function EquityChart({ points, currency }) {
  return (
    <div className="investor-ai-result__chart investor-ai-result__chart--small" aria-label="Рост капитала собственника">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#858a8d', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => compactMoney(value, currency)} tick={{ fill: '#858a8d', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Area name="Ваш капитал" type="monotone" dataKey="ownerEquity" stroke="#d9ff5c" strokeWidth={2.6} fill="rgba(217,255,92,.14)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function OverviewTab({ analysis, currency }) {
  const { verdict, metrics, marketContext } = analysis
  const verdictLabel = analysis.meta?.mode === 'ai_live' ? 'AI-ВЕРДИКТ' : 'РАСЧЁТНЫЙ ВЕРДИКТ'
  const score = Math.round(Number(verdict?.score) || 0)
  const confidence = Math.round((Number(verdict?.confidence) || 0) * 100)
  const returnScore = Math.min(100, Math.max(0, 46 + Number(metrics?.annualizedReturnPct || 0) * 6))

  return (
    <motion.div className="investor-ai-result__tab-panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
      <section className="investor-ai-result__hero-card">
        <div className="investor-ai-result__eyebrow"><Sparkles size={14} /> {verdictLabel} · {confidence}% УВЕРЕННОСТИ</div>
        <div className="investor-ai-result__score-row">
          <div><span>Оценка сделки</span><strong>{score}<small>/100</small></strong></div>
          <span className={`investor-ai-result__grade investor-ai-result__grade--${verdict?.grade || 'balanced'}`}>
            {verdict?.grade === 'strong' ? 'Сильная' : verdict?.grade === 'risky' ? 'Рискованная' : 'Сбалансированная'}
          </span>
        </div>
        <h2>{verdict?.headline}</h2>
        <p>{verdict?.summary}</p>
        <div className="investor-ai-result__profit">
          <span>Потенциальный результат</span>
          <strong>{money(metrics?.netProfit, currency)}</strong>
          <small>{percent(metrics?.totalRoiPct)} за весь горизонт</small>
        </div>
      </section>

      <section className="investor-ai-result__dark-card">
        <div className="investor-ai-result__section-head"><div><small>КЛЮЧЕВЫЕ ДРАЙВЕРЫ</small><h3>Что формирует результат</h3></div><TrendingUp size={21} /></div>
        <MetricBar label="Потенциал доходности" value={returnScore} caption={percent(metrics?.annualizedReturnPct)} />
        <MetricBar label="Уверенность данных" value={confidence} caption={`${confidence}%`} />
        <MetricBar label="Запас по цене входа" value={Math.min(100, Math.max(12, 100 - (metrics?.targetPurchasePrice / Math.max(1, metrics?.totalInvestment)) * 100 + 48))} caption={money(metrics?.targetPurchasePrice, currency)} />
      </section>

      <section className="investor-ai-result__white-card">
        <div className="investor-ai-result__section-head investor-ai-result__section-head--dark"><div><small>РЫНОК · {marketContext?.asOf?.slice?.(0, 10)}</small><h3>{marketContext?.city}, {marketContext?.country}</h3></div><House size={21} /></div>
        <p>{marketContext?.summary}</p>
        <dl className="investor-ai-result__mini-metrics">
          <div><dt>Рост цены</dt><dd>{percent(marketContext?.annualPriceGrowthPctRange?.min)}–{percent(marketContext?.annualPriceGrowthPctRange?.max)}</dd></div>
          <div><dt>Арендная доходность</dt><dd>{percent(marketContext?.annualRentalYieldPctRange?.min)}–{percent(marketContext?.annualRentalYieldPctRange?.max)}</dd></div>
          <div><dt>Окупаемость</dt><dd>{Number(metrics?.breakEvenYears || 0).toFixed(1)} лет</dd></div>
        </dl>
      </section>

      <section className="investor-ai-result__list-card">
        <div className="investor-ai-result__section-head"><div><small>СИЛЬНЫЕ СТОРОНЫ</small><h3>Почему сценарий работает</h3></div><ShieldCheck size={21} /></div>
        {(analysis.strengths || []).map((item) => (
          <article key={`${item.title}-${item.explanation}`}><span><Check size={15} /></span><div><strong>{item.title}</strong><p>{item.explanation}</p></div></article>
        ))}
      </section>
    </motion.div>
  )
}

function ForecastTab({ analysis, currency }) {
  const basePoints = analysis?.scenarios?.base?.yearlyPoints || []
  return (
    <motion.div className="investor-ai-result__tab-panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
      <section className="investor-ai-result__dark-card investor-ai-result__dark-card--chart">
        <div className="investor-ai-result__section-head"><div><small>СТОИМОСТЬ ОБЪЕКТА</small><h3>Три траектории рынка</h3></div><TrendingUp size={21} /></div>
        <ScenarioChart analysis={analysis} currency={currency} />
        <div className="investor-ai-result__legend"><span><i className="is-muted" />Осторожный</span><span><i />Базовый</span><span><i className="is-lime" />Сильный</span></div>
      </section>

      <section className="investor-ai-result__dark-card investor-ai-result__dark-card--chart">
        <div className="investor-ai-result__section-head"><div><small>ДЕНЕЖНЫЙ ПОТОК</small><h3>Чистый результат по годам</h3></div><Banknote size={21} /></div>
        <CashFlowChart points={basePoints} currency={currency} />
      </section>

      <section className="investor-ai-result__dark-card investor-ai-result__dark-card--chart">
        <div className="investor-ai-result__section-head"><div><small>СОБСТВЕННЫЙ КАПИТАЛ</small><h3>Как растёт ваша доля</h3></div><BadgeEuro size={21} /></div>
        <EquityChart points={basePoints} currency={currency} />
      </section>

      <div className="investor-ai-result__scenario-stack">
        {['pessimistic', 'base', 'optimistic'].map((key) => (
          <article key={key} className={`investor-ai-result__scenario-card investor-ai-result__scenario-card--${key}`}>
            <small>{key === 'pessimistic' ? 'ОСТОРОЖНЫЙ' : key === 'optimistic' ? 'СИЛЬНЫЙ РЫНОК' : 'БАЗОВЫЙ'}</small>
            <strong>{percent(analysis?.assumptions?.[key]?.annualPriceGrowthPct)} в год</strong>
            <p>{analysis?.scenarios?.[key]?.summary}</p>
          </article>
        ))}
      </div>
    </motion.div>
  )
}

function MortgageTab({ analysis, currency }) {
  const mortgage = analysis.mortgageEstimate || {}
  const statusLabel = mortgage.status === 'likely' ? 'Высокая вероятность' : mortgage.status === 'possible' ? 'Возможный диапазон' : mortgage.status === 'unlikely' ? 'Сложный профиль' : 'Нужно больше данных'
  return (
    <motion.div className="investor-ai-result__tab-panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
      <section className="investor-ai-result__mortgage-hero">
        <div className="investor-ai-result__eyebrow"><Landmark size={14} /> ПРЕДВАРИТЕЛЬНАЯ ОЦЕНКА</div>
        <span className="investor-ai-result__mortgage-status">{statusLabel}</span>
        <h2>{money(mortgage.loanAmountRange?.min, currency)}–{money(mortgage.loanAmountRange?.max, currency)}</h2>
        <p>Ориентировочный диапазон кредита на основе объекта, рынка и доступных данных профиля.</p>
        <div className="investor-ai-result__mortgage-meter" aria-hidden="true"><motion.span initial={{ width: 0 }} animate={{ width: `${Math.round((mortgage.confidence || 0) * 100)}%` }} /></div>
        <small>Уверенность оценки {Math.round((mortgage.confidence || 0) * 100)}%</small>
      </section>

      <section className="investor-ai-result__white-card">
        <div className="investor-ai-result__section-head investor-ai-result__section-head--dark"><div><small>УСЛОВИЯ</small><h3>Вероятный банковский диапазон</h3></div><Banknote size={21} /></div>
        <dl className="investor-ai-result__mortgage-grid">
          <div><dt>Ставка</dt><dd>{percent(mortgage.interestRatePctRange?.min)}–{percent(mortgage.interestRatePctRange?.max)}</dd></div>
          <div><dt>Платёж в месяц</dt><dd>{money(mortgage.monthlyPaymentRange?.min, currency)}–{money(mortgage.monthlyPaymentRange?.max, currency)}</dd></div>
          <div><dt>Первый взнос</dt><dd>{money(mortgage.recommendedDownPayment, currency)}</dd></div>
          <div><dt>Срок</dt><dd>{mortgage.termYearsRange?.min}–{mortgage.termYearsRange?.max} лет</dd></div>
          <div><dt>Оценочный LTV</dt><dd>{percent(mortgage.estimatedLtvPct)}</dd></div>
          <div><dt>Нагрузка</dt><dd>{mortgage.estimatedDebtToIncomePct == null ? 'Нужен доход' : percent(mortgage.estimatedDebtToIncomePct)}</dd></div>
        </dl>
      </section>

      <section className="investor-ai-result__list-card">
        <div className="investor-ai-result__section-head"><div><small>РЕКОМЕНДАЦИИ</small><h3>Следующие действия</h3></div><ArrowRight size={21} /></div>
        {(analysis.recommendations || []).map((item) => (
          <article key={`${item.priority}-${item.title}`}><span>{item.priority}</span><div><strong>{item.title}</strong><p>{item.action}</p><small>{item.expectedEffect}</small></div></article>
        ))}
      </section>

      {(analysis.risks || []).length > 0 && (
        <section className="investor-ai-result__risk-card">
          <div className="investor-ai-result__section-head"><div><small>РИСКИ</small><h3>Что проверить до сделки</h3></div><CircleAlert size={21} /></div>
          {analysis.risks.map((risk) => (
            <article key={`${risk.title}-${risk.level}`}><span className={`is-${risk.level}`}>{risk.level}</span><div><strong>{risk.title}</strong><p>{risk.explanation}</p><small>{risk.mitigation}</small></div></article>
          ))}
        </section>
      )}

      {(analysis.sources || []).length > 0 && (
        <section className="investor-ai-result__sources">
          <div className="investor-ai-result__section-head"><div><small>ПРОВЕРЯЕМЫЕ ДАННЫЕ</small><h3>Источники анализа</h3></div><ExternalLink size={20} /></div>
          {analysis.sources.map((source) => (
            <a key={`${source.id}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">
              <span><strong>{source.publisher}</strong><small>{source.title}</small></span><ExternalLink size={15} />
            </a>
          ))}
        </section>
      )}

      <p className="investor-ai-result__disclaimer">{mortgage.disclaimer}</p>
    </motion.div>
  )
}

function FocusedResult({ analysis, currency, onRestart, onHome }) {
  const score = Math.min(100, Math.max(0, Math.round(Number(analysis?.verdict?.score) || 0)))
  const [animatedScore, setAnimatedScore] = useState(0)
  const [scoreAnimationComplete, setScoreAnimationComplete] = useState(false)
  const [activeFactor, setActiveFactor] = useState(null)
  const market = analysis?.marketContext || {}
  const metrics = analysis?.metrics || {}
  const resultFactors = useMemo(() => buildResultFactors(analysis), [analysis])
  const marketOutcomeSummary = useMemo(() => buildMarketOutcomeSummary(analysis), [analysis])
  const liquidity = useMemo(() => buildLiquiditySummary(analysis), [analysis])
  const cashFlow = useMemo(() => buildCashFlowSummary(analysis), [analysis])
  const mortgage = analysis?.mortgageEstimate || {}
  const mortgageStatus = mortgage.status === 'likely'
    ? 'Высокая вероятность'
    : mortgage.status === 'possible'
      ? 'Возможный диапазон'
      : mortgage.status === 'unlikely'
        ? 'Сложный профиль'
        : 'Нужно больше данных'
  const maxFactorMagnitude = Math.max(1, ...resultFactors.map((factor) => Math.abs(factor.percent)))
  const rows = [
    {
      label: 'Рост цены',
      value: `${percent(market?.annualPriceGrowthPctRange?.min)}–${percent(market?.annualPriceGrowthPctRange?.max)}`,
    },
    {
      label: 'Арендная доходность',
      value: `${percent(market?.annualRentalYieldPctRange?.min)}–${percent(market?.annualRentalYieldPctRange?.max)}`,
    },
    {
      label: 'Окупаемость',
      value: `${Number(metrics?.breakEvenYears || 0).toFixed(1)} лет`,
    },
  ]

  useEffect(() => {
    setAnimatedScore(0)
    setScoreAnimationComplete(false)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduceMotion) {
      setAnimatedScore(score)
      setScoreAnimationComplete(true)
      return undefined
    }

    let frameId
    const startedAt = window.performance.now()

    const updateScore = (now) => {
      const progress = Math.min(1, (now - startedAt) / SCORE_REVEAL_DURATION)
      const easedProgress = 1 - ((1 - progress) ** 4)
      setAnimatedScore(Math.round(score * easedProgress))

      if (progress < 1) {
        frameId = window.requestAnimationFrame(updateScore)
      } else {
        setScoreAnimationComplete(true)
      }
    }

    frameId = window.requestAnimationFrame(updateScore)
    return () => window.cancelAnimationFrame(frameId)
  }, [score, SCORE_REVEAL_DURATION])

  return (
    <motion.main
      className="investor-score-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="investor-score-screen__gradient" aria-hidden="true" />

      <motion.section
        className="investor-score-screen__hero"
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="investor-score-screen__label">Оценка сделки</span>
        <motion.div
          className="investor-score-screen__score"
          initial={{ opacity: 0, scale: 0.82, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          aria-label={`Оценка сделки ${score} из 100`}
        >
          <strong aria-hidden="true">{animatedScore}</strong><span aria-hidden="true">/100</span>
        </motion.div>
        <AnimatePresence>
          {scoreAnimationComplete && (
            <motion.div
              className="investor-score-screen__potential"
              initial={{ opacity: 0, y: 14, filter: 'blur(7px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            >
              <span>Потенциальный результат</span>
              <strong>{signedPercent(metrics?.totalRoiPct)}</strong>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {scoreAnimationComplete && (
        <motion.section
          className="investor-score-screen__market"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 28 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.52, delayChildren: 0.12, staggerChildren: 0.09 } },
          }}
        >
        <motion.div
          className="investor-score-screen__market-copy"
          variants={{
            hidden: { opacity: 0, y: 18 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
        >
          <span>Рынок · {market?.asOf?.slice?.(0, 10)}</span>
          <h1>{[market?.city, market?.country].filter(Boolean).join(', ')}</h1>
          <p>{market?.summary}</p>
        </motion.div>

        <div className="investor-score-screen__rows">
          {rows.map((row) => (
            <motion.div
              key={row.label}
              className="investor-score-screen__row"
              variants={{
                hidden: { opacity: 0, y: 22, scale: 0.97 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.46, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </motion.div>
          ))}
        </div>

        <motion.article
          className="investor-score-screen__analysis"
          variants={{
            hidden: { opacity: 0, y: 24 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.58, ease: [0.16, 1, 0.3, 1] } },
          }}
        >
          <span className="investor-score-screen__analysis-label"><Sparkles size={15} /> AI-анализ</span>
          <h2>{analysis?.verdict?.headline || 'Оценка инвестиционного сценария'}</h2>
          <p>{analysis?.verdict?.summary || 'Модель сопоставила параметры объекта, ожидаемую доходность и рыночный диапазон.'}</p>
        </motion.article>

        <motion.section
          className="investor-score-screen__factors"
          variants={{
            hidden: { opacity: 0, y: 28 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] } },
          }}
        >
          <span className="investor-score-screen__factors-label">Структура результата</span>
          <h2>Что формирует результат</h2>
          <p className="investor-score-screen__factors-lead">
            Вклад каждого фактора в потенциальные <strong>{signedPercent(metrics?.totalRoiPct)}</strong>
          </p>

          <div className="investor-score-screen__factor-list">
            {resultFactors.map((factor, index) => {
              const isOpen = activeFactor === factor.id
              const isPositive = factor.amount >= 0
              const barWidth = Math.max(7, (Math.abs(factor.percent) / maxFactorMagnitude) * 100)

              return (
                <div className="investor-score-screen__factor-wrap" key={factor.id}>
                  <motion.button
                    type="button"
                    className={`investor-score-screen__factor ${isPositive ? 'is-positive' : 'is-negative'} ${isOpen ? 'is-open' : ''}`}
                    onClick={() => setActiveFactor((current) => current === factor.id ? null : factor.id)}
                    aria-expanded={isOpen}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.08 * index, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.span
                      className="investor-score-screen__factor-fill"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${barWidth}%` }}
                      viewport={{ once: true, amount: 0.55 }}
                      transition={{ duration: 0.9, delay: 0.12 + 0.08 * index, ease: [0.16, 1, 0.3, 1] }}
                      aria-hidden="true"
                    />
                    <span className="investor-score-screen__factor-copy">
                      <strong>{factor.label}</strong>
                      <small>{signedMoney(factor.amount, currency)}</small>
                    </span>
                    <span className="investor-score-screen__factor-value">{signedPercent(factor.percent)}</span>
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.p
                        className="investor-score-screen__factor-explanation"
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.3 }}
                      >
                        {factor.explanation}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </motion.section>

        <motion.section
          className="investor-score-screen__outcomes"
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.64, ease: [0.16, 1, 0.3, 1] } },
          }}
        >
          <span className="investor-score-screen__outcomes-label">Прогноз рынка</span>
          <h2>Три исхода рынка</h2>
          <p className="investor-score-screen__outcomes-lead">Как может измениться стоимость объекта при разных условиях</p>

          <MarketOutcomeChart summary={marketOutcomeSummary} currency={currency} />

          <div className="investor-score-screen__outcome-legend" aria-hidden="true">
            {marketOutcomeSummary.outcomes.map((outcome) => (
              <span key={outcome.id}><i style={{ background: outcome.color }} />{outcome.label}</span>
            ))}
          </div>

          <div className="investor-score-screen__outcome-primary">
            <span>Базовая стоимость через {marketOutcomeSummary.horizonYears} лет</span>
            <strong>{money(marketOutcomeSummary.baseFinalValue, currency)}</strong>
          </div>

          <div className="investor-score-screen__outcome-list">
            {marketOutcomeSummary.outcomes.map((outcome) => (
              <div key={outcome.id}>
                <span><i style={{ background: outcome.color }} />{outcome.label}</span>
                <strong>{money(outcome.finalValue, currency)}</strong>
                <small>{signedPercent(outcome.changePct)} к первому году</small>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="investor-score-screen__detail-section investor-score-screen__risks"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="investor-score-screen__section-label"><CircleAlert size={15} /> Контроль сделки</span>
          <h2>Риски</h2>
          <p className="investor-score-screen__section-lead">Что может изменить результат и как снизить влияние заранее</p>

          <div className="investor-score-screen__risk-list">
            {(analysis?.risks || []).map((risk, index) => (
              <article key={`${risk.title}-${risk.level}`}>
                <div className="investor-score-screen__risk-heading">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <small className={`is-${risk.level}`}>
                    {risk.level === 'high' ? 'Высокий' : risk.level === 'low' ? 'Низкий' : 'Средний'}
                  </small>
                </div>
                <h3>{risk.title}</h3>
                <p>{risk.explanation}</p>
                <strong>{risk.mitigation}</strong>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="investor-score-screen__detail-section investor-score-screen__liquidity"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="investor-score-screen__section-label"><Gauge size={15} /> Рыночная оценка</span>
          <h2>Ликвидность</h2>
          <div className="investor-score-screen__liquidity-score">
            <strong>{liquidity.label}</strong>
            <span>{liquidity.score}<small>/100</small></span>
          </div>
          <p className="investor-score-screen__section-lead">Расчётный индекс спроса на основе динамики цены, аренды и ожидаемой вакантности.</p>

          <div className="investor-score-screen__metric-rows">
            <div><span>Динамика стоимости</span><strong>{signedPercent(liquidity.growth)} в год</strong></div>
            <div><span>Доходность аренды</span><strong>{percent(liquidity.rentalYield)}</strong></div>
            <div><span>Ожидаемый простой</span><strong>{percent(liquidity.vacancy)}</strong></div>
          </div>
          <small className="investor-score-screen__note">Индекс не гарантирует срок продажи или сдачи объекта.</small>
        </motion.section>

        <motion.section
          className="investor-score-screen__detail-section investor-score-screen__cash-flow"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="investor-score-screen__section-label"><Banknote size={15} /> Базовый сценарий</span>
          <h2>Денежный поток</h2>
          <div className="investor-score-screen__cash-primary">
            <span>В среднем за месяц</span>
            <strong>{signedMoney(cashFlow.averageMonthly, currency)}</strong>
          </div>
          <FocusedCashFlowChart points={cashFlow.points} currency={currency} />
          <div className="investor-score-screen__metric-rows">
            <div><span>Аренда в год</span><strong>{money(cashFlow.averageAnnualRent, currency)}</strong></div>
            <div><span>Расходы в год</span><strong>{money(cashFlow.averageAnnualCosts, currency)}</strong></div>
            <div><span>Средний простой</span><strong>{percent(cashFlow.averageVacancy)}</strong></div>
          </div>
        </motion.section>

        <motion.section
          className="investor-score-screen__detail-section investor-score-screen__recommendations"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="investor-score-screen__section-label"><Sparkles size={15} /> AI-рекомендации</span>
          <h2>Что делать дальше</h2>
          <p className="investor-score-screen__section-lead">Приоритетные действия, которые повышают точность и запас прочности расчёта</p>

          <div className="investor-score-screen__recommendation-list">
            {(analysis?.recommendations || []).map((item) => (
              <article key={`${item.priority}-${item.title}`}>
                <span>{String(item.priority).padStart(2, '0')}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.action}</p>
                  <strong>{item.expectedEffect}</strong>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="investor-score-screen__detail-section investor-score-screen__mortgage"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="investor-score-screen__section-label"><Landmark size={15} /> Предварительная оценка</span>
          <h2>Ипотека</h2>
          <div className="investor-score-screen__mortgage-primary">
            <span>{mortgageStatus}</span>
            <strong>{money(mortgage?.loanAmountRange?.min, currency)}–{money(mortgage?.loanAmountRange?.max, currency)}</strong>
            <small>Ориентировочный диапазон кредита</small>
          </div>

          <div className="investor-score-screen__metric-rows">
            <div><span>Ставка</span><strong>{percent(mortgage?.interestRatePctRange?.min)}–{percent(mortgage?.interestRatePctRange?.max)}</strong></div>
            <div><span>Платёж в месяц</span><strong>{money(mortgage?.monthlyPaymentRange?.min, currency)}–{money(mortgage?.monthlyPaymentRange?.max, currency)}</strong></div>
            <div><span>Первый взнос</span><strong>{money(mortgage?.recommendedDownPayment, currency)}</strong></div>
            <div><span>Срок</span><strong>{mortgage?.termYearsRange?.min}–{mortgage?.termYearsRange?.max} лет</strong></div>
          </div>
          <p className="investor-score-screen__mortgage-disclaimer">{mortgage?.disclaimer}</p>
        </motion.section>

        <motion.section
          className="investor-score-screen__actions"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <button type="button" className="is-primary" onClick={onRestart}>
            <span>Рассчитать заново</span><RefreshCw size={20} />
          </button>
          <button type="button" onClick={onHome}>
            <span>На главную</span><House size={20} />
          </button>
        </motion.section>
        </motion.section>
      )}
    </motion.main>
  )
}

function ErrorScene({ message, onRetry, onBack }) {
  return (
    <motion.section className="investor-ai-result investor-ai-result--error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <span><CircleAlert size={28} /></span>
      <h2>Анализ не завершён</h2>
      <p>{message || 'Не удалось связаться с аналитической моделью.'}</p>
      <button type="button" onClick={onRetry}><RefreshCw size={18} /> Повторить</button>
      <button type="button" className="is-ghost" onClick={onBack}><ArrowLeft size={18} /> Вернуться к параметрам</button>
    </motion.section>
  )
}

export default function InvestorAiExperience({
  status,
  analysis,
  error,
  currency = 'EUR',
  propertyTitle,
  onRetry,
  onBack,
  onRestart,
  onHome,
  onOpenAssumptions,
  onOpenProperty,
}) {
  if (status === 'loading') return <LoadingScene propertyTitle={propertyTitle} />
  if (status === 'error' || !analysis) return <ErrorScene message={error} onRetry={onRetry} onBack={onBack} />
  return <FocusedResult analysis={analysis} currency={currency} onRestart={onRestart || onBack} onHome={onHome} />
}
