const isPrivateClub = (p) => [1, true, '1'].includes(p?.private_club_only)

/** Public catalogue payload: never send a locked lot's photos, address or seller details. */
export function privateClubListingForViewer(property, { hasVip = false, viewerId = null } = {}) {
  const isOwner = viewerId != null && Number(viewerId) === Number(property.user_id)
  if (!isPrivateClub(property) || hasVip || isOwner) return property
  return {
    id: property.id,
    source_table: property.source_table,
    property_type: property.property_type,
    private_club_only: 1,
    vip_locked: true,
    isAuction: true,
    is_auction: 1,
    moderation_status: 'approved',
  }
}
