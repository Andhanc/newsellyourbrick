import { Navigate, useLocation } from 'react-router-dom'
import { getUserData } from '../services/authService'
import { getCabinetSubscriptionsPath } from '../utils/cabinetRoutes'

/**
 * /subscriptions для авторизованных пользователей — устаревший маршрут;
 * ведём в раздел «Подписки» личного кабинета (покупатель или продавец).
 * Гостям оставляем публичную страницу тарифов.
 */
export default function CabinetSubscriptionsRedirect({ children }) {
  const location = useLocation()
  const userData = getUserData()
  const userId = userData?.id || localStorage.getItem('userId')

  if (!userId) return children

  const params = new URLSearchParams(location.search)
  if (params.get('checkout') === 'success' && params.get('session_id')) {
    return children
  }

  const target = getCabinetSubscriptionsPath()
  const hash = location.hash || ''
  return <Navigate to={`${target}${hash}`} replace />
}
