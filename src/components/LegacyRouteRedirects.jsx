import { Navigate, useLocation } from 'react-router-dom'
import { NEW_OWNER_CABINET_HOME_PATH } from '../utils/ownerTestProfile'

/** Устаревший /owner → актуальный кабинет продавца. */
export function LegacyOwnerCabinetRedirect() {
  const location = useLocation()
  return (
    <Navigate
      to={{
        pathname: NEW_OWNER_CABINET_HOME_PATH,
        search: location.search,
        hash: location.hash,
      }}
      replace
    />
  )
}

/** Устаревший /profile-legacy → /profile. */
export function LegacyProfileRedirect() {
  const location = useLocation()
  return (
    <Navigate
      to={{
        pathname: '/profile',
        search: location.search,
        hash: location.hash,
      }}
      replace
    />
  )
}

/** Устаревшая тестовая /jeton → главная. */
export function LegacyJetonRedirect() {
  return <Navigate to="/" replace />
}
