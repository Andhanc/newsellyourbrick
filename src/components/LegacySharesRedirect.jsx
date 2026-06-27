import { Navigate, useParams } from 'react-router-dom'
import { CO_INVESTMENT_PATH } from '../utils/sectionRoutes'

/** 301 на клиенте: /shares → /co-investment, /shares/:id → /co-investment/:id */
export function LegacySharesIndexRedirect() {
  return <Navigate to={CO_INVESTMENT_PATH} replace />
}

export function LegacySharesDetailRedirect() {
  const { slugOrId } = useParams()
  const target = slugOrId ? `${CO_INVESTMENT_PATH}/${slugOrId}` : CO_INVESTMENT_PATH
  return <Navigate to={target} replace />
}
