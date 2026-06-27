import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import { SharesPageIntroHead, SharesPageBanner } from '../components/SharesPageIntro'
import SharesListingToolbar from '../components/SharesListingToolbar'
import SharesPropertyCard, { SharesPropertyCardSkeleton } from '../components/SharesPropertyCard'
import SharesListingPagination from '../components/SharesListingPagination'
import { fetchUserDeposit } from '../utils/depositApi'
import { fetchNumericDbUserIdForApi, getStoredNumericUserId } from '../services/authService'
import { publicAsset } from '../utils/publicAsset'
import './Shares.css'
import '../components/SharesListing.css'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import {
  EMPTY_SHARES_FILTERS,
  applySharesPageFilters,
} from '../utils/sharesPageFilters'
import {
  SHARES_PAGE_SIZE,
  getMinimumShareInvestment,
  getSharesCategoryTabCounts,
  getSharesPlatformStats,
  getSharesFilterOptions,
  mapSharesFromApiResponse,
  matchesShareCategoryTab,
  paginateShares,
  sortShares,
} from '../utils/sharesListing'
import { buildCatalogCityPath } from '../utils/catalogGeoUrl'
import { getCoInvestmentContextPropertyPath } from '../utils/listingContextUrl'

const SiteChatDockLazy = lazy(() => import('../components/SiteChatDock'))
const SharesPageSidebarLazy = lazy(() => import('../components/SharesPageSidebar'))

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const SHARE_CARD_FALLBACK = publicAsset('images/external/shares-hero-villa.jpg')

const Shares = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [sharesFilters, setSharesFilters] = useState(EMPTY_SHARES_FILTERS)
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortKey, setSortKey] = useState('popularity')
  const [currentPage, setCurrentPage] = useState(1)
  const [apiShares, setApiShares] = useState([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const [userDeposit, setUserDeposit] = useState(0)
  const [depositLoading, setDepositLoading] = useState(() => Boolean(getStoredNumericUserId()))
  const [showChatDock, setShowChatDock] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    const revealChat = () => setShowChatDock(true)
    const revealSidebar = () => setShowSidebar(true)
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const chatId = window.requestIdleCallback(revealChat, { timeout: 4500 })
      const sidebarId = window.requestIdleCallback(revealSidebar, { timeout: 3500 })
      return () => {
        window.cancelIdleCallback(chatId)
        window.cancelIdleCallback(sidebarId)
      }
    }
    const chatT = window.setTimeout(revealChat, 1500)
    const sidebarT = window.setTimeout(revealSidebar, 900)
    return () => {
      window.clearTimeout(chatT)
      window.clearTimeout(sidebarT)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
      if (!cancelled && id) setDbUserId(id)
    }

    const schedule =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? () => window.requestIdleCallback(() => void run(), { timeout: 6000 })
        : () => window.setTimeout(() => void run(), 1800)

    const handle = schedule()
    return () => {
      cancelled = true
      if (typeof handle === 'number') {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.cancelIdleCallback(handle)
        } else if (typeof window !== 'undefined') {
          window.clearTimeout(handle)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!dbUserId) {
      setDepositLoading(false)
      return undefined
    }

    let cancelled = false
    setDepositLoading(true)

    const run = async () => {
      try {
        const deposit = await fetchUserDeposit(API_BASE, dbUserId, { ttlMs: 15000 })
        if (
          !cancelled &&
          deposit &&
          typeof deposit.depositAmount === 'number'
        ) {
          setUserDeposit(deposit.depositAmount || 0)
        }
      } catch {
        if (!cancelled) setUserDeposit(0)
      } finally {
        if (!cancelled) setDepositLoading(false)
      }
    }

    const handle =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(() => void run(), { timeout: 8000 })
        : window.setTimeout(() => void run(), 400)

    return () => {
      cancelled = true
      if (typeof handle === 'number') {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.cancelIdleCallback(handle)
        } else if (typeof window !== 'undefined') {
          window.clearTimeout(handle)
        }
      }
    }
  }, [dbUserId])

  const loadShares = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/properties/shares`)
      const json = await (res.ok ? res.json() : { success: false, data: [] })
      if (json.success && Array.isArray(json.data)) {
        setApiShares(mapSharesFromApiResponse(json.data, SHARE_CARD_FALLBACK))
      } else {
        setApiShares([])
      }
    } catch (_) {
      setApiShares([])
    } finally {
      setLoadingShares(false)
    }
  }, [])

  useEffect(() => {
    void loadShares()
  }, [loadShares])

  const allShareObjects = useMemo(() => apiShares, [apiShares])

  const categoryCounts = useMemo(
    () => getSharesCategoryTabCounts(allShareObjects),
    [allShareObjects],
  )

  const sharesInCategory = useMemo(
    () => allShareObjects.filter((share) => matchesShareCategoryTab(share, activeCategory)),
    [allShareObjects, activeCategory],
  )

  const filterOptions = useMemo(() => getSharesFilterOptions(sharesInCategory), [sharesInCategory])

  const filtered = useMemo(
    () => sortShares(applySharesPageFilters(sharesInCategory, sharesFilters), sortKey),
    [sharesInCategory, sharesFilters, sortKey],
  )

  const pagination = useMemo(
    () => paginateShares(filtered, currentPage, SHARES_PAGE_SIZE),
    [filtered, currentPage],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [sharesFilters, sortKey, activeCategory])

  useEffect(() => {
    if (sharesFilters.country === 'all' || sharesFilters.city === 'all') return
    const typeToCatalogPlural = {
      апартаменты: 'apartments',
      квартира: 'apartments',
      вилла: 'villas',
      дом: 'houses',
      коммерческая: 'commercial',
    }
    const path = buildCatalogCityPath({
      country: sharesFilters.country,
      city: sharesFilters.city,
      typePlural: typeToCatalogPlural[sharesFilters.propertyType] || undefined,
      sale: 'co-investment',
    })
    if (path) navigate(path)
  }, [
    sharesFilters.country,
    sharesFilters.city,
    sharesFilters.propertyType,
    navigate,
  ])

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages)
    }
  }, [currentPage, pagination.totalPages])

  const platformStats = useMemo(
    () => getSharesPlatformStats(allShareObjects),
    [allShareObjects],
  )

  const minimumShareInvestment = useMemo(
    () => getMinimumShareInvestment(allShareObjects),
    [allShareObjects],
  )

  const toShareFavoriteProperty = (obj) => ({
    ...obj,
    title: obj.title,
    name: obj.title,
    sale_type: 'share',
    is_shared_ownership: true,
  })

  const isShareLiked = (obj) =>
    isFavorite(
      toShareFavoriteProperty(obj),
      hasDbBackedProperty(obj) ? undefined : 'share',
    )

  const handleShareFavoriteToggle = (obj) => {
    toggleFavorite(
      toShareFavoriteProperty(obj),
      hasDbBackedProperty(obj) ? undefined : 'share',
    )
  }

  const handleInvest = (share) => {
    const targetPath = getCoInvestmentContextPropertyPath(share, {
      country: sharesFilters.country,
      city: sharesFilters.city,
    })
    navigate(targetPath, { state: { shareObject: share } })
  }

  const handleResetFilters = () => {
    setSharesFilters(EMPTY_SHARES_FILTERS)
  }

  return (
    <div className="shares-page shares-page--catalog shares-page--redesign">
      <Header />
      <main className="shares-container shares-container--catalog">
        <SharesPageIntroHead
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          categoryCounts={categoryCounts}
        />

        <div className="shares-page-layout">
          <div className="shares-page-layout__main">
            <SharesPageBanner
              minInvestment={minimumShareInvestment}
              platformStats={platformStats}
            />

            <section className="shares-listing-section" aria-label={t('coInvestment')}>
              <SharesListingToolbar
                filters={sharesFilters}
                onFiltersChange={setSharesFilters}
                onResetFilters={handleResetFilters}
                sortKey={sortKey}
                onSortChange={setSortKey}
                filterOptions={filterOptions}
              />

              <div
                id="shares-grid"
                className="shares-listing-grid shares-listing-grid--grid"
                aria-busy={loadingShares}
              >
                {loadingShares ? (
                  Array.from({ length: SHARES_PAGE_SIZE }, (_, i) => (
                    <SharesPropertyCardSkeleton key={`skeleton-${i}`} />
                  ))
                ) : pagination.items.length === 0 ? (
                  <div className="shares-listing-empty">
                    <p>{t('sharesEmpty')}</p>
                  </div>
                ) : (
                  pagination.items.map((obj) => (
                    <SharesPropertyCard
                      key={obj.shareId || `${obj.property_type}-${obj.id}`}
                      share={obj}
                      isFavorite={isShareLiked(obj)}
                      onFavoriteToggle={handleShareFavoriteToggle}
                      href={getCoInvestmentContextPropertyPath(obj, {
                        country: sharesFilters.country,
                        city: sharesFilters.city,
                      })}
                      onInvest={handleInvest}
                      imageFallback={SHARE_CARD_FALLBACK}
                    />
                  ))
                )}
              </div>

              {!loadingShares && filtered.length > 0 ? (
                <SharesListingPagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              ) : null}
            </section>
          </div>

          {showSidebar ? (
            <Suspense fallback={null}>
              <SharesPageSidebarLazy platformStats={platformStats} />
            </Suspense>
          ) : null}
        </div>
      </main>
      {showChatDock ? (
        <Suspense fallback={null}>
          <SiteChatDockLazy
        wrapperClassName="shares-floats"
        recommendationProperties={allShareObjects}
        onRecommendationClick={(share) => {
          handleInvest(share)
        }}
          >
            {dbUserId ? (
              depositLoading ? (
                <DepositButtonSkeleton />
              ) : (
                <DepositButton amount={userDeposit} />
              )
            ) : null}
          </SiteChatDockLazy>
        </Suspense>
      ) : null}
    </div>
  )
}

export default Shares
