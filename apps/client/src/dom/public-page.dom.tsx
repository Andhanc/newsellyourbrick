'use dom'

import './storage-polyfill'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import '../legacy/i18n/config'
import '../legacy/App.css'
import '../legacy/styles/buyer-mobile-tokens.css'
import '../legacy/styles/drawerDismiss.css'
import './legacy-public-shell.css'

import MobileDiscoverPage from '../legacy/pages/MobileDiscoverPage'
import Home from '../legacy/pages/Home'
import Shares from '../legacy/pages/Shares'
import Debts from '../legacy/pages/Debts'
import TestDriveLandingPage from '../legacy/pages/TestDriveLandingPage'
import About from '../legacy/pages/About'
import BuyerPage from '../legacy/pages/BuyerPage'
import SellerPage from '../legacy/pages/SellerPage'
import Footer from '../legacy/components/Footer'
import { PropertyFavoritesProvider } from '../legacy/context/PropertyFavoritesContext'

type PublicPageProps = {
  initialPath: string
  dom?: import('expo/dom').DOMProps
}

function PublicRoutes() {
  const location = useLocation()
  const isDiscover = location.pathname === '/'

  return (
    <PropertyFavoritesProvider>
      <div className="expo-public-page app-root-fill">
        <div className="app-shell">
          <main className={`app-layout${isDiscover ? ' app-layout--mobile-discover' : ''}`}>
            <div className="app-layout__content">
              <Routes>
                <Route path="/" element={<MobileDiscoverPage />} />
                <Route path="/auction" element={<Home />} />
                <Route path="/co-investment" element={<Shares />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/test-drive" element={<TestDriveLandingPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/buyer" element={<BuyerPage />} />
                <Route path="/seller" element={<SellerPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
          {!isDiscover ? <Footer /> : null}
        </div>
      </div>
    </PropertyFavoritesProvider>
  )
}

export default function PublicPage({ initialPath }: PublicPageProps) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <PublicRoutes />
    </MemoryRouter>
  )
}
