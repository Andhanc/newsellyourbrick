import { isAuthenticated, getUserData } from '../services/authService'
import { isSellerCabinetRole, readStoredUserRole } from './cabinetRoutes'

/** Плавающий депозит — только для авторизованных покупателей. */
export function canShowBuyerDeposit() {
  const userData = getUserData()
  if (!isAuthenticated() && !userData?.isLoggedIn) return false

  const role = readStoredUserRole()
  if (role === 'admin' || isSellerCabinetRole(role)) return false

  return role === 'buyer' || role === 'client'
}
