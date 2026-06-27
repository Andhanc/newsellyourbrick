import { Navigate } from 'react-router-dom'
import { getCabinetWalletPath } from '../utils/cabinetRoutes'

/** /deposit — редирект в кошелёк по роли (покупатель / продавец). */
export default function DepositRedirect() {
  return <Navigate to={getCabinetWalletPath()} replace />
}
