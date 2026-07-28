import { Navigate, useLocation } from 'react-router-dom'

const OWNER_CABINET_HOME_PATH = '/owner-test'

/** Устаревший /owner → актуальный кабинет продавца. */
export function LegacyOwnerCabinetRedirect() {
  const location = useLocation()
  return (
    <Navigate
      to={{
        pathname: OWNER_CABINET_HOME_PATH,
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
