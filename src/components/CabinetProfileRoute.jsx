import { Navigate } from 'react-router-dom'
import { getCabinetHomePath, isSellerCabinetRole } from '../utils/cabinetRoutes'
import TestPage from '../pages/TestPage'

/** /profile — кабинет покупателя; продавцов перенаправляем в /owner. */
export default function CabinetProfileRoute() {
  if (isSellerCabinetRole()) {
    return <Navigate to={getCabinetHomePath()} replace />
  }

  return <TestPage />
}
