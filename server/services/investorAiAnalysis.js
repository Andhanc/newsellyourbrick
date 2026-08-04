import crypto from 'crypto'
import { postChatCompletions } from './aiChatCompletion.js'
import { parseLooseJson } from '../utils/parseLooseJson.js'

const DEFAULT_MODEL = 'google/gemini-3.6-flash'
const MAX_HORIZON = 30
const CACHE_TTL_MS = 20 * 60 * 1000
const analysisCache = new Map()

const num = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, num(value, min)))
const money = (value) => Math.round(Math.max(0, num(value)))
const pct = (value) => Math.round(num(value) * 100) / 100
const formatAmount = (value, currency) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(money(value))} ${currency}`

function monthlyPayment(principal, annualRatePct, termYears) {
  const amount = Math.max(0, num(principal))
  const months = Math.max(1, Math.round(num(termYears, 25) * 12))
  const rate = Math.max(0, num(annualRatePct)) / 100 / 12
  if (!amount) return 0
  if (!rate) return amount / months
  return (amount * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1)
}

function sampleYears(period) {
  const horizon = clamp(Math.round(period || 10), 1, MAX_HORIZON)
  if (horizon <= 12) return Array.from({ length: horizon }, (_, index) => index + 1)
  const years = new Set([1, horizon])
  const step = (horizon - 1) / 9
  for (let index = 1; index < 9; index += 1) years.add(Math.round(1 + step * index))
  return [...years].sort((a, b) => a - b)
}

function sanitizeInput(raw = {}) {
  const property = raw.property || {}
  const goal = raw.goal || {}
  const finance = raw.finance || {}
  const borrower = raw.borrower || {}
  const country = String(property.country || raw.country || 'Spain').slice(0, 80)
  const city = String(property.city || raw.city || 'Spain').slice(0, 100)
  const price = money(property.price || finance.propertyPrice)
  const renovationCost = money(property.renovationCost || finance.renovationCost)
  const periodYears = clamp(Math.round(goal.periodYears || finance.ownershipPeriod || 10), 1, MAX_HORIZON)

  return {
    locale: String(raw.locale || 'ru').slice(0, 12),
    currency: String(raw.currency || 'EUR').slice(0, 6),
    property: {
      id: property.id == null ? null : String(property.id).slice(0, 80),
      title: String(property.title || 'Инвестиционный объект').slice(0, 180),
      country,
      city,
      type: String(property.type || 'residential').slice(0, 80),
      areaSqm: clamp(property.areaSqm || 0, 0, 100000),
      price,
      renovationCost,
    },
    goal: {
      strategy: ['rent', 'resale', 'fractional'].includes(goal.strategy) ? goal.strategy : 'rent',
      periodYears,
      ownershipSharePct: clamp(goal.ownershipSharePct || 100, 1, 100),
    },
    finance: {
      annualRent: money(finance.annualRent),
      expectedPriceGrowthPct: clamp(finance.expectedPriceGrowthPct || 4.2, -20, 30),
      expectedRentGrowthPct: clamp(finance.expectedRentGrowthPct || 2.2, -20, 30),
      operatingExpensesPct: clamp(finance.operatingExpensesPct || 18, 0, 80),
      buyerCostsPct: clamp(finance.buyerCostsPct || 8, 0, 30),
      sellerCostsPct: clamp(finance.sellerCostsPct || 4, 0, 30),
      capitalGainsTaxPct: clamp(finance.capitalGainsTaxPct || 19, 0, 60),
      useMortgage: Boolean(finance.useMortgage),
      mortgageRatePct: clamp(finance.mortgageRatePct || 0, 0, 30),
      mortgageTermYears: clamp(finance.mortgageTermYears || 25, 1, 40),
      downPaymentPct: clamp(finance.downPaymentPct || 30, 0, 100),
    },
    borrower: {
      residenceCountry: String(borrower.residenceCountry || '').slice(0, 80),
      age: clamp(borrower.age || 0, 0, 100),
      monthlyNetIncome: money(borrower.monthlyNetIncome),
      monthlyDebtPayments: money(borrower.monthlyDebtPayments),
      employmentType: String(borrower.employmentType || '').slice(0, 80),
    },
  }
}

function scenarioAssumptions(input) {
  const growth = input.finance.expectedPriceGrowthPct
  const rentGrowth = input.finance.expectedRentGrowthPct
  const expenses = input.finance.operatingExpensesPct
  const mortgageBase = input.finance.mortgageRatePct || 3.6
  return {
    pessimistic: {
      annualPriceGrowthPct: pct(Math.max(-2.5, growth - 3.2)),
      annualRentGrowthPct: pct(Math.max(-3, rentGrowth - 2)),
      vacancyRatePct: 12,
      operatingExpensesPct: pct(Math.min(80, expenses + 5)),
      mortgageRatePct: pct(mortgageBase + 0.8),
    },
    base: {
      annualPriceGrowthPct: pct(growth),
      annualRentGrowthPct: pct(rentGrowth),
      vacancyRatePct: 6,
      operatingExpensesPct: pct(expenses),
      mortgageRatePct: pct(mortgageBase),
    },
    optimistic: {
      annualPriceGrowthPct: pct(Math.min(20, growth + 2)),
      annualRentGrowthPct: pct(Math.min(20, rentGrowth + 1.2)),
      vacancyRatePct: 3,
      operatingExpensesPct: pct(Math.max(5, expenses - 3)),
      mortgageRatePct: pct(Math.max(0.5, mortgageBase - 0.45)),
    },
  }
}

function buildScenario(input, label, assumptions) {
  const scale = input.goal.ownershipSharePct / 100
  const purchasePrice = input.property.price * scale
  const renovation = input.property.renovationCost * scale
  const annualRentStart = input.finance.annualRent * scale
  const ltvPct = input.finance.useMortgage ? 100 - input.finance.downPaymentPct : 0
  const loanAmount = purchasePrice * (ltvPct / 100)
  const paymentMonthly = monthlyPayment(
    loanAmount,
    assumptions.mortgageRatePct,
    input.finance.mortgageTermYears,
  )
  const monthlyRate = assumptions.mortgageRatePct / 100 / 12
  const termMonths = Math.max(1, Math.round(input.finance.mortgageTermYears * 12))
  const requestedYears = sampleYears(input.goal.periodYears)
  const requestedSet = new Set(requestedYears)
  const points = []
  let propertyValue = purchasePrice
  let annualRent = annualRentStart
  let mortgageBalance = loanAmount
  let monthsElapsed = 0
  let cumulativeCashFlow = 0

  for (let year = 1; year <= input.goal.periodYears; year += 1) {
    propertyValue *= 1 + assumptions.annualPriceGrowthPct / 100
    annualRent *= 1 + assumptions.annualRentGrowthPct / 100
    const effectiveRent = annualRent * (1 - assumptions.vacancyRatePct / 100)
    const operatingCosts = effectiveRent * (assumptions.operatingExpensesPct / 100)
    let mortgagePayment = 0
    let mortgagePrincipalPaid = 0

    for (let month = 0; month < 12; month += 1) {
      if (mortgageBalance <= 0.01 || monthsElapsed >= termMonths) continue
      const interest = mortgageBalance * monthlyRate
      const principalPaid = Math.min(Math.max(paymentMonthly - interest, 0), mortgageBalance)
      mortgagePayment += interest + principalPaid
      mortgagePrincipalPaid += principalPaid
      mortgageBalance -= principalPaid
      monthsElapsed += 1
    }

    const netCashFlow = effectiveRent - operatingCosts - mortgagePayment
    cumulativeCashFlow += netCashFlow
    if (!requestedSet.has(year)) continue

    const confidenceSpread = label === 'base' ? 0.08 + year * 0.008 : 0.11 + year * 0.01
    points.push({
      year,
      propertyValue: money(propertyValue),
      annualRent: money(annualRent),
      vacancyRatePct: pct(assumptions.vacancyRatePct),
      operatingCosts: money(operatingCosts),
      mortgagePayment: money(mortgagePayment),
      mortgagePrincipalPaid: money(mortgagePrincipalPaid),
      mortgageBalance: money(mortgageBalance),
      netCashFlow: Math.round(netCashFlow),
      cumulativeCashFlow: Math.round(cumulativeCashFlow),
      ownerEquity: money(propertyValue - mortgageBalance),
      confidenceLow: money(propertyValue * (1 - confidenceSpread)),
      confidenceHigh: money(propertyValue * (1 + confidenceSpread)),
    })
  }

  return {
    summary: label === 'pessimistic'
      ? 'Стресс-сценарий с более высокой вакантностью и слабыми темпами рынка.'
      : label === 'optimistic'
        ? 'Сценарий ускоренного роста при устойчивом спросе и контроле расходов.'
        : 'Базовый сценарий на введённых параметрах с умеренной вакантностью.',
    yearlyPoints: points,
  }
}

function buildFallback(input, reason = '') {
  const assumptions = scenarioAssumptions(input)
  const scenarios = {
    pessimistic: buildScenario(input, 'pessimistic', assumptions.pessimistic),
    base: buildScenario(input, 'base', assumptions.base),
    optimistic: buildScenario(input, 'optimistic', assumptions.optimistic),
  }
  const baseLast = scenarios.base.yearlyPoints.at(-1) || {}
  const purchasePrice = input.property.price * (input.goal.ownershipSharePct / 100)
  const buyerCosts = purchasePrice * (input.finance.buyerCostsPct / 100)
  const totalInvestment = purchasePrice + input.property.renovationCost + buyerCosts
  const loanLtv = input.finance.useMortgage ? 100 - input.finance.downPaymentPct : 70
  const loanAmount = purchasePrice * (loanLtv / 100)
  const rateMid = input.finance.mortgageRatePct || 3.6
  const monthlyMid = monthlyPayment(loanAmount, rateMid, input.finance.mortgageTermYears)
  const netProfit = num(baseLast.ownerEquity) + num(baseLast.cumulativeCashFlow) - totalInvestment
  const totalRoiPct = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0
  const annualizedReturnPct = input.goal.periodYears > 0
    ? ((Math.max(0.01, 1 + totalRoiPct / 100) ** (1 / input.goal.periodYears)) - 1) * 100
    : 0
  const dataGaps = []
  if (!input.borrower.monthlyNetIncome) dataGaps.push('Не указан подтверждённый ежемесячный доход для персональной оценки ипотеки.')
  if (!input.borrower.residenceCountry) dataGaps.push('Не указана страна налогового резидентства покупателя.')
  if (reason) dataGaps.push('Актуальные данные AI временно недоступны; показан проверяемый расчётный сценарий.')

  return {
    schemaVersion: '2.0',
    marketContext: {
      country: input.property.country,
      city: input.property.city,
      asOf: new Date().toISOString(),
      summary: reason
        ? 'Расчёт построен на параметрах пользователя без подтверждённого live-контекста рынка.'
        : 'Предварительный сценарный анализ выбранного рынка.',
      annualPriceGrowthPctRange: {
        min: assumptions.pessimistic.annualPriceGrowthPct,
        max: assumptions.optimistic.annualPriceGrowthPct,
      },
      annualRentalYieldPctRange: { min: 3.5, max: 7.5 },
      mortgageRatePctRange: { min: pct(rateMid - 0.5), max: pct(rateMid + 0.8) },
      vacancyRatePctRange: { min: 3, max: 12 },
    },
    mortgageEstimate: {
      status: input.borrower.monthlyNetIncome ? 'possible' : 'insufficient_data',
      confidence: input.borrower.monthlyNetIncome ? 0.62 : 0.38,
      loanAmountRange: { min: money(purchasePrice * 0.55), max: money(purchasePrice * 0.7) },
      recommendedDownPayment: money(purchasePrice * 0.3),
      interestRatePctRange: { min: pct(rateMid - 0.5), max: pct(rateMid + 0.8) },
      termYearsRange: { min: 20, max: 30 },
      monthlyPaymentRange: {
        min: money(monthlyPayment(purchasePrice * 0.55, Math.max(0.5, rateMid - 0.5), 30)),
        max: money(monthlyPayment(purchasePrice * 0.7, rateMid + 0.8, 20)),
      },
      estimatedLtvPct: pct(loanLtv),
      estimatedDebtToIncomePct: input.borrower.monthlyNetIncome
        ? pct(((monthlyMid + input.borrower.monthlyDebtPayments) / input.borrower.monthlyNetIncome) * 100)
        : null,
      approvalFactors: ['Размер первоначального взноса', 'Подтверждённый доход', 'Статус резидентства'],
      riskFactors: dataGaps.slice(0, 2),
      disclaimer: 'Предварительная аналитическая оценка. Окончательные условия и решение определяет банк.',
    },
    assumptions,
    scenarios,
    metrics: {
      totalInvestment: money(totalInvestment),
      netProfit: Math.round(netProfit),
      totalRoiPct: pct(totalRoiPct),
      annualizedReturnPct: pct(annualizedReturnPct),
      breakEvenYears: input.finance.annualRent > 0
        ? pct(totalInvestment / Math.max(1, input.finance.annualRent * 0.72))
        : 0,
      minimumAnnualRent: money((buyerCosts + input.property.renovationCost) / Math.max(1, input.goal.periodYears) + purchasePrice * 0.035),
      targetPurchasePrice: money(purchasePrice * 0.92),
    },
    verdict: {
      grade: totalRoiPct >= 35 ? 'strong' : totalRoiPct >= 5 ? 'balanced' : 'risky',
      score: clamp(Math.round(52 + annualizedReturnPct * 4), 18, 91),
      confidence: reason ? 0.45 : 0.72,
      headline: totalRoiPct >= 35
        ? 'Сильный потенциал при контроле расходов'
        : totalRoiPct >= 5
          ? 'Сбалансированная инвестиционная картина'
          : 'Запас прочности пока слишком мал',
      summary: 'Результат зависит прежде всего от цены входа, фактической аренды, вакантности и условий финансирования.',
    },
    strengths: [
      { title: 'Сценарный горизонт', explanation: `Прогноз учитывает ${input.goal.periodYears} лет владения и три режима рынка.` },
      { title: 'Контроль цены входа', explanation: `Ориентир для переговоров — около ${formatAmount(purchasePrice * 0.92, input.currency)}.` },
    ],
    risks: [
      { level: 'medium', title: 'Вакантность', explanation: 'Периоды без арендатора снижают денежный поток.', mitigation: 'Заложить резерв не менее нескольких месячных платежей.' },
      { level: 'medium', title: 'Ставка и одобрение', explanation: 'Финальная ставка зависит от профиля заёмщика и политики банка.', mitigation: 'Сравнить предварительные решения нескольких кредиторов.' },
    ],
    recommendations: [
      { priority: 1, title: 'Зафиксировать потолок цены', action: `Не выходить выше ${formatAmount(purchasePrice * 0.92, input.currency)} без подтверждения более высокой аренды.`, expectedEffect: 'Повышает запас прочности и потенциальную доходность.' },
      { priority: 2, title: 'Подтвердить аренду', action: 'Собрать минимум пять сравнимых актуальных предложений в том же районе.', expectedEffect: 'Снижает риск завышенного денежного потока.' },
      input.borrower.monthlyNetIncome
        ? { priority: 3, title: 'Сравнить решения банков', action: 'Запросить предварительные предложения минимум у двух кредиторов.', expectedEffect: 'Покажет реальный LTV, ставку и требования к документам.' }
        : { priority: 3, title: 'Получить банковский диапазон', action: 'Добавить доход, резидентство и текущие обязательства.', expectedEffect: 'Позволит уточнить LTV, ставку и ежемесячный платёж.' },
    ],
    dataGaps,
    sources: [],
    meta: {
      mode: reason ? 'deterministic_fallback' : 'hybrid',
      model: null,
      generatedAt: new Date().toISOString(),
      liveData: false,
      warning: reason || null,
    },
  }
}

const pointSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    year: { type: 'integer' },
    propertyValue: { type: 'number' },
    annualRent: { type: 'number' },
    vacancyRatePct: { type: 'number' },
    operatingCosts: { type: 'number' },
    mortgagePayment: { type: 'number' },
    mortgagePrincipalPaid: { type: 'number' },
    mortgageBalance: { type: 'number' },
    netCashFlow: { type: 'number' },
    cumulativeCashFlow: { type: 'number' },
    ownerEquity: { type: 'number' },
    confidenceLow: { type: 'number' },
    confidenceHigh: { type: 'number' },
  },
  required: ['year', 'propertyValue', 'annualRent', 'vacancyRatePct', 'operatingCosts', 'mortgagePayment', 'mortgagePrincipalPaid', 'mortgageBalance', 'netCashFlow', 'cumulativeCashFlow', 'ownerEquity', 'confidenceLow', 'confidenceHigh'],
}

const rangeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { min: { type: 'number' }, max: { type: 'number' } },
  required: ['min', 'max'],
}

const assumptionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    annualPriceGrowthPct: { type: 'number' },
    annualRentGrowthPct: { type: 'number' },
    vacancyRatePct: { type: 'number' },
    operatingExpensesPct: { type: 'number' },
    mortgageRatePct: { type: 'number' },
  },
  required: ['annualPriceGrowthPct', 'annualRentGrowthPct', 'vacancyRatePct', 'operatingExpensesPct', 'mortgageRatePct'],
}

const scenarioSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    yearlyPoints: { type: 'array', items: pointSchema },
  },
  required: ['summary', 'yearlyPoints'],
}

const investorAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schemaVersion: { type: 'string', enum: ['2.0'] },
    marketContext: {
      type: 'object',
      additionalProperties: false,
      properties: {
        country: { type: 'string' }, city: { type: 'string' }, asOf: { type: 'string' }, summary: { type: 'string' },
        annualPriceGrowthPctRange: rangeSchema, annualRentalYieldPctRange: rangeSchema,
        mortgageRatePctRange: rangeSchema, vacancyRatePctRange: rangeSchema,
      },
      required: ['country', 'city', 'asOf', 'summary', 'annualPriceGrowthPctRange', 'annualRentalYieldPctRange', 'mortgageRatePctRange', 'vacancyRatePctRange'],
    },
    mortgageEstimate: {
      type: 'object', additionalProperties: false,
      properties: {
        status: { type: 'string', enum: ['likely', 'possible', 'unlikely', 'insufficient_data'] },
        confidence: { type: 'number' }, loanAmountRange: rangeSchema,
        recommendedDownPayment: { type: 'number' }, interestRatePctRange: rangeSchema,
        termYearsRange: rangeSchema, monthlyPaymentRange: rangeSchema,
        estimatedLtvPct: { type: 'number' }, estimatedDebtToIncomePct: { type: ['number', 'null'] },
        approvalFactors: { type: 'array', items: { type: 'string' } },
        riskFactors: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
      },
      required: ['status', 'confidence', 'loanAmountRange', 'recommendedDownPayment', 'interestRatePctRange', 'termYearsRange', 'monthlyPaymentRange', 'estimatedLtvPct', 'estimatedDebtToIncomePct', 'approvalFactors', 'riskFactors', 'disclaimer'],
    },
    assumptions: {
      type: 'object', additionalProperties: false,
      properties: { pessimistic: assumptionSchema, base: assumptionSchema, optimistic: assumptionSchema },
      required: ['pessimistic', 'base', 'optimistic'],
    },
    scenarios: {
      type: 'object', additionalProperties: false,
      properties: { pessimistic: scenarioSchema, base: scenarioSchema, optimistic: scenarioSchema },
      required: ['pessimistic', 'base', 'optimistic'],
    },
    metrics: {
      type: 'object', additionalProperties: false,
      properties: {
        totalInvestment: { type: 'number' }, netProfit: { type: 'number' }, totalRoiPct: { type: 'number' },
        annualizedReturnPct: { type: 'number' }, breakEvenYears: { type: 'number' },
        minimumAnnualRent: { type: 'number' }, targetPurchasePrice: { type: 'number' },
      },
      required: ['totalInvestment', 'netProfit', 'totalRoiPct', 'annualizedReturnPct', 'breakEvenYears', 'minimumAnnualRent', 'targetPurchasePrice'],
    },
    verdict: {
      type: 'object', additionalProperties: false,
      properties: {
        grade: { type: 'string', enum: ['strong', 'balanced', 'risky', 'insufficient_data'] },
        score: { type: 'number' }, confidence: { type: 'number' }, headline: { type: 'string' }, summary: { type: 'string' },
      },
      required: ['grade', 'score', 'confidence', 'headline', 'summary'],
    },
    strengths: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: { title: { type: 'string' }, explanation: { type: 'string' } },
        required: ['title', 'explanation'],
      },
    },
    risks: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: { level: { type: 'string', enum: ['low', 'medium', 'high'] }, title: { type: 'string' }, explanation: { type: 'string' }, mitigation: { type: 'string' } },
        required: ['level', 'title', 'explanation', 'mitigation'],
      },
    },
    recommendations: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: { priority: { type: 'integer' }, title: { type: 'string' }, action: { type: 'string' }, expectedEffect: { type: 'string' } },
        required: ['priority', 'title', 'action', 'expectedEffect'],
      },
    },
    dataGaps: { type: 'array', items: { type: 'string' } },
    sources: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          id: { type: 'string' }, title: { type: 'string' }, url: { type: 'string' }, publisher: { type: 'string' },
          publishedAt: { type: 'string' }, retrievedAt: { type: 'string' }, country: { type: 'string' },
          reliability: { type: 'string', enum: ['official', 'lender', 'marketplace', 'secondary'] },
        },
        required: ['id', 'title', 'url', 'publisher', 'publishedAt', 'retrievedAt', 'country', 'reliability'],
      },
    },
  },
  required: ['schemaVersion', 'marketContext', 'mortgageEstimate', 'assumptions', 'scenarios', 'metrics', 'verdict', 'strengths', 'risks', 'recommendations', 'dataGaps', 'sources'],
}

function mergePoint(aiPoint, fallbackPoint) {
  if (!aiPoint || num(aiPoint.year) !== num(fallbackPoint.year)) return fallbackPoint
  const next = {}
  for (const key of Object.keys(fallbackPoint)) {
    const value = num(aiPoint[key], fallbackPoint[key])
    next[key] = key === 'year' ? Math.round(value) : Math.round(value * 100) / 100
  }
  next.propertyValue = Math.max(0, next.propertyValue)
  next.annualRent = Math.max(0, next.annualRent)
  next.vacancyRatePct = clamp(next.vacancyRatePct, 0, 60)
  next.operatingCosts = Math.max(0, next.operatingCosts)
  next.mortgagePayment = Math.max(0, next.mortgagePayment)
  next.mortgagePrincipalPaid = Math.max(0, next.mortgagePrincipalPaid)
  next.mortgageBalance = Math.max(0, next.mortgageBalance)
  next.ownerEquity = Math.max(0, next.propertyValue - next.mortgageBalance)
  next.confidenceLow = Math.min(next.propertyValue, Math.max(0, next.confidenceLow))
  next.confidenceHigh = Math.max(next.propertyValue, next.confidenceHigh)
  return next
}

function normalizeAnalysis(ai, fallback, model) {
  if (!ai || typeof ai !== 'object') throw new Error('AI analysis is empty')
  const normalized = structuredClone(fallback)
  const safeObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  Object.assign(normalized.marketContext, safeObject(ai.marketContext))
  Object.assign(normalized.mortgageEstimate, safeObject(ai.mortgageEstimate))
  Object.assign(normalized.metrics, safeObject(ai.metrics))
  Object.assign(normalized.verdict, safeObject(ai.verdict))

  for (const key of ['pessimistic', 'base', 'optimistic']) {
    Object.assign(normalized.assumptions[key], safeObject(ai.assumptions?.[key]))
    const aiScenario = safeObject(ai.scenarios?.[key])
    if (typeof aiScenario.summary === 'string' && aiScenario.summary.trim()) {
      normalized.scenarios[key].summary = aiScenario.summary.trim().slice(0, 600)
    }
    const byYear = new Map((Array.isArray(aiScenario.yearlyPoints) ? aiScenario.yearlyPoints : []).map((point) => [Math.round(num(point?.year)), point]))
    normalized.scenarios[key].yearlyPoints = fallback.scenarios[key].yearlyPoints.map((point) => mergePoint(byYear.get(point.year), point))
  }

  normalized.strengths = Array.isArray(ai.strengths) && ai.strengths.length ? ai.strengths.slice(0, 5) : fallback.strengths
  normalized.risks = Array.isArray(ai.risks) && ai.risks.length ? ai.risks.slice(0, 6) : fallback.risks
  normalized.recommendations = Array.isArray(ai.recommendations) && ai.recommendations.length ? ai.recommendations.slice(0, 6) : fallback.recommendations
  normalized.dataGaps = Array.isArray(ai.dataGaps) ? ai.dataGaps.slice(0, 8) : fallback.dataGaps
  normalized.sources = Array.isArray(ai.sources)
    ? ai.sources.filter((source) => /^https?:\/\//i.test(String(source?.url || ''))).slice(0, 12)
    : []
  normalized.verdict.score = clamp(normalized.verdict.score, 0, 100)
  normalized.verdict.confidence = clamp(normalized.verdict.confidence, 0, 1)
  normalized.mortgageEstimate.confidence = clamp(normalized.mortgageEstimate.confidence, 0, 1)
  normalized.meta = {
    mode: 'ai_live',
    model,
    generatedAt: new Date().toISOString(),
    liveData: normalized.sources.length > 0,
    warning: null,
  }
  return normalized
}

function promptFor(input, fallback) {
  const years = sampleYears(input.goal.periodYears)
  return `Ты — осторожный аналитик инвестиций в жилую недвижимость. Выполни актуальный поиск по официальным статистическим источникам, центральным банкам, официальным страницам банков и крупным площадкам недвижимости для ${input.property.city}, ${input.property.country}. Сегодня ${new Date().toISOString().slice(0, 10)}.

Верни только JSON по заданной схеме. Построй три сценария и обязательно верни yearlyPoints строго для лет: ${years.join(', ')}. Значения графиков должны быть числовыми и внутренне согласованными. Ипотека — только предварительный диапазон, не обещание одобрения. Если данных заёмщика недостаточно, status=insufficient_data и перечисли недостающие данные. Не выдумывай источники: sources содержит только реально найденные URL. Все тексты — на русском языке.

Вход пользователя:
${JSON.stringify(input)}

Расчётная опора сервера (её можно осторожно уточнить на основе свежих источников):
${JSON.stringify({ assumptions: fallback.assumptions, scenarios: fallback.scenarios, metrics: fallback.metrics, mortgageEstimate: fallback.mortgageEstimate })}`
}

export function getInvestorAiFallback(rawInput, reason = '') {
  const input = sanitizeInput(rawInput)
  return buildFallback(input, reason)
}

export async function analyzeInvestorScenario(rawInput) {
  const input = sanitizeInput(rawInput)
  if (input.property.price <= 0) throw new Error('Цена объекта должна быть больше нуля')
  const fallback = buildFallback(input)
  const cacheKey = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex')
  const cached = analysisCache.get(cacheKey)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return { ...cached.value, meta: { ...cached.value.meta, cached: true } }

  const model = process.env.INVESTOR_AI_MODEL || process.env.AI_CHAT_MODEL || DEFAULT_MODEL
  try {
    const completion = await postChatCompletions({
      model,
      messages: [
        {
          role: 'system',
          content: 'Return a conservative, source-grounded real-estate investment analysis. Never promise mortgage approval or guaranteed returns.',
        },
        { role: 'user', content: promptFor(input, fallback) },
      ],
      temperature: 0.15,
      max_tokens: 11000,
      reasoning: { effort: 'low', exclude: true },
      tools: [
        {
          type: 'openrouter:web_search',
          parameters: { engine: 'auto', max_results: 5, max_total_results: 10 },
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'investor_analysis_v2',
          strict: true,
          schema: investorAnalysisSchema,
        },
      },
      provider: {
        allow_fallbacks: true,
        require_parameters: true,
        data_collection: 'deny',
      },
    }, { timeoutMs: 180000 })

    const rawContent = completion?.choices?.[0]?.message?.content
    const parsed = typeof rawContent === 'string' ? parseLooseJson(rawContent) : rawContent
    const result = normalizeAnalysis(parsed, fallback, model)
    analysisCache.set(cacheKey, { createdAt: Date.now(), value: result })
    if (analysisCache.size > 40) analysisCache.delete(analysisCache.keys().next().value)
    return result
  } catch (error) {
    console.error('[investor-ai] live analysis failed:', error?.message || error)
    return buildFallback(input, String(error?.message || error).slice(0, 240))
  }
}
