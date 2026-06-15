import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import SiteChatDock from '../components/SiteChatDock'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import SharesPageSidebar from '../components/SharesPageSidebar'
import { SharesPageIntroHead, SharesPageBanner } from '../components/SharesPageIntro'
import SharesListingToolbar from '../components/SharesListingToolbar'
import SharesPropertyCard, { SharesPropertyCardSkeleton } from '../components/SharesPropertyCard'
import SharesListingPagination from '../components/SharesListingPagination'
import { fetchUserDeposit } from '../utils/depositApi'
import { fetchNumericDbUserIdForApi, getStoredNumericUserId } from '../services/authService'
import './Shares.css'
import '../components/SharesListing.css'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import {
  EMPTY_SHARES_FILTERS,
  applySharesPageFilters,
  isShareSoldOut,
} from '../utils/sharesPageFilters'
import {
  SHARES_PAGE_SIZE,
  getSharesFilterOptions,
  mapSharesFromApiResponse,
  paginateShares,
  sortShares,
} from '../utils/sharesListing'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const SHARE_CARD_FALLBACK = '/images/external/shares-hero-villa.jpg'

const Shares = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [sharesFilters, setSharesFilters] = useState(EMPTY_SHARES_FILTERS)
  const [sortKey, setSortKey] = useState('popularity')
  const [viewMode, setViewMode] = useState('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [apiShares, setApiShares] = useState([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const [userDeposit, setUserDeposit] = useState(0)
  const [depositLoading, setDepositLoading] = useState(() => Boolean(getStoredNumericUserId()))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
      if (!cancelled && id) setDbUserId(id)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!dbUserId) {
      setDepositLoading(false)
      return
    }
    let cancelled = false
    setDepositLoading(true)

    ;(async () => {
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
    })()

    return () => {
      cancelled = true
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

  const filterOptions = useMemo(() => getSharesFilterOptions(allShareObjects), [allShareObjects])

  const filtered = useMemo(
    () => sortShares(applySharesPageFilters(allShareObjects, sharesFilters), sortKey),
    [allShareObjects, sharesFilters, sortKey],
  )

  const pagination = useMemo(
    () => paginateShares(filtered, currentPage, SHARES_PAGE_SIZE),
    [filtered, currentPage],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [sharesFilters, sortKey])

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages)
    }
  }, [currentPage, pagination.totalPages])

  const availableObjectsCount = useMemo(
    () => allShareObjects.filter((obj) => !isShareSoldOut(obj)).length,
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
    const routeId = share.shareId || share.routeId || `${share.property_type}-${share.id}`
    navigate(`/shares/${routeId}`, { state: { shareObject: share } })
  }

  const handleResetFilters = () => {
    setSharesFilters(EMPTY_SHARES_FILTERS)
  }

  return (
    <div className="shares-page shares-page--catalog shares-page--redesign">
      <Header />
      <main className="shares-container shares-container--catalog">
        <SharesPageIntroHead />

        <div className="shares-page-layout">
          <div className="shares-page-layout__main">
            <SharesPageBanner />

            <section className="shares-listing-section" aria-label={t('shares')}>
              <SharesListingToolbar
                filters={sharesFilters}
                onFiltersChange={setSharesFilters}
                onResetFilters={handleResetFilters}
                sortKey={sortKey}
                onSortChange={setSortKey}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                filterOptions={filterOptions}
              />

              <div
                id="shares-grid"
                className={`shares-listing-grid shares-listing-grid--${viewMode}`}
                aria-busy={loadingShares}
              >
                {loadingShares ? (
                  Array.from({ length: SHARES_PAGE_SIZE }, (_, i) => (
                    <SharesPropertyCardSkeleton key={`skeleton-${i}`} viewMode={viewMode} />
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
                      viewMode={viewMode}
                      isFavorite={isShareLiked(obj)}
                      onFavoriteToggle={handleShareFavoriteToggle}
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

          <SharesPageSidebar objectsAvailable={availableObjectsCount} />
        </div>
      </main>
      <SiteChatDock
        wrapperClassName="shares-floats"
        recommendationProperties={allShareObjects}
        onRecommendationClick={(share) => {
          const routeId = share.shareId || share.routeId || `${share.property_type}-${share.id}`
          navigate(`/shares/${routeId}`, { state: { shareObject: share } })
        }}
      >
        {dbUserId ? (
          depositLoading ? (
            <DepositButtonSkeleton />
          ) : (
            <DepositButton amount={userDeposit} />
          )
        ) : null}
      </SiteChatDock>
    </div>
  )
}

export default Shares
