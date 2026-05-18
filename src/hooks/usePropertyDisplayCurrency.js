import { useState, useEffect, useCallback, useMemo } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'
import {
  getCurrencySymbol,
  normalizeCurrencyCode,
  QUICK_LISTING_CURRENCY_CODES,
  PROPERTY_CURRENCIES,
} from '../utils/currency'

export const PROPERTY_DISPLAY_CURRENCY_OPTIONS = PROPERTY_CURRENCIES.filter((c) =>
  QUICK_LISTING_CURRENCY_CODES.includes(c.code),
)

export function usePropertyDisplayCurrency(listingCurrency) {
  const baseCurrency = normalizeCurrencyCode(listingCurrency)
  const [displayCurrency, setDisplayCurrency] = useState(baseCurrency)
  const [rate, setRate] = useState(1)
  const [loading, setLoading] = useState(false)
  const [rateError, setRateError] = useState(null)

  useEffect(() => {
    setDisplayCurrency(baseCurrency)
    setRate(1)
    setRateError(null)
  }, [baseCurrency])

  useEffect(() => {
    if (displayCurrency === baseCurrency) {
      setRate(1)
      setRateError(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setRateError(null)

    ;(async () => {
      try {
        const API_BASE_URL = await getApiBaseUrl()
        const params = new URLSearchParams({
          from: baseCurrency.toLowerCase(),
          to: displayCurrency.toLowerCase(),
          amount: '1',
        })
        const resp = await fetch(`${API_BASE_URL}/billing/fx/convert?${params.toString()}`)
        const data = await resp.json().catch(() => ({}))
        if (cancelled) return
        if (!resp.ok || !data?.success) {
          throw new Error(data?.error || 'fx_error')
        }
        const nextRate = Number(data?.data?.rate)
        if (!Number.isFinite(nextRate) || nextRate <= 0) {
          throw new Error('invalid_rate')
        }
        setRate(nextRate)
      } catch (err) {
        if (!cancelled) {
          setRateError(err?.message || 'fx_error')
          setRate(1)
          setDisplayCurrency(baseCurrency)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [displayCurrency, baseCurrency])

  const convert = useCallback(
    (amount) => {
      const n = Number(amount)
      if (!Number.isFinite(n)) return null
      if (displayCurrency === baseCurrency) return n
      return n * rate
    },
    [displayCurrency, baseCurrency, rate],
  )

  const formatMoney = useCallback(
    (amount, locale = 'ru-RU') => {
      const n = Number(amount)
      if (!Number.isFinite(n)) return '—'

      const converted = displayCurrency === baseCurrency ? n : n * rate
      const sym = getCurrencySymbol(displayCurrency)

      const hasFraction = Math.abs(converted % 1) > 1e-9
      const fractionDigits =
        displayCurrency !== baseCurrency ? 2 : hasFraction ? 2 : 0

      const formatted = converted.toLocaleString(locale, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      })
      return `${sym}${formatted}`
    },
    [displayCurrency, baseCurrency, rate],
  )

  const isConverted = displayCurrency !== baseCurrency

  const options = useMemo(() => PROPERTY_DISPLAY_CURRENCY_OPTIONS, [])

  return {
    baseCurrency,
    displayCurrency,
    setDisplayCurrency,
    symbol: getCurrencySymbol(displayCurrency),
    baseSymbol: getCurrencySymbol(baseCurrency),
    convert,
    formatMoney,
    isConverted,
    loading,
    rateError,
    options,
  }
}
