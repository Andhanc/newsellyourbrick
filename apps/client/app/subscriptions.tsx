import { PublicPageScreen } from '../src/dom/public-page-screen'
import { useLegacyRoutePath } from '../src/routing/use-legacy-route-path'

export default function SubscriptionsRoute() {
  return <PublicPageScreen initialPath={useLegacyRoutePath('/subscriptions')} />
}
