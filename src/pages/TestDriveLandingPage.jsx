import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PropertyListingCard from '../components/PropertyListingCard'
import PageBreadcrumbs from '../components/PageBreadcrumbs'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getPropertyCardImage } from '../utils/propertyImage'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { getPropertyTestDrivePath } from '../utils/propertyDetailUrl'
import { publicAsset } from '../utils/publicAsset'
import './TestDriveLandingPage.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const HERO_IMAGE = publicAsset('images/property-detail/property-test-drive-promo.png')

const TestDriveLandingPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/properties/test-drive`)
        const json = await (res.ok ? res.json() : { success: false, data: [] })
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setProperties(
            json.data.map((p) => {
              const image = getPropertyCardImage(p)
              return formatPropertyForListingCard({
                ...p,
                image,
                images: image ? [image] : [],
                title: p.title || p.name || '',
              })
            }),
          )
        } else if (!cancelled) {
          setProperties([])
        }
      } catch {
        if (!cancelled) setProperties([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const openTestDrive = (property) => {
    if (!ensureCanOpenProperty()) return
    navigate(getPropertyTestDrivePath(property), { state: { property } })
  }

  const listingCountLabel = useMemo(() => {
    if (loading) return t('loading')
    if (!properties.length) return t('testDrivePageEmpty')
    return t('testDrivePageCount', { count: properties.length })
  }, [loading, properties.length, t])

  return (
    <div className="test-drive-landing">
      <Header />
      <main className="test-drive-landing__main">
        <div className="test-drive-landing__container">
          <PageBreadcrumbs />
          <header className="test-drive-landing__hero">
            <div className="test-drive-landing__hero-copy">
              <p className="test-drive-landing__eyebrow">{t('testDrive')}</p>
              <h1 className="test-drive-landing__title">{t('testDrivePageTitle')}</h1>
              <p className="test-drive-landing__lead">{t('testDrivePageLead')}</p>
              <p className="test-drive-landing__meta">{listingCountLabel}</p>
            </div>
            <div className="test-drive-landing__hero-visual" aria-hidden>
              <img src={HERO_IMAGE} alt="" className="test-drive-landing__hero-image" />
            </div>
          </header>

          {loading ? (
            <p className="test-drive-landing__status">{t('loading')}</p>
          ) : properties.length === 0 ? (
            <p className="test-drive-landing__status">{t('testDrivePageEmpty')}</p>
          ) : (
            <div className="properties-grid property-listing-grid test-drive-landing__grid">
              {properties.map((property) => (
                <PropertyListingCard
                  key={`${property.property_type}-${property.id}`}
                  property={property}
                  href={getPropertyTestDrivePath(property)}
                  onOpen={openTestDrive}
                  showActions={false}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default TestDriveLandingPage
