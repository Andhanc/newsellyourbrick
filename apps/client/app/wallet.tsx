import { PublicPageScreen } from '../src/dom/public-page-screen'
import { useLegacyRoutePath } from '../src/routing/use-legacy-route-path'

export default function WalletRoute() {
  return <PublicPageScreen initialPath={useLegacyRoutePath('/wallet')} />
}
