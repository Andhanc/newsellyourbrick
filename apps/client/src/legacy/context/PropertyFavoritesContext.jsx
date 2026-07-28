import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { isAuthenticated } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import {
  favoriteCompositeKey,
  hasDbBackedProperty,
  normalizePropertyTable,
} from '../utils/propertyFavoriteKey'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'

const LazyFirstFavoriteDrawer = lazy(() => import('../components/FirstFavoriteDrawer'))
const LazyCompareFavoritesDrawer = lazy(() => import('../components/CompareFavoritesDrawer'))

const PropertyFavoritesContext = createContext(null)

export const PROPERTY_FAVORITES_CHANGED = 'propertyFavoritesChanged'

function getDbUserId() {
  const storage =
    typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  const id = storage?.getItem('userId') ?? null
  if (id && /^\d+$/.test(String(id))) return String(id)
  return null
}

function readMockFavoritesMap() {
  const m = new Map()
  try {
    const raw = localStorage.getItem('favoriteProperties')
    if (!raw) return m
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([key, val]) => {
        if (
          val &&
          (key.startsWith('recommended-') ||
            key.startsWith('nearby-') ||
            key.startsWith('apartment-') ||
            key.startsWith('villa-') ||
            key.startsWith('flat-') ||
            key.startsWith('townhouse-') ||
            key.startsWith('property-'))
        ) {
          m.set(key, true)
        }
      })
    }
  } catch (_) {}
  return m
}

function persistMockKey(mapKey, active) {
  try {
    const raw = localStorage.getItem('favoriteProperties')
    let obj = {}
    if (raw) {
      try {
        obj = JSON.parse(raw)
      } catch (_) {}
    }
    obj[mapKey] = active
    localStorage.setItem('favoriteProperties', JSON.stringify(obj))
  } catch (_) {}
}

function dispatchFavoritesChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROPERTY_FAVORITES_CHANGED))
  }
}

function maybeOpenFirstFavoriteDrawer(countBeforeAdd) {
  return countBeforeAdd === 0
}

function maybeOpenCompareFavoritesDrawer(countBeforeAdd) {
  return countBeforeAdd === 1
}

function PropertyFavoritesDrawersHost({
  firstOpen,
  compareOpen,
  onCloseFirst,
  onCloseCompare,
}) {
  const navigate = useNavigate()
  if (!firstOpen && !compareOpen) return null
  return (
    <Suspense fallback={null}>
      {firstOpen ? (
        <LazyFirstFavoriteDrawer
          isOpen={firstOpen}
          onClose={onCloseFirst}
          onGoToFavorites={() => navigate('/favorites')}
        />
      ) : null}
      {compareOpen ? (
        <LazyCompareFavoritesDrawer
          isOpen={compareOpen}
          onClose={onCloseCompare}
          onCompare={() => navigate('/compare')}
        />
      ) : null}
    </Suspense>
  )
}

export function PropertyFavoritesProvider({ children }) {
  const { user, isLoaded: userLoaded } = useUser()
  const { pathname } = useLocation()
  const [dbKeys, setDbKeys] = useState(() => new Set())
  const [favoriteRows, setFavoriteRows] = useState(() => [])
  const [mockMap, setMockMap] = useState(() => readMockFavoritesMap())
  const [loading, setLoading] = useState(false)
  const [firstFavoriteDrawerOpen, setFirstFavoriteDrawerOpen] = useState(false)
  const [compareFavoritesDrawerOpen, setCompareFavoritesDrawerOpen] = useState(false)

  const loadDbFavorites = useCallback(async () => {
    const uid = getDbUserId()
    if (!uid) {
      setDbKeys(new Set())
      setFavoriteRows([])
      return
    }
    setLoading(true)
    try {
      const base = await getApiBaseUrl()
      const { fetchUserFavorites } = await import('../utils/favoritesApi')
      const rows = await fetchUserFavorites(base, uid, { ttlMs: 20000 })
      if (Array.isArray(rows)) {
        const next = new Set()
        rows.forEach((row) => {
          if (row.property_id != null && row.property_table != null) {
            next.add(favoriteCompositeKey(row.property_id, row.property_table))
          }
        })
        setDbKeys(next)
        setFavoriteRows(rows)
      }
    } catch (e) {
      console.warn('loadDbFavorites:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!getDbUserId()) return undefined
    let cancelled = false
    let loaded = false
    const run = () => {
      if (cancelled || loaded) return
      loaded = true
      void loadDbFavorites()
    }
    const isHome = pathname === '/'
    const onInteract = () => run()
    const interactEvents = ['scroll', 'click', 'keydown', 'touchstart']
    if (isHome) {
      interactEvents.forEach((eventName) => {
        window.addEventListener(eventName, onInteract, { once: true, passive: true })
      })
    }
    const idleTimeout = isHome ? 12000 : 4500
    if (!isHome && typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: idleTimeout })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
        if (isHome) {
          interactEvents.forEach((eventName) => {
            window.removeEventListener(eventName, onInteract)
          })
        }
      }
    }
    const t = window.setTimeout(run, isHome ? 3000 : 600)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      if (isHome) {
        interactEvents.forEach((eventName) => {
          window.removeEventListener(eventName, onInteract)
        })
      }
    }
  }, [loadDbFavorites, pathname])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'userId' || e.key === null) loadDbFavorites()
    }
    const onFocus = () => loadDbFavorites()
    const onCustom = () => loadDbFavorites()
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    window.addEventListener(PROPERTY_FAVORITES_CHANGED, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(PROPERTY_FAVORITES_CHANGED, onCustom)
    }
  }, [loadDbFavorites])

  const isFavorite = useCallback(
    (property, mockCategory) => {
      if (hasDbBackedProperty(property)) {
        return dbKeys.has(favoriteCompositeKey(property.id, property.source_table))
      }
      if (!mockCategory) return false
      return Boolean(mockMap.get(`${mockCategory}-${property.id}`))
    },
    [dbKeys, mockMap]
  )

  const toggleFavorite = useCallback(
    async (property, mockCategory) => {
      const isClerkAuth = user && userLoaded
      const isOldAuth = isAuthenticated()
      if (!isClerkAuth && !isOldAuth) {
        requestOpenLoginModal({ wizard: true })
        return false
      }

      if (hasDbBackedProperty(property)) {
        const uid = getDbUserId()
        if (!uid) {
          showNotification('Не удалось определить профиль. Обновите страницу после входа.')
          return false
        }
        const key = favoriteCompositeKey(property.id, property.source_table)
        const wasLiked = dbKeys.has(key)
        const countBeforeAdd = dbKeys.size + mockMap.size
        const showFirstFavoriteDrawer = !wasLiked && maybeOpenFirstFavoriteDrawer(countBeforeAdd)
        const showCompareFavoritesDrawer = !wasLiked && maybeOpenCompareFavoritesDrawer(countBeforeAdd)
        setDbKeys((prev) => {
          const next = new Set(prev)
          if (wasLiked) next.delete(key)
          else next.add(key)
          return next
        })

        try {
          const base = await getApiBaseUrl()
          const { invalidateUserFavoritesCache } = await import('../utils/favoritesApi')
          invalidateUserFavoritesCache(base, uid)
          const body = JSON.stringify({
            property_id: property.id,
            property_table: normalizePropertyTable(property.source_table),
          })
          const res = await fetch(`${base}/users/${uid}/favorites`, {
            method: wasLiked ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok || json.success === false) {
            invalidateUserFavoritesCache(base, uid)
            setDbKeys((prev) => {
              const next = new Set(prev)
              if (wasLiked) next.add(key)
              else next.delete(key)
              return next
            })
            showNotification(json.error || 'Не удалось обновить избранное')
            return false
          }
        } catch (e) {
          const base = await getApiBaseUrl().catch(() => '/api')
          const { invalidateUserFavoritesCache } = await import('../utils/favoritesApi')
          invalidateUserFavoritesCache(base, uid)
          setDbKeys((prev) => {
            const next = new Set(prev)
            if (wasLiked) next.add(key)
            else next.delete(key)
            return next
          })
          showNotification('Ошибка сети')
          return false
        }
        dispatchFavoritesChanged()
        if (showFirstFavoriteDrawer) setFirstFavoriteDrawerOpen(true)
        else if (showCompareFavoritesDrawer) setCompareFavoritesDrawerOpen(true)
        return !wasLiked
      }

      if (!mockCategory) return false
      const mapKey = `${mockCategory}-${property.id}`
      const wasLiked = Boolean(mockMap.get(mapKey))
      const countBeforeAdd = dbKeys.size + mockMap.size
      const showFirstFavoriteDrawer = !wasLiked && maybeOpenFirstFavoriteDrawer(countBeforeAdd)
      const showCompareFavoritesDrawer = !wasLiked && maybeOpenCompareFavoritesDrawer(countBeforeAdd)
      const nextMock = new Map(mockMap)
      if (wasLiked) nextMock.delete(mapKey)
      else nextMock.set(mapKey, true)
      setMockMap(nextMock)
      persistMockKey(mapKey, !wasLiked)
      dispatchFavoritesChanged()
      if (showFirstFavoriteDrawer) setFirstFavoriteDrawerOpen(true)
      else if (showCompareFavoritesDrawer) setCompareFavoritesDrawerOpen(true)
      return !wasLiked
    },
    [user, userLoaded, mockMap, dbKeys]
  )

  const value = useMemo(
    () => ({
      dbKeys,
      favoriteRows,
      isFavorite,
      toggleFavorite,
      refreshDbFavorites: loadDbFavorites,
      favoritesLoading: loading,
    }),
    [dbKeys, favoriteRows, isFavorite, toggleFavorite, loadDbFavorites, loading]
  )

  return (
    <PropertyFavoritesContext.Provider value={value}>
      {children}
      <PropertyFavoritesDrawersHost
        firstOpen={firstFavoriteDrawerOpen}
        compareOpen={compareFavoritesDrawerOpen}
        onCloseFirst={() => setFirstFavoriteDrawerOpen(false)}
        onCloseCompare={() => setCompareFavoritesDrawerOpen(false)}
      />
    </PropertyFavoritesContext.Provider>
  )
}

export function usePropertyFavorites() {
  const ctx = useContext(PropertyFavoritesContext)
  if (!ctx) {
    throw new Error('usePropertyFavorites must be used within PropertyFavoritesProvider')
  }
  return ctx
}
