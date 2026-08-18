function toPositiveInt(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

/**
 * True when the viewer is the listing owner, including a linked buyer/seller
 * cabinet that shares the same email.
 */
export function viewerOwnsListing({
  viewerUserId,
  viewerEmail,
  listingOwnerUserId,
  listingOwnerEmail,
} = {}) {
  const viewerId = toPositiveInt(viewerUserId)
  const ownerId = toPositiveInt(listingOwnerUserId)
  if (viewerId && ownerId && viewerId === ownerId) return true

  const viewer = normalizeEmail(viewerEmail)
  const owner = normalizeEmail(listingOwnerEmail)
  return Boolean(viewer && owner && viewer === owner)
}

export async function viewerOwnsPropertyRecord(userQueries, viewerUser, property) {
  if (!viewerUser || !property) return false
  if (
    viewerOwnsListing({
      viewerUserId: viewerUser.id,
      viewerEmail: viewerUser.email,
      listingOwnerUserId: property.user_id,
      listingOwnerEmail: property.email,
    })
  ) {
    return true
  }

  const ownerId = toPositiveInt(property.user_id)
  if (!ownerId || typeof userQueries?.getById !== 'function') return false

  const owner = await userQueries.getById(ownerId)
  return viewerOwnsListing({
    viewerUserId: viewerUser.id,
    viewerEmail: viewerUser.email,
    listingOwnerUserId: owner?.id ?? ownerId,
    listingOwnerEmail: owner?.email,
  })
}
