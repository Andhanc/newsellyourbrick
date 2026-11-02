import { Navigate } from 'react-router-dom'
import { getCabinetHomePath, isSellerCabinetRole } from '../utils/cabinetRoutes'
import TestPage from '../pages/TestPage'
import RoleSwitchArrival from './RoleSwitchArrival'

/** /profile — кабинет покупателя; продавцов перенаправляем в /owner-test. */
export default function CabinetProfileRoute() {
  if (isSellerCabinetRole()) {
    return <Navigate to={getCabinetHomePath()} replace />
  }

  return (
    <RoleSwitchArrival role="buyer">
      <TestPage />
    </RoleSwitchArrival>
  )
}
