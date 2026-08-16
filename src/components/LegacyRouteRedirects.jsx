import { Navigate, useLocation, useSearchParams } from 'react-router-dom'

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

/** Устаревшая /history → лист истории в кабинете покупателя. */
export function LegacyHistoryRedirect() {
  return <Navigate to="/profile?history=1" replace />
}

/** Устаревшая /profile/bookings → лист бронирований в кабинете. */
export function LegacyBookingsRedirect() {
  const [params] = useSearchParams()
  const booking = params.get('booking')
  const search = new URLSearchParams({ bookings: '1' })
  if (booking) search.set('booking', booking)
  return <Navigate to={`/profile?${search.toString()}`} replace />
}

/** Устаревшая тестовая /jeton → главная. */
export function LegacyJetonRedirect() {
  return <Navigate to="/" replace />
}
