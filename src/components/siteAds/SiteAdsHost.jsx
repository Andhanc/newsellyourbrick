import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { fetchActiveSiteAds } from '@/services/siteAdsApi'
import {
  isSiteAdBlockDismissed,
  isSiteAdModalSeen,
  markSiteAdBlockDismissed,
  pathnameToAdPage,
} from '@/utils/siteAdPages'
import SiteAdBlock from './SiteAdBlock'
import SiteAdModal from './SiteAdModal'
import './SiteAdsHost.css'

const HIDDEN_PATH_PREFIXES = ['/marketer', '/admin']

export default function SiteAdsHost() {
  const { pathname } = useLocation()
  const [ads, setAds] = useState([])
  const [modalDismissed, setModalDismissed] = useState(false)
  const [dismissedBlockIds, setDismissedBlockIds] = useState([])

  const pageKey = pathnameToAdPage(pathname)

  const loadAds = useCallback(async () => {
    try {
      const list = await fetchActiveSiteAds()
      setAds(list)
    } catch {
      setAds([])
    }
  }, [])

  useEffect(() => {
    loadAds()
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
                <SiteAdBlock
                  key={ad.id}
                  ad={ad}
                  onClose={() => handleBlockClose(ad.id)}
                />
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
        <SiteAdModal
          ad={activeModal}
          onClose={() => setModalDismissed(true)}
        />
      ) : null}
    </>
  )
}
