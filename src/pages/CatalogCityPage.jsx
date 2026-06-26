import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PropertyListingCard from '../components/PropertyListingCard'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getApiBaseUrl } from '../utils/apiConfig'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { getCoInvestmentDetailPath, CO_INVESTMENT_PATH } from '../utils/sectionRoutes'
import {
  CATALOG_SALE_TABS,
  CATALOG_TYPE_PLURALS,
  isCatalogCountrySegment,
  parseCatalogRouteParams,
} from '../utils/catalogGeoUrl'
import CatalogCityInternalLinks from '../components/CatalogCityInternalLinks'
import { getCanonicalRegionLabel, matchCountryKey, getCountryLabel } from '../utils/propertySearchLocation'
import { usePageSeoOverride } from '../context/PageSeoContext'
import NotFoundPage from '../components/NotFoundPage'
import { buildCatalogPageSeo } from '../utils/pageSeoBuilders'
import './CatalogCityPage.css'

const API_BASE_FALLBACK = import.meta.env.VITE_API_BASE_URL || '/api'

const CATALOG_TYPE_I18N = {
  apartments: 'oap_propertyTypeApartments',
  villas: 'propertyTypeVilla',
  houses: 'propertyTypeHouse',
  commercial: 'propertyTypeCommercial',
}

function isShareListing(property) {
  return (
    property?.is_shared_ownership === 1 ||
    property?.is_shared_ownership === true ||
    property?.sale_type === 'share'
  )
}

const CatalogCityPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const route = parseCatalogRouteParams(params)

  const sale = useMemo(() => {
    const raw = String(searchParams.get('sale') || 'all').toLowerCase()
    return CATALOG_SALE_TABS.includes(raw) ? raw : 'all'
  }, [searchParams])

  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState([])
  const [cityLabel, setCityLabel] = useState(route.city)
  const [notFound, setNotFound] = useState(false)

  const countryValid = isCatalogCountrySegment(route.country)
  const typeValid = !route.typePlural || Boolean(CATALOG_TYPE_PLURALS[route.typePlural])

  useEffect(() => {
    if (!countryValid || !typeValid) return undefined
    let cancelled = false
    setNotFound(false)
    ;(async () => {
      try {
        setLoading(true)
        const base = await getApiBaseUrl()
        const typeSeg = route.typePlural ? `/${route.typePlural}` : ''
        const qs = sale !== 'all' ? `?sale=${encodeURIComponent(sale)}` : ''
        const res = await fetch(
          `${base || API_BASE_FALLBACK}/catalog/${route.country}/${route.city}${typeSeg}${qs}`,
        )
        if (res.status === 404) {
          if (!cancelled) setNotFound(true)
          return
        }
        const json = await res.json()
        if (cancelled) return
        if (!json.success) {
          setNotFound(true)
          setProperties([])
          return
        }
        const rows = (json.data?.properties || []).map((p) => formatPropertyForListingCard(p))
        setProperties(rows)
        setCityLabel(json.data?.cityLabel || getCanonicalRegionLabel(route.city, route.city))
      } catch (err) {
        console.error('catalog city load', err)
        if (!cancelled) setProperties([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [countryValid, typeValid, route.country, route.city, route.typePlural, sale])

  const catalogSeo = useMemo(() => {
    if (!countryValid || !typeValid) return null
    return buildCatalogPageSeo(
      {
        country: route.country,
        city: route.city,
        typePlural: route.typePlural,
        sale,
        cityLabel,
      },
      t,
    )
  }, [countryValid, typeValid, route.country, route.city, route.typePlural, sale, cityLabel, t])
  usePageSeoOverride(catalogSeo)

  const countryLabel = useMemo(() => {
    const key = matchCountryKey(route.country) || route.country
    return getCountryLabel(key, route.country)
  }, [route.country])

  const openProperty = (property) => {
    if (!ensureCanOpenProperty()) return
    if (isShareListing(property)) {
      navigate(getCoInvestmentDetailPath(property), { state: { shareObject: property } })
      return
    }
    const { pathname, state } = buildPropertyDetailNavigation(property)
    navigate(pathname, { state })
  }

  if (!countryValid || !typeValid || notFound) {
    return <NotFoundPage />
  }

  const typeTabs = Object.keys(CATALOG_TYPE_PLURALS)
  const basePath = `/${route.country}/${route.city}`
  const listingPath = route.typePlural ? `${basePath}/${route.typePlural}` : basePath
  const saleQuery = (tab) => (tab !== 'all' ? `?sale=${tab}` : '')

  return (
    <div className="catalog-city-page">
      <Header />
      <main className="catalog-city">
        <div className="catalog-city__container">
          <nav className="catalog-city__breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">{t('home')}</Link>
            <span aria-hidden>/</span>
            <Link to={basePath}>{countryLabel}</Link>
            <span aria-hidden>/</span>
            <Link to={basePath}>{cityLabel}</Link>
            {route.typePlural ? (
              <>
                <span aria-hidden>/</span>
                <span>
                  {CATALOG_TYPE_I18N[route.typePlural]
                    ? t(CATALOG_TYPE_I18N[route.typePlural])
                    : route.typePlural}
                </span>
              </>
            ) : null}
          </nav>

          <h1 className="catalog-city__title">
            {cityLabel}
            {route.typePlural
              ? ` — ${CATALOG_TYPE_I18N[route.typePlural] ? t(CATALOG_TYPE_I18N[route.typePlural]) : route.typePlural}`
              : ''}
          </h1>

          <div className="catalog-city__tabs" role="tablist" aria-label={t('propertyType')}>
            <Link
              to={basePath + (sale !== 'all' ? `?sale=${sale}` : '')}
              className={`catalog-city__tab${!route.typePlural ? ' catalog-city__tab--active' : ''}`}
            >
              {t('propertyTypeAll')}
            </Link>
            {typeTabs.map((typeKey) => (
              <Link
                key={typeKey}
                to={`${basePath}/${typeKey}${sale !== 'all' ? `?sale=${sale}` : ''}`}
                className={`catalog-city__tab${route.typePlural === typeKey ? ' catalog-city__tab--active' : ''}`}
              >
                {CATALOG_TYPE_I18N[typeKey] ? t(CATALOG_TYPE_I18N[typeKey]) : typeKey}
              </Link>
            ))}
          </div>

          <div className="catalog-city__tabs catalog-city__tabs--sale" role="tablist" aria-label="Sale type">
            {CATALOG_SALE_TABS.map((tab) => (
              <Link
                key={tab}
                to={`${listingPath}${saleQuery(tab)}`}
                role="tab"
                aria-selected={sale === tab}
                className={`catalog-city__tab${sale === tab ? ' catalog-city__tab--active' : ''}`}
              >
                {tab === 'all'
                  ? t('propertyTypeAll')
                  : tab === 'auction'
                    ? t('auction')
                    : tab === 'co-investment'
                      ? t('coInvestment')
                      : t('debtsTitle')}
              </Link>
            ))}
          </div>

          {loading ? (
            <p className="catalog-city__status">{t('loading')}</p>
          ) : properties.length === 0 ? (
            <p className="catalog-city__status">{t('searchResultsEmpty')}</p>
          ) : (
            <div className="properties-grid property-listing-grid catalog-city__grid">
              {properties.map((property) => (
                <PropertyListingCard
                  key={`${property.property_type}-${property.id}`}
                  property={property}
                  onOpen={openProperty}
                  showActions={false}
                />
              ))}
            </div>
          )}

          <CatalogCityInternalLinks
            country={route.country}
            city={route.city}
            typePlural={route.typePlural}
            cityLabel={cityLabel}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default CatalogCityPage
