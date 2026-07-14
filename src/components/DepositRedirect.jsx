import { Navigate, useLocation } from 'react-router-dom'
import { getCabinetWalletPath } from '../utils/cabinetRoutes'

/** /deposit — редирект в кошелёк по роли без потери результата Stripe и return-контекста. */
export default function DepositRedirect() {
  const location = useLocation()

  return (
    <Navigate
      to={{ pathname: getCabinetWalletPath(), search: location.search }}
      state={location.state}
      replace
    />
  )
}
