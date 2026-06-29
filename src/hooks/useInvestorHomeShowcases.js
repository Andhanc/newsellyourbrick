import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getApiBaseUrl } from '../utils/apiConfig'
import { normalizePropertyMediaFields } from '../utils/propertyImage'
import { isAuctionListingEnded } from '../utils/auctionReminderBounds'
import { auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import { fetchAuctionMaxBidsBatch, getMaxBidForProperty } from '../utils/fetchAuctionMaxBids'
import { resolvePropertySourceTable } from '../utils/propertySourceTable'
import { hasBuyNowOption } from '../utils/hasBuyNowOption'
import { mapSharesFromApiResponse } from '../utils/sharesListing'

const LISTING_IMAGE_FALLBACK =
  '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

export const INVESTOR_SHOWCASE_LIMIT = 7

function asFiniteNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function isDebtProperty(property) {
  return (
    property?.sale_type === 'debt' ||
    property?.is_debt === 1 ||
    property?.is_debt === true ||
    property?.has_debt === 1 ||
    property?.has_debt === true
  )
}

function isShareProperty(property) {
  return (
    property?.is_share === 1 ||
    property?.is_share === true ||
    property?.is_shared_ownership === 1 ||
    property?.is_shared_ownership === true
  )
}

function normalizeProperty(prop, options = {}) {
  const { forceAuction = null } = options
  const isAuction =
    forceAuction !== null
      ? forceAuction
      : prop.isAuction === true || prop.is_auction === 1 || prop.is_auction === true
  const isShare = isShareProperty(prop)
  const priceNumber = prop.price != null && prop.price !== '' ? Number(prop.price) : 0
  const auctionStartingPrice =
    prop.auction_starting_price != null && prop.auction_starting_price !== ''
      ? Number(prop.auction_starting_price)
      : prop.auctionStartingPrice != null && prop.auctionStartingPrice !== ''
        ? Number(prop.auctionStartingPrice)
        : null
  const debtAmount =
    prop.debt_amount != null && prop.debt_amount !== '' ? Number(prop.debt_amount) : null
  const { image: normalizedImage, images: normalizedImages } = normalizePropertyMediaFields(prop)

  return {
    ...prop,
    isAuction,
    is_share: isShare ? 1 : 0,
    title: prop.title || prop.name || '',
    name: prop.name || prop.title || '',
    image: normalizedImage || LISTING_IMAGE_FALLBACK,
    images:
      normalizedImages.length > 0
        ? normalizedImages
        : normalizedImage
          ? [normalizedImage]
          : [],
    price: priceNumber,
    auction_starting_price: auctionStartingPrice,
    source_table:
      prop.source_table || prop.sourceTable || resolvePropertySourceTable(prop),
    currentBid:
      prop.currentBid ||
      prop.current_bid ||
      prop.auction_current_bid ||
      prop.auctionCurrentBid ||
      null,
    endTime:
      prop.endTime ||
      prop.auction_end_time ||
      prop.auctionEndTime ||
      prop.auction_end_date ||
      prop.auctionEndDate ||
      prop.test_timer_end_date ||
      null,
    debt_amount: debtAmount,
    sale_type: prop.sale_type || undefined,
    is_debt: prop.is_debt ?? undefined,
    has_debt: prop.has_debt ?? undefined,
    beds: prop.beds || prop.rooms || prop.bedrooms || 0,
    baths: prop.baths || prop.bathrooms || 0,
    sqft: prop.sqft || prop.area || 0,
    area: prop.area || prop.sqft || 0,
  }
}

export function useInvestorHomeShowcases() {
  const { i18n } = useTranslation()
  const [homeProperties, setHomeProperties] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProperties = useCallback(async (options = {}) => {
    const showSkeleton = options.showSkeleton !== false
    if (showSkeleton) setLoading(true)

    try {
      const apiBase = await getApiBaseUrl()
      const lang = (i18n.language || 'ru').split('-')[0]
      const viewerRaw = localStorage.getItem('userId')
      const viewerQ =
        viewerRaw && /^\d+$/.test(String(viewerRaw).trim())
          ? `&viewer_user_id=${encodeURIComponent(String(viewerRaw).trim())}`
          : ''

      const [approvedRes, auctionsRes, debtsRes, sharesRes] = await Promise.all([
        fetch(`${apiBase}/properties/approved?lang=${lang}`),
        fetch(`${apiBase}/properties/auctions?lang=${lang}${viewerQ}`),
        fetch(`${apiBase}/properties/debts`),
        fetch(`${apiBase}/properties/shares`),
      ])

      const readList = async (res) => {
        if (!res.ok) return []
        const json = await res.json()
        return json?.success && Array.isArray(json.data) ? json.data : []
      }

      const [approved, auctions, debts, sharesRaw] = await Promise.all([
        readList(approvedRes),
        readList(auctionsRes),
        readList(debtsRes),
        readList(sharesRes),
      ])

      const byKey = new Map()
      const put = (property) => {
        if (property?.id == null) return
        const key = auctionListingDedupeKey(property)
        const prev = byKey.get(key)
        byKey.set(
          key,
          prev
            ? { ...prev, ...property, isAuction: prev.isAuction || property.isAuction }
            : property,
        )
      }

      approved.map((item) => normalizeProperty(item)).forEach(put)
      auctions.map((item) => normalizeProperty(item, { forceAuction: true })).forEach(put)
      debts.map((item) => normalizeProperty(item)).forEach(put)

      const shareItems = mapSharesFromApiResponse(sharesRaw, LISTING_IMAGE_FALLBACK)
      shareItems.forEach((share) => {
        if (!share?.id) return
        put({
          ...share,
          is_share: 1,
          is_shared_ownership: 1,
        })
      })

      let merged = Array.from(byKey.values())
      const auctionItems = merged.filter(
        (item) =>
          item &&
          (item.isAuction === true || item.is_auction === 1 || item.is_auction === true),
      )
      const bidByKey = await fetchAuctionMaxBidsBatch(apiBase, auctionItems)
      if (bidByKey.size > 0) {
        merged = merged.map((item) => {
          const maxBid = getMaxBidForProperty(bidByKey, item)
          if (maxBid == null) return item
          const currentBid = asFiniteNumberOrNull(item.currentBid) || 0
          return {
            ...item,
            currentBid: Math.max(currentBid, maxBid),
          }
        })
      }

      setHomeProperties(merged)
    } catch (error) {
      console.error('Investor home showcases load error:', error)
      setHomeProperties([])
    } finally {
      if (showSkeleton) setLoading(false)
    }
  }, [i18n.language])

  useEffect(() => {
    void loadProperties()
  }, [loadProperties])

  const auctionSection = useMemo(() => {
    return homeProperties
      .filter((property) => {
        if (!property?.isAuction) return false
        if (isShareProperty(property)) return false
        if (isDebtProperty(property)) return false
        return !hasBuyNowOption(property)
      })
      .filter((property) => !isAuctionListingEnded(property))
      .slice(0, INVESTOR_SHOWCASE_LIMIT)
  }, [homeProperties])

  const buyNowSection = useMemo(() => {
    return homeProperties
      .filter((property) => {
        if (!property?.isAuction) return false
        if (isShareProperty(property)) return false
        if (isDebtProperty(property)) return false
        return hasBuyNowOption(property)
      })
      .filter((property) => !isAuctionListingEnded(property))
      .slice(0, INVESTOR_SHOWCASE_LIMIT)
  }, [homeProperties])

  const debtsSection = useMemo(() => {
    return homeProperties.filter(isDebtProperty).slice(0, INVESTOR_SHOWCASE_LIMIT)
  }, [homeProperties])

  const sharesSection = useMemo(() => {
    return homeProperties.filter(isShareProperty).slice(0, INVESTOR_SHOWCASE_LIMIT)
  }, [homeProperties])

  return {
    loading,
    auctionSection,
    buyNowSection,
    debtsSection,
    sharesSection,
    reload: loadProperties,
  }
}
