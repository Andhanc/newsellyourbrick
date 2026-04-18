import React, { useMemo, useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './property-bid-analytics-chart.css'

export type BidChartPoint = {
  time: string
  price: number
}

type ChartType = 'line' | 'area'

const EMERALD = '#10b981'
const EMERALD_SOFT = '#34d399'
const DOWN = '#ef4444'
const GRID_STROKE = 'rgba(15, 23, 42, 0.055)'
const CURSOR_STROKE = 'rgba(100, 116, 139, 0.45)'

function formatAxisTime(time: string) {
  const d = new Date(time)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatTooltipTime(time: string) {
  const d = new Date(time)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function ChartTooltipContent({
  active,
  payload,
  label,
  currencySymbol,
}: {
  active?: boolean
  payload?: { value?: number }[]
  label?: string
  currencySymbol: string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.value as number
  const when = label ? formatTooltipTime(label) : ''
  const priceStr =
    typeof p === 'number' && !Number.isNaN(p)
      ? `${currencySymbol}${p.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—'
  return (
    <div className="pba-tooltip">
      {when ? <div className="pba-tooltip__time">{when}</div> : null}
      <div className="pba-tooltip__price">{priceStr}</div>
    </div>
  )
}

function LineAreaTabs({
  value,
  onChange,
}: {
  value: ChartType
  onChange: (v: ChartType) => void
}) {
  const opts: { value: ChartType; label: string }[] = [
    { value: 'line', label: 'Линия' },
    { value: 'area', label: 'Область' },
  ]
  return (
    <div className="pba-tabs" role="tablist" aria-label="Тип графика">
      {opts.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`pba-tabs__btn${active ? ' pba-tabs__btn--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function LastPointDot(props: Record<string, unknown> & { dataLength: number }) {
  const { cx, cy, index, dataLength } = props as {
    cx?: number
    cy?: number
    index?: number
    dataLength: number
  }
  if (cx == null || cy == null || index !== dataLength - 1) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill="rgba(16, 185, 129, 0.15)" />
      <circle cx={cx} cy={cy} r={5.5} fill={EMERALD} stroke="#0f172a" strokeWidth={1.75} />
    </g>
  )
}

export function PropertyBidAnalyticsChart({
  data,
  currencySymbol = '$',
}: {
  data: BidChartPoint[]
  currencySymbol?: string
}) {
  const uid = useId().replace(/:/g, '')
  const gradId = `bidFill-${uid}`

  const [chartType, setChartType] = React.useState<ChartType>('area')

  const latestPrice = data[data.length - 1]?.price ?? 0
  const previousPrice = data[data.length - 2]?.price ?? latestPrice
  const priceChange = latestPrice - previousPrice
  const percentChange = previousPrice ? (priceChange / previousPrice) * 100 : 0
  const isPriceUp = priceChange >= 0

  const lineStroke = isPriceUp ? EMERALD : DOWN

  const axisTick = useMemo(() => ({ fontSize: 11, fill: '#94a3b8' } as const), [])

  const n = data.length

  const fmtPrice = (v: number) =>
    `${currencySymbol}${Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="pba-card">
      <div className="pba-card__glow" aria-hidden />
      <div className="pba-card__body">
        <div className="pba-toolbar">
          <div className="pba-toolbar__left">
            <span className="pba-eyebrow">Ставки · время</span>
          </div>
          <LineAreaTabs value={chartType} onChange={setChartType} />
        </div>

        <div className="pba-kpi">
          <span className="pba-kpi__label">Актуальная сумма</span>
          <div className="pba-kpi__row">
            <span className="pba-kpi__value">
              {currencySymbol}
              {latestPrice.toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className={`pba-kpi__chip ${isPriceUp ? 'pba-kpi__chip--up' : 'pba-kpi__chip--down'}`}>
              <span aria-hidden>{isPriceUp ? '▲' : '▼'}</span>
              {currencySymbol}
              {Math.abs(priceChange).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="opacity-80">({percentChange.toFixed(2)}%)</span>
            </span>
          </div>
          <p className="pba-kpi__hint">Относительно предыдущей точки на графике (время × сумма ставки).</p>
        </div>

        <div className="pba-chart-well">
          <div className="pba-chart-well__canvas">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={data} margin={{ top: 14, right: 14, left: 2, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatAxisTime}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v: number) => fmtPrice(v)}
                  />
                  <ReTooltip
                    content={<ChartTooltipContent currencySymbol={currencySymbol} />}
                    cursor={{ stroke: CURSOR_STROKE, strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={lineStroke}
                    strokeWidth={2.25}
                    dot={(dotProps) => <LastPointDot {...dotProps} dataLength={n} />}
                    activeDot={{
                      r: 7,
                      fill: EMERALD,
                      stroke: '#0f172a',
                      strokeWidth: 2,
                    }}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <AreaChart data={data} margin={{ top: 14, right: 14, left: 2, bottom: 6 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={EMERALD_SOFT} stopOpacity={0.5} />
                      <stop offset="45%" stopColor={EMERALD} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatAxisTime}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v: number) => fmtPrice(v)}
                  />
                  <ReTooltip
                    content={<ChartTooltipContent currencySymbol={currencySymbol} />}
                    cursor={{ stroke: CURSOR_STROKE, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={lineStroke}
                    strokeWidth={2.25}
                    fill={`url(#${gradId})`}
                    isAnimationActive={false}
                    dot={(dotProps) => <LastPointDot {...dotProps} dataLength={n} />}
                    activeDot={{
                      r: 7,
                      fill: EMERALD,
                      stroke: '#0f172a',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <footer className="pba-foot">
          <span className="pba-foot__dot" aria-hidden />
          <p className="pba-foot__text">Данные · история ставок · Recharts</p>
        </footer>
      </div>
    </div>
  )
}
