import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const SCORE_REVEAL_DURATION = 1350

function buildLoadingSteps(t) {
  return [
    { title: t('smartInvestor_loadStep1') },
    { title: t('smartInvestor_loadStep2') },
    { title: t('smartInvestor_loadStep3') },
    { title: t('smartInvestor_loadStep4') },
  ]
}

function buildTabItems(t) {
  return [
    { id: 'overview', label: t('smartInvestor_tabOverview'), Icon: Gauge },
    { id: 'forecast', label: t('smartInvestor_tabForecast'), Icon: BarChart3 },
    { id: 'mortgage', label: t('smartInvestor_tabMortgage'), Icon: Landmark },
  ]
}

const LOCALE_MAP = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }

const resolveLocale = (lang) => LOCALE_MAP[String(lang || 'en').split('-')[0]] || 'en-US'

const money = (value, currency = 'EUR', lang = 'en') => new Intl.NumberFormat(resolveLocale(lang), {
  style: 'currency',
  currency,
  maximumFractionDigits: 0,
}).format(Number(value) || 0)

const compactMoney = (value, currency = 'EUR', lang = 'en') => new Intl.NumberFormat(resolveLocale(lang), {
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

const signedMoney = (value, currency = 'EUR', lang = 'en') => {
  const numeric = Number(value) || 0
  const sign = numeric > 0 ? '+' : numeric < 0 ? '−' : ''
  return `${sign}${money(Math.abs(numeric), currency, lang)}`
}

function buildResultFactors(analysis, t) {
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

  const yearWord = horizonYears === 1 ? t('smartInvestor_yearOne') : t('smartInvestor_yearMany')
  const factors = [
    {
      id: 'growth',
      label: t('smartInvestor_factorValueGrowth'),
      amount: growthAmount,
      explanation: t('smartInvestor_factorValueGrowthExpl', { years: horizonYears, yearWord }),
    },
    {
      id: 'rent',
      label: t('smartInvestor_factorRentFlow'),
      amount: rentalAmount,
      explanation: t('smartInvestor_factorRentFlowExpl'),
    },
    {
      id: 'entry',
      label: t('smartInvestor_factorEntry'),
      amount: entryAmount,
      explanation: entryGap > 0
        ? t('smartInvestor_factorEntryTight')
        : t('smartInvestor_factorEntryOk'),
    },
    {
      id: 'finance',
      label: t('smartInvestor_factorFinance'),
      amount: financeAmount,
      explanation: t('smartInvestor_factorFinanceExpl'),
    },
    {
      id: 'costs',
      label: t('smartInvestor_factorCosts'),
      amount: costsAmount,
      explanation: t('smartInvestor_factorCostsExpl'),
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

function buildMarketOutcomeSummary(analysis, t) {
  const configs = [
    { id: 'pessimistic', dataKey: 'cautious', label: t('smartInvestor_scenarioCautious'), color: '#ff9d8c' },
    { id: 'base', dataKey: 'base', label: t('smartInvestor_scenarioBase'), color: '#ffffff' },
    { id: 'optimistic', dataKey: 'strong', label: t('smartInvestor_scenarioStrong'), color: '#e5ff6b' },
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

function buildLiquiditySummary(analysis, t) {
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
    label: score >= 76 ? t('smartInvestor_liquidityHigh') : score >= 56 ? t('smartInvestor_liquidityMed') : t('smartInvestor_liquidityLow'),
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
  const { t, i18n } = useTranslation()
  const LOADING_STEPS = useMemo(() => buildLoadingSteps(t), [t])
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % LOADING_STEPS.length)
    }, 1400)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="investor-ai-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      aria-live="polite"
      aria-label={t('smartInvestor_aiLoaderAria')}
    >
      <div className="investor-ai-loader__glow" aria-hidden="true" />

      <div className="investor-ai-loader__core">
        <div className="investor-ai-loader__spinner" aria-hidden="true">
          <span className="investor-ai-loader__spinner-ring" />
          <span className="investor-ai-loader__spinner-icon">
            <Sparkles size={22} strokeWidth={1.8} />
          </span>
        </div>

        <p>{t('smartInvestor_aiAnalyzing')}</p>
        <h2>{propertyTitle || t('smartInvestor_aiScenarioFallback')}</h2>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={activeStep}
            className="investor-ai-loader__status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {LOADING_STEPS[activeStep].title}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="investor-ai-loader__foot">{t('smartInvestor_aiLoaderFoot')}</div>
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
  const { t, i18n } = useTranslation()
  if (!active || !payload?.length) return null
  return (
    <div className="investor-ai-chart-tooltip">
      <strong>{t('smartInvestor_yearN', { label })}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}><i style={{ backgroundColor: item.color }} />{item.name}: {compactMoney(item.value, currency, i18n.language)}</span>
      ))}
    </div>
  )
}

function OutcomePriceMarker({ cx, cy, index, value, currency, total, color, showStart = false }) {
  const { i18n } = useTranslation()
  const isStart = showStart && index === 0
  const isEnd = index === total - 1
  if ((!isStart && !isEnd) || !Number.isFinite(cx) || !Number.isFinite(cy)) return null

  const price = compactMoney(value, currency, i18n.language)
  const width = isStart ? 88 : 84
  const height = 26
  const x = isStart ? cx - (width / 2) : cx - 8
  const y = cy - (height / 2)

  return (
    <g className={`investor-score-screen__chart-price-label${isStart ? ' is-start' : ' is-end'}`} aria-hidden="true">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="8"
        fill="#f7f8f4"
        stroke={isStart ? 'rgba(8,10,10,.14)' : color}
        strokeWidth="1.2"
      />
      <text x={x + (width / 2)} y={y + 17} textAnchor="middle">{price}</text>
    </g>
  )
}

function MarketOutcomeChart({ summary, currency }) {
  const { t, i18n } = useTranslation()
  const total = summary.chartRows.length
  return (
    <div className="investor-score-screen__outcome-chart" aria-label={t('smartInvestor_chartPriceForecast')}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={summary.chartRows} margin={{ top: 18, right: 88, left: 48, bottom: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,.16)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,.68)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Line
            name={t('smartInvestor_scenarioCautious')}
            type="monotone"
            dataKey="cautious"
            stroke="#ff9d8c"
            strokeWidth={2.8}
            dot={(props) => <OutcomePriceMarker {...props} total={total} currency={currency} color="#ff9d8c" />}
            activeDot={{ r: 4, fill: '#ff9d8c', stroke: '#fff', strokeWidth: 1.5 }}
          />
          <Line
            name={t('smartInvestor_scenarioBase')}
            type="monotone"
            dataKey="base"
            stroke="#ffffff"
            strokeWidth={3.8}
            dot={(props) => <OutcomePriceMarker {...props} total={total} currency={currency} color="#ffffff" />}
            activeDot={{ r: 5, fill: '#ffffff', stroke: '#0099a9', strokeWidth: 2 }}
          />
          <Line
            name={t('smartInvestor_scenarioStrong')}
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
  const { t, i18n } = useTranslation()
  return (
    <div className="investor-score-screen__cash-chart" aria-label={t('smartInvestor_chartCashYears')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 14, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.16)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,.68)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Bar name={t('smartInvestor_chartNetFlow')} dataKey="netCashFlow" radius={[8, 8, 2, 2]} maxBarSize={24}>
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
  const { t, i18n } = useTranslation()
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
    <div className="investor-ai-result__chart" aria-label={t('smartInvestor_chartPriceForecast')}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#8d9294', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => compactMoney(value, currency, i18n.language)} tick={{ fill: '#8d9294', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Line name={t('smartInvestor_scenarioCautious')} type="monotone" dataKey="pessimistic" stroke="#777d80" strokeWidth={2} dot={false} />
          <Line name={t('smartInvestor_scenarioBase')} type="monotone" dataKey="base" stroke="#55d6d9" strokeWidth={3.4} dot={{ r: 2, fill: '#55d6d9' }} />
          <Line name={t('smartInvestor_scenarioStrong')} type="monotone" dataKey="optimistic" stroke="#d9ff5c" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function CashFlowChart({ points, currency }) {
  const { t, i18n } = useTranslation()
  return (
    <div className="investor-ai-result__chart investor-ai-result__chart--small" aria-label={t('smartInvestor_chartCashFlow')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#858a8d', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => compactMoney(value, currency, i18n.language)} tick={{ fill: '#858a8d', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Bar name={t('smartInvestor_chartCashFlow')} dataKey="netCashFlow" fill="#55d6d9" radius={[7, 7, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function EquityChart({ points, currency }) {
  const { t, i18n } = useTranslation()
  return (
    <div className="investor-ai-result__chart investor-ai-result__chart--small" aria-label={t('smartInvestor_chartEquity')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#858a8d', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => compactMoney(value, currency, i18n.language)} tick={{ fill: '#858a8d', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Area name={t('smartInvestor_chartYourEquity')} type="monotone" dataKey="ownerEquity" stroke="#d9ff5c" strokeWidth={2.6} fill="rgba(217,255,92,.14)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function OverviewTab({ analysis, currency }) {
  const { t, i18n } = useTranslation()
  const { verdict, metrics, marketContext } = analysis
  const verdictLabel = analysis.meta?.mode === 'ai_live' ? t('smartInvestor_aiVerdict') : t('smartInvestor_calcVerdict')
  const score = Math.round(Number(verdict?.score) || 0)
  const confidence = Math.round((Number(verdict?.confidence) || 0) * 100)
  const returnScore = Math.min(100, Math.max(0, 46 + Number(metrics?.annualizedReturnPct || 0) * 6))

  return (
    <motion.div className="investor-ai-result__tab-panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
      <section className="investor-ai-result__hero-card">
        <div className="investor-ai-result__eyebrow"><Sparkles size={14} /> {verdictLabel} · {t('smartInvestor_confidence', { pct: confidence })}</div>
        <div className="investor-ai-result__score-row">
          <div><span>{t('smartInvestor_dealScore')}</span><strong>{score}<small>/100</small></strong></div>
          <span className={`investor-ai-result__grade investor-ai-result__grade--${verdict?.grade || 'balanced'}`}>
            {verdict?.grade === 'strong' ? t('smartInvestor_gradeStrong') : verdict?.grade === 'risky' ? t('smartInvestor_gradeRisky') : t('smartInvestor_gradeBalanced')}
          </span>
        </div>
        <h2>{verdict?.headline}</h2>
        <p>{verdict?.summary}</p>
        <div className="investor-ai-result__profit">
          <span>{t('smartInvestor_potentialResult')}</span>
          <strong>{money(metrics?.netProfit, currency, i18n.language)}</strong>
          <small>{t('smartInvestor_overHorizon', { pct: percent(metrics?.totalRoiPct) })}</small>
        </div>
      </section>

      <section className="investor-ai-result__dark-card">
        <div className="investor-ai-result__section-head"><div><small>{t('smartInvestor_keyDrivers')}</small><h3>{t('smartInvestor_whatShapes')}</h3></div><TrendingUp size={21} /></div>
        <MetricBar label={t('smartInvestor_yieldPotential')} value={returnScore} caption={percent(metrics?.annualizedReturnPct)} />
        <MetricBar label={t('smartInvestor_dataConfidence')} value={confidence} caption={`${confidence}%`} />
        <MetricBar label={t('smartInvestor_entryBuffer')} value={Math.min(100, Math.max(12, 100 - (metrics?.targetPurchasePrice / Math.max(1, metrics?.totalInvestment)) * 100 + 48))} caption={money(metrics?.targetPurchasePrice, currency, i18n.language)} />
      </section>

      <section className="investor-ai-result__white-card">
        <div className="investor-ai-result__section-head investor-ai-result__section-head--dark"><div><small>{t('smartInvestor_market')} · {marketContext?.asOf?.slice?.(0, 10)}</small><h3>{marketContext?.city}, {marketContext?.country}</h3></div><House size={21} /></div>
        <p>{marketContext?.summary}</p>
        <dl className="investor-ai-result__mini-metrics">
          <div><dt>{t('smartInvestor_priceGrowth')}</dt><dd>{percent(marketContext?.annualPriceGrowthPctRange?.min)}–{percent(marketContext?.annualPriceGrowthPctRange?.max)}</dd></div>
          <div><dt>{t('smartInvestor_rentalYield')}</dt><dd>{percent(marketContext?.annualRentalYieldPctRange?.min)}–{percent(marketContext?.annualRentalYieldPctRange?.max)}</dd></div>
          <div><dt>{t('smartInvestor_payback')}</dt><dd>{t('smartInvestor_yearsCount', { value: Number(metrics?.breakEvenYears || 0).toFixed(1) })}</dd></div>
        </dl>
      </section>

      <section className="investor-ai-result__list-card">
        <div className="investor-ai-result__section-head"><div><small>{t('smartInvestor_strengths')}</small><h3>{t('smartInvestor_whyWorks')}</h3></div><ShieldCheck size={21} /></div>
        {(analysis.strengths || []).map((item) => (
          <article key={`${item.title}-${item.explanation}`}><span><Check size={15} /></span><div><strong>{item.title}</strong><p>{item.explanation}</p></div></article>
        ))}
      </section>
    </motion.div>
  )
}

function ForecastTab({ analysis, currency }) {
  const { t, i18n } = useTranslation()
  const basePoints = analysis?.scenarios?.base?.yearlyPoints || []
  return (
    <motion.div className="investor-ai-result__tab-panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
      <section className="investor-ai-result__dark-card investor-ai-result__dark-card--chart">
        <div className="investor-ai-result__section-head"><div><small>{t('smartInvestor_propertyValue')}</small><h3>{t('smartInvestor_threeTrajectories')}</h3></div><TrendingUp size={21} /></div>
        <ScenarioChart analysis={analysis} currency={currency} />
        <div className="investor-ai-result__legend"><span><i className="is-muted" />{t('smartInvestor_scenarioCautious')}</span><span><i />{t('smartInvestor_scenarioBase')}</span><span><i className="is-lime" />{t('smartInvestor_scenarioStrong')}</span></div>
      </section>

      <section className="investor-ai-result__dark-card investor-ai-result__dark-card--chart">
        <div className="investor-ai-result__section-head"><div><small>{t('smartInvestor_cashSection')}</small><h3>{t('smartInvestor_netByYear')}</h3></div><Banknote size={21} /></div>
        <CashFlowChart points={basePoints} currency={currency} />
      </section>

      <section className="investor-ai-result__dark-card investor-ai-result__dark-card--chart">
        <div className="investor-ai-result__section-head"><div><small>{t('smartInvestor_ownerEquity')}</small><h3>{t('smartInvestor_equityGrows')}</h3></div><BadgeEuro size={21} /></div>
        <EquityChart points={basePoints} currency={currency} />
      </section>

      <div className="investor-ai-result__scenario-stack">
        {['pessimistic', 'base', 'optimistic'].map((key) => (
          <article key={key} className={`investor-ai-result__scenario-card investor-ai-result__scenario-card--${key}`}>
            <small>{key === 'pessimistic' ? t('smartInvestor_cautiousUpper') : key === 'optimistic' ? t('smartInvestor_strongMarketUpper') : t('smartInvestor_baseUpper')}</small>
            <strong>{t('smartInvestor_perYear', { pct: percent(analysis?.assumptions?.[key]?.annualPriceGrowthPct) })}</strong>
            <p>{analysis?.scenarios?.[key]?.summary}</p>
          </article>
        ))}
      </div>
    </motion.div>
  )
}

function MortgageTab({ analysis, currency }) {
  const { t, i18n } = useTranslation()
  const mortgage = analysis.mortgageEstimate || {}
  const statusLabel = mortgage.status === 'likely' ? t('smartInvestor_mortgageLikely') : mortgage.status === 'possible' ? t('smartInvestor_mortgagePossible') : mortgage.status === 'unlikely' ? t('smartInvestor_mortgageHard') : t('smartInvestor_mortgageNeedData')
  return (
    <motion.div className="investor-ai-result__tab-panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
      <section className="investor-ai-result__mortgage-hero">
        <div className="investor-ai-result__eyebrow"><Landmark size={14} /> {t('smartInvestor_prelimEstimate')}</div>
        <span className="investor-ai-result__mortgage-status">{statusLabel}</span>
        <h2>{money(mortgage.loanAmountRange?.min, currency, i18n.language)}–{money(mortgage.loanAmountRange?.max, currency, i18n.language)}</h2>
        <p>{t('smartInvestor_mortgageRangeLead')}</p>
        <div className="investor-ai-result__mortgage-meter" aria-hidden="true"><motion.span initial={{ width: 0 }} animate={{ width: `${Math.round((mortgage.confidence || 0) * 100)}%` }} /></div>
        <small>{t('smartInvestor_estimateConfidence', { pct: Math.round((mortgage.confidence || 0) * 100) })}</small>
      </section>

      <section className="investor-ai-result__white-card">
        <div className="investor-ai-result__section-head investor-ai-result__section-head--dark"><div><small>{t('smartInvestor_conditions')}</small><h3>{t('smartInvestor_bankRange')}</h3></div><Banknote size={21} /></div>
        <dl className="investor-ai-result__mortgage-grid">
          <div><dt>{t('smartInvestor_rate')}</dt><dd>{percent(mortgage.interestRatePctRange?.min)}–{percent(mortgage.interestRatePctRange?.max)}</dd></div>
          <div><dt>{t('smartInvestor_monthlyPayment')}</dt><dd>{money(mortgage.monthlyPaymentRange?.min, currency, i18n.language)}–{money(mortgage.monthlyPaymentRange?.max, currency, i18n.language)}</dd></div>
          <div><dt>{t('smartInvestor_downPayment')}</dt><dd>{money(mortgage.recommendedDownPayment, currency, i18n.language)}</dd></div>
          <div><dt>{t('smartInvestor_term')}</dt><dd>{mortgage.termYearsRange?.min}–{mortgage.termYearsRange?.max} {t('smartInvestor_years')}</dd></div>
          <div><dt>{t('smartInvestor_estimatedLtv')}</dt><dd>{percent(mortgage.estimatedLtvPct)}</dd></div>
          <div><dt>{t('smartInvestor_debtLoad')}</dt><dd>{mortgage.estimatedDebtToIncomePct == null ? t('smartInvestor_needIncome') : percent(mortgage.estimatedDebtToIncomePct)}</dd></div>
        </dl>
      </section>

      <section className="investor-ai-result__list-card">
        <div className="investor-ai-result__section-head"><div><small>{t('smartInvestor_recommendations')}</small><h3>{t('smartInvestor_nextActions')}</h3></div><ArrowRight size={21} /></div>
        {(analysis.recommendations || []).map((item) => (
          <article key={`${item.priority}-${item.title}`}><span>{item.priority}</span><div><strong>{item.title}</strong><p>{item.action}</p><small>{item.expectedEffect}</small></div></article>
        ))}
      </section>

      {(analysis.risks || []).length > 0 && (
        <section className="investor-ai-result__risk-card">
          <div className="investor-ai-result__section-head"><div><small>{t('smartInvestor_risks')}</small><h3>{t('smartInvestor_checkBefore')}</h3></div><CircleAlert size={21} /></div>
          {analysis.risks.map((risk) => (
            <article key={`${risk.title}-${risk.level}`}><span className={`is-${risk.level}`}>{risk.level}</span><div><strong>{risk.title}</strong><p>{risk.explanation}</p><small>{risk.mitigation}</small></div></article>
          ))}
        </section>
      )}

      {(analysis.sources || []).length > 0 && (
        <section className="investor-ai-result__sources">
          <div className="investor-ai-result__section-head"><div><small>{t('smartInvestor_sources')}</small><h3>{t('smartInvestor_analysisSources')}</h3></div><ExternalLink size={20} /></div>
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
  const { t, i18n } = useTranslation()
  const score = Math.min(100, Math.max(0, Math.round(Number(analysis?.verdict?.score) || 0)))
  const [animatedScore, setAnimatedScore] = useState(0)
  const [scoreAnimationComplete, setScoreAnimationComplete] = useState(false)
  const [showEntryFlash, setShowEntryFlash] = useState(true)
  const [activeFactor, setActiveFactor] = useState(null)
  const market = analysis?.marketContext || {}
  const metrics = analysis?.metrics || {}
  const resultFactors = useMemo(() => buildResultFactors(analysis, t), [analysis, t])
  const marketOutcomeSummary = useMemo(() => buildMarketOutcomeSummary(analysis, t), [analysis, t])
  const liquidity = useMemo(() => buildLiquiditySummary(analysis, t), [analysis, t])
  const cashFlow = useMemo(() => buildCashFlowSummary(analysis), [analysis])
  const mortgage = analysis?.mortgageEstimate || {}
  const mortgageStatus = mortgage.status === 'likely'
    ? t('smartInvestor_mortgageLikely')
    : mortgage.status === 'possible'
      ? t('smartInvestor_mortgagePossible')
      : mortgage.status === 'unlikely'
        ? t('smartInvestor_mortgageHard')
        : t('smartInvestor_mortgageNeedData')
  const maxFactorMagnitude = Math.max(1, ...resultFactors.map((factor) => Math.abs(factor.percent)))
  const rows = [
    {
      label: t('smartInvestor_priceGrowth'),
      value: `${percent(market?.annualPriceGrowthPctRange?.min)}–${percent(market?.annualPriceGrowthPctRange?.max)}`,
    },
    {
      label: t('smartInvestor_rentalYield'),
      value: `${percent(market?.annualRentalYieldPctRange?.min)}–${percent(market?.annualRentalYieldPctRange?.max)}`,
    },
    {
      label: t('smartInvestor_payback'),
      value: t('smartInvestor_yearsCount', { value: Number(metrics?.breakEvenYears || 0).toFixed(1) }),
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
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {showEntryFlash && (
        <motion.div
          className="investor-score-screen__entry-flash"
          aria-hidden="true"
          initial={{ opacity: 0.72, scale: 0.7 }}
          animate={{ opacity: 0, scale: 1.65 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() => setShowEntryFlash(false)}
        />
      )}
      <div className="investor-score-screen__gradient" aria-hidden="true" />

      <motion.section
        className="investor-score-screen__hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="investor-score-screen__label">{t('smartInvestor_dealScore')}</span>
        <motion.div
          className="investor-score-screen__score"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          aria-label={t('smartInvestor_dealScoreAria', { score })}
        >
          <strong aria-hidden="true">{animatedScore}</strong><span aria-hidden="true">/100</span>
        </motion.div>
        <AnimatePresence>
          {scoreAnimationComplete && (
            <motion.div
              className="investor-score-screen__potential"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span>{t('smartInvestor_potentialResult')}</span>
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
          <span>{t('smartInvestor_marketDot', { date: market?.asOf?.slice?.(0, 10) })}</span>
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
          <span className="investor-score-screen__analysis-label"><Sparkles size={15} /> {t('smartInvestor_aiAnalysis')}</span>
          <h2>{analysis?.verdict?.headline || t('smartInvestor_verdictFallbackTitle')}</h2>
          <p>{analysis?.verdict?.summary || t('smartInvestor_verdictFallbackBody')}</p>
        </motion.article>

        <motion.section
          className="investor-score-screen__factors"
          variants={{
            hidden: { opacity: 0, y: 28 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] } },
          }}
        >
          <span className="investor-score-screen__factors-label">{t('smartInvestor_resultStructure')}</span>
          <h2>{t('smartInvestor_whatShapes')}</h2>
          <p className="investor-score-screen__factors-lead">
            {t('smartInvestor_factorContribution', { pct: signedPercent(metrics?.totalRoiPct) })}
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
                      <small>{signedMoney(factor.amount, currency, i18n.language)}</small>
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
          <span className="investor-score-screen__outcomes-label">{t('smartInvestor_marketForecast')}</span>
          <h2>{t('smartInvestor_threeOutcomes')}</h2>
          <p className="investor-score-screen__outcomes-lead">{t('smartInvestor_threeOutcomesLead')}</p>

          <MarketOutcomeChart summary={marketOutcomeSummary} currency={currency} />

          <div className="investor-score-screen__outcome-legend" aria-hidden="true">
            {marketOutcomeSummary.outcomes.map((outcome) => (
              <span key={outcome.id}><i style={{ background: outcome.color }} />{outcome.label}</span>
            ))}
          </div>

          <div className="investor-score-screen__outcome-primary">
            <span>{t('smartInvestor_baseValueInYears', { years: marketOutcomeSummary.horizonYears })}</span>
            <strong>{money(marketOutcomeSummary.baseFinalValue, currency, i18n.language)}</strong>
          </div>

          <div className="investor-score-screen__outcome-list">
            {marketOutcomeSummary.outcomes.map((outcome) => (
              <div key={outcome.id}>
                <span><i style={{ background: outcome.color }} />{outcome.label}</span>
                <strong>{money(outcome.finalValue, currency, i18n.language)}</strong>
                <small>{t('smartInvestor_vsYearOne', { pct: signedPercent(outcome.changePct) })}</small>
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
          <span className="investor-score-screen__section-label"><CircleAlert size={15} /> {t('smartInvestor_dealControl')}</span>
          <h2>{t('smartInvestor_risksTitle')}</h2>
          <p className="investor-score-screen__section-lead">{t('smartInvestor_risksLead')}</p>

          <div className="investor-score-screen__risk-list">
            {(analysis?.risks || []).map((risk, index) => (
              <article key={`${risk.title}-${risk.level}`}>
                <div className="investor-score-screen__risk-heading">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <small className={`is-${risk.level}`}>
                    {risk.level === 'high' ? t('smartInvestor_riskHigh') : risk.level === 'low' ? t('smartInvestor_riskLow') : t('smartInvestor_riskMed')}
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
          <span className="investor-score-screen__section-label"><Gauge size={15} /> {t('smartInvestor_marketScore')}</span>
          <h2>{t('smartInvestor_liquidity')}</h2>
          <div className="investor-score-screen__liquidity-score">
            <strong>{liquidity.label}</strong>
            <i className="investor-score-screen__liquidity-sep" aria-hidden="true" />
            <span>{liquidity.score}<small>/100</small></span>
          </div>
          <p className="investor-score-screen__section-lead">{t('smartInvestor_liquidityLead')}</p>

          <div className="investor-score-screen__metric-rows">
            <div><span>{t('smartInvestor_valueDynamics')}</span><strong>{t('smartInvestor_perYear', { pct: signedPercent(liquidity.growth) })}</strong></div>
            <div><span>{t('smartInvestor_rentYield')}</span><strong>{percent(liquidity.rentalYield)}</strong></div>
            <div><span>{t('smartInvestor_expectedVacancy')}</span><strong>{percent(liquidity.vacancy)}</strong></div>
          </div>
          <small className="investor-score-screen__note">{t('smartInvestor_liquidityNote')}</small>
        </motion.section>

        <motion.section
          className="investor-score-screen__detail-section investor-score-screen__cash-flow"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="investor-score-screen__section-label"><Banknote size={15} /> {t('smartInvestor_baseScenario')}</span>
          <h2>{t('smartInvestor_chartCashFlow')}</h2>
          <div className="investor-score-screen__cash-primary">
            <span>{t('smartInvestor_avgPerMonth')}</span>
            <strong>{signedMoney(cashFlow.averageMonthly, currency, i18n.language)}</strong>
          </div>
          <FocusedCashFlowChart points={cashFlow.points} currency={currency} />
          <div className="investor-score-screen__metric-rows">
            <div><span>{t('smartInvestor_rentPerYear')}</span><strong>{money(cashFlow.averageAnnualRent, currency, i18n.language)}</strong></div>
            <div><span>{t('smartInvestor_costsPerYear')}</span><strong>{money(cashFlow.averageAnnualCosts, currency, i18n.language)}</strong></div>
            <div><span>{t('smartInvestor_avgVacancy')}</span><strong>{percent(cashFlow.averageVacancy)}</strong></div>
          </div>
        </motion.section>

        <motion.section
          className="investor-score-screen__detail-section investor-score-screen__recommendations"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="investor-score-screen__section-label"><Sparkles size={15} /> {t('smartInvestor_aiRecs')}</span>
          <h2>{t('smartInvestor_whatNext')}</h2>
          <p className="investor-score-screen__section-lead">{t('smartInvestor_whatNextLead')}</p>

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
          <span className="investor-score-screen__section-label"><Landmark size={15} /> {t('smartInvestor_prelimMortgage')}</span>
          <h2>{t('smartInvestor_tabMortgage')}</h2>
          <div className="investor-score-screen__mortgage-primary">
            <span>{mortgageStatus}</span>
            <strong>{money(mortgage?.loanAmountRange?.min, currency, i18n.language)}–{money(mortgage?.loanAmountRange?.max, currency, i18n.language)}</strong>
            <small>{t('smartInvestor_loanRangeHint')}</small>
          </div>

          <div className="investor-score-screen__metric-rows">
            <div><span>{t('smartInvestor_rate')}</span><strong>{percent(mortgage?.interestRatePctRange?.min)}–{percent(mortgage?.interestRatePctRange?.max)}</strong></div>
            <div><span>{t('smartInvestor_monthlyPayment')}</span><strong>{money(mortgage?.monthlyPaymentRange?.min, currency, i18n.language)}–{money(mortgage?.monthlyPaymentRange?.max, currency, i18n.language)}</strong></div>
            <div><span>{t('smartInvestor_downPayment')}</span><strong>{money(mortgage?.recommendedDownPayment, currency, i18n.language)}</strong></div>
            <div><span>{t('smartInvestor_term')}</span><strong>{mortgage?.termYearsRange?.min}–{mortgage?.termYearsRange?.max} {t('smartInvestor_years')}</strong></div>
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
            <span>{t('smartInvestor_recalc')}</span><RefreshCw size={20} />
          </button>
          <button type="button" onClick={onHome}>
            <span>{t('smartInvestor_toHome')}</span><House size={20} />
          </button>
        </motion.section>
        </motion.section>
      )}
    </motion.main>
  )
}

function ErrorScene({ message, onRetry, onBack }) {
  const { t, i18n } = useTranslation()
  return (
    <motion.section className="investor-ai-result investor-ai-result--error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <span><CircleAlert size={28} /></span>
      <h2>{t('smartInvestor_analysisFailed')}</h2>
      <p>{message || t('smartInvestor_analysisFailedDefault')}</p>
      <button type="button" onClick={onRetry}><RefreshCw size={18} /> {t('smartInvestor_retry')}</button>
      <button type="button" className="is-ghost" onClick={onBack}><ArrowLeft size={18} /> {t('smartInvestor_backToParams')}</button>
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
  return (
    <div className={`investor-ai-shell${status === 'loading' ? ' investor-ai-shell--loading' : ''}`}>
      <AnimatePresence mode="wait" initial={false}>
        {status === 'loading' ? (
          <LoadingScene key="loading" propertyTitle={propertyTitle} />
        ) : status === 'error' || !analysis ? (
          <ErrorScene key="error" message={error} onRetry={onRetry} onBack={onBack} />
        ) : (
          <FocusedResult
            key="result"
            analysis={analysis}
            currency={currency}
            onRestart={onRestart || onBack}
            onHome={onHome}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
