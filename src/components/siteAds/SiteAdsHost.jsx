import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import {
  isSiteAdBlockDismissed,
  isSiteAdModalSeen,
  markSiteAdBlockDismissed,
  pathnameToAdPage,
} from '@/utils/siteAdPages'

const SiteAdBlockLazy = lazy(() => import('./SiteAdBlock'))
const SiteAdModalLazy = lazy(() => import('./SiteAdModal'))

const HIDDEN_PATH_PREFIXES = ['/marketer', '/admin']

/** @param {{ initialAds?: unknown[] }} props */
export default function SiteAdsHost({ initialAds = null }) {
  const { pathname } = useLocation()
  const [ads, setAds] = useState(() => (Array.isArray(initialAds) ? initialAds : []))
  const [modalDismissed, setModalDismissed] = useState(false)
  const [dismissedBlockIds, setDismissedBlockIds] = useState([])

  const pageKey = pathnameToAdPage(pathname)

  const loadAds = useCallback(async () => {
    if (Array.isArray(initialAds) && initialAds.length) {
      setAds(initialAds)
      return
    }
    try {
      const { fetchActiveSiteAds } = await import('@/services/siteAdsPublicApi')
      const list = await fetchActiveSiteAds()
      setAds(list)
    } catch {
      setAds([])
    }
  }, [initialAds])

  useEffect(() => {
    void loadAds()
  }, [loadAds, pathname])

  useEffect(() => {
    setModalDismissed(false)
    setDismissedBlockIds([])
  }, [pathname, pageKey])

  const isHiddenRoute = HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))

  const pageAds = useMemo(() => {
    if (!pageKey) return []
    return ads.filter((ad) => Array.isArray(ad.pages) && ad.pages.includes(pageKey))
  }, [ads, pageKey])

  const blocks = useMemo(
    () =>
      pageAds.filter(
        (ad) =>
          ad.type === 'block'
          && !isSiteAdBlockDismissed(ad.id)
          && !dismissedBlockIds.includes(ad.id),
      ),
    [pageAds, dismissedBlockIds],
  )

  const activeModal = useMemo(() => {
    if (modalDismissed) return null
    const modals = pageAds.filter((ad) => ad.type === 'modal')
    return modals.find((ad) => !isSiteAdModalSeen(ad.id)) || null
  }, [pageAds, modalDismissed])

  useEffect(() => {
    if (!blocks.length && !activeModal) return undefined
    void import('./SiteAdsHost.css')
    return undefined
  }, [blocks.length, activeModal])

  const handleBlockClose = (adId) => {
    markSiteAdBlockDismissed(adId)
    setDismissedBlockIds((prev) => [...prev, adId])
  }

  if (isHiddenRoute || !pageKey) return null
  if (!blocks.length && !activeModal) return null

  const blocksPortal =
    blocks.length > 0 && typeof document !== 'undefined'
      ? createPortal(
          <div className="site-ads-host" aria-live="polite">
            <div className="site-ads-host__inner">
              {blocks.map((ad) => (
                <Suspense key={ad.id} fallback={null}>
                  <SiteAdBlockLazy ad={ad} onClose={() => handleBlockClose(ad.id)} />
                </Suspense>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {blocksPortal}
      {activeModal ? (
        <Suspense fallback={null}>
          <SiteAdModalLazy
            ad={activeModal}
            onClose={() => setModalDismissed(true)}
          />
        </Suspense>
      ) : null}
    </>
  )
}
