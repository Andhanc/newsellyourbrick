'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/line-charts-5';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';

// Chart configuration - яркие цвета для темной темы
const chartConfig = {
  income: {
    label: 'Доходы',
    color: '#f59e0b', // amber-500 / orange - яркий оранжевый
  },
  expenses: {
    label: 'Расходы',
    color: '#a855f7', // purple-500 - яркий фиолетовый
  },
};

// Custom Tooltip - оптимизирован для темной темы
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="rounded-lg border border-white/10 bg-[#0a0e27] backdrop-blur-xl p-3 shadow-xl min-w-[150px]"
        style={{
          background: 'rgba(10, 14, 39, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="text-xs font-medium text-white/90 tracking-wide mb-2.5">{label}</div>
        <div className="space-y-2">
          {payload.map((entry, index) => {
            const config = chartConfig[entry.dataKey];
            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-white/70">{config?.label}:</span>
                </div>
                <span className="font-semibold text-white">
                  {entry.value.toLocaleString('ru-RU')} €
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const ChartLabel = ({ label, color }) => {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-2 h-4 rounded-full" 
        style={{ 
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}40`,
        }}
      ></div>
      <span className="text-white/90 font-semibold text-base">{label}</span>
    </div>
  );
};

export default function IncomeExpensesChart({ yearlyData, formatCurrency }) {
  // Transform data for the chart
  const chartData = useMemo(() => {
    return yearlyData.map((item, index) => ({
      period: `Год ${index + 1}`,
      income: item.rentalIncome,
      expenses: item.totalExpenses,
    }));
  }, [yearlyData]);

  // Calculate totals and percentage changes
  const totalIncome = useMemo(() => {
    return yearlyData.reduce((sum, item) => sum + item.rentalIncome, 0);
  }, [yearlyData]);

  const totalExpenses = useMemo(() => {
    return yearlyData.reduce((sum, item) => sum + item.totalExpenses, 0);
  }, [yearlyData]);

  // Изменение дохода: первый год → последний год
  const incomeChange = useMemo(() => {
    if (yearlyData.length < 2) return 0;
    const firstYear = yearlyData[0].rentalIncome;
    const lastYear = yearlyData[yearlyData.length - 1].rentalIncome;
    if (firstYear === 0) return 0;
    const change = ((lastYear - firstYear) / firstYear) * 100;
    return Math.round(change * 10) / 10;
  }, [yearlyData]);

  // Изменение расходов: первый год → последний год.
  // Когда ипотеки нет, расходы = операционные (% от дохода) → растут так же, как доход → проценты совпадают.
  const expensesChange = useMemo(() => {
    if (yearlyData.length < 2) return 0;
    const firstYear = yearlyData[0].totalExpenses;
    const lastYear = yearlyData[yearlyData.length - 1].totalExpenses;
    if (firstYear === 0) return 0;
    const change = ((lastYear - firstYear) / firstYear) * 100;
    if (Math.abs(change) < 0.1) return 0;
    return Math.round(change * 10) / 10;
  }, [yearlyData]);

  // Доля расходов от дохода за весь период (показываем, когда рост расходов ≈ рост дохода, чтобы не дублировать процент)
  const expensesShareOfIncome = useMemo(() => {
    if (totalIncome <= 0) return 0;
    return Math.round((totalExpenses / totalIncome) * 1000) / 10;
  }, [totalIncome, totalExpenses]);

  const expensesSameAsIncome = Math.abs(expensesChange - incomeChange) < 1;
  const hasData = yearlyData.length > 0;

  return (
    <Card 
      className="w-full"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >

      <CardContent className="px-8 md:px-10 pb-6 pt-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Доходы блок */}
          <div 
            className="flex flex-col gap-3 p-6 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <ChartLabel label="Доходы" color={chartConfig.income.color} />
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span 
                className="text-3xl md:text-4xl font-bold text-white"
                style={{
                  textShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                }}
              >
                {formatCurrency ? formatCurrency(totalIncome) : `${totalIncome.toLocaleString('ru-RU')} €`}
              </span>
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{
                  background: incomeChange >= 0 
                    ? 'rgba(34, 197, 94, 0.15)' 
                    : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${incomeChange >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {incomeChange >= 0 ? (
                  <TrendingUp className="size-4" style={{ color: '#22c55e' }} />
                ) : (
                  <TrendingDown className="size-4" style={{ color: '#ef4444' }} />
                )}
                <span 
                  className="text-sm font-semibold"
                  style={{
                    color: incomeChange >= 0 ? '#22c55e' : '#ef4444',
                  }}
                >
                  {Math.abs(incomeChange)}%
                </span>
              </div>
            </div>
          </div>

          {/* Расходы блок: если рост совпадает с доходом — показываем долю от дохода вместо дублирующего % */}
          <div 
            className="flex flex-col gap-3 p-5 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <ChartLabel label="Расходы" color={chartConfig.expenses.color} />
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span 
                className="text-3xl md:text-4xl font-bold text-white"
                style={{
                  textShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                }}
              >
                {formatCurrency ? formatCurrency(totalExpenses) : `${totalExpenses.toLocaleString('ru-RU')} €`}
              </span>
              {expensesSameAsIncome ? (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                  }}
                  title="Расходы растут так же, как доход (операционные % от дохода ± ипотека)"
                >
                  <span className="text-sm font-semibold" style={{ color: '#c084fc' }}>
                    {expensesShareOfIncome}% от дохода
                  </span>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{
                    background: expensesChange <= 0 
                      ? 'rgba(34, 197, 94, 0.15)' 
                      : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${expensesChange <= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {expensesChange <= 0 ? (
                    <TrendingUp className="size-4" style={{ color: '#22c55e' }} />
                  ) : (
                    <TrendingDown className="size-4" style={{ color: '#ef4444' }} />
                  )}
                  <span 
                    className="text-sm font-semibold"
                    style={{
                      color: expensesChange <= 0 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {expensesChange >= 0 ? '+' : ''}{expensesChange.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart или заглушка */}
        <div className="h-[300px] w-full relative">
          {hasData ? (
            <ChartContainer
              config={chartConfig}
              className="h-full w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
            >
              <ComposedChart
                data={chartData}
            margin={{
              top: 30,
              right: 5,
              left: 5,
              bottom: 10,
            }}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartConfig.income.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartConfig.income.color} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartConfig.expenses.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartConfig.expenses.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 12"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeOpacity={0.5}
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}
              tickMargin={10}
            />

            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M €`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k €`;
                }
                return `${value} €`;
              }}
              tickMargin={10}
            />

            <ChartTooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255, 255, 255, 0.3)', strokeOpacity: 0.5 }}
            />

            {/* Income Line (Solid) - более яркая и толстая для видимости */}
            <Line
              yAxisId="left"
              type="linear"
              dataKey="income"
              stroke={chartConfig.income.color}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: chartConfig.income.color,
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />

            {/* Expenses Line (Dashed) - более яркая и толстая для видимости */}
            <Line
              yAxisId="left"
              type="linear"
              dataKey="expenses"
              stroke={chartConfig.expenses.color}
              strokeWidth={3}
              strokeDasharray="8 4"
              dot={false}
              activeDot={{
                r: 6,
                fill: chartConfig.expenses.color,
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
            </ChartContainer>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: 300,
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '0.95rem',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              Нет данных
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

