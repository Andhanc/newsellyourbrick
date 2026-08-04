import { getApiBaseUrlSync } from '../utils/apiConfig'

export async function requestInvestorAiAnalysis(payload, { signal } = {}) {
  const response = await fetch(`${getApiBaseUrlSync()}/investment/ai-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal,
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.success || !data?.analysis) {
    throw new Error(data?.detail || `Не удалось выполнить AI-анализ (${response.status})`)
  }
  return data.analysis
}

