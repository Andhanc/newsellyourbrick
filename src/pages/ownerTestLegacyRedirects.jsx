import { Navigate, useLocation, useParams } from 'react-router-dom'
import { OWNER_VIEWS, ownerTestHref } from '../utils/ownerTestNav'

export function OwnerTestLegacyRedirect({ view = OWNER_VIEWS.HOME, propertyId, tab, highlight }) {
  return <Navigate to={ownerTestHref(view, { propertyId, tab, highlight })} replace />
}

export function OwnerTestLegacyRedirectWrapper() {
  const { propertyId } = useParams()
  return (
    <OwnerTestLegacyRedirect
      view={OWNER_VIEWS.PROPERTY_ANALYTICS}
      propertyId={propertyId}
    />
  )
}

export function OwnerTestLegacyProfileRedirect() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  return (
    <OwnerTestLegacyRedirect
      view={OWNER_VIEWS.PROFILE}
      tab={params.get('tab') || undefined}
      highlight={params.get('highlight') || undefined}
    />
  )
}
