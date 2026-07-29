/** Объект аукциона только для закрытого клуба (VIP). */
export function isPrivateClubAuctionLot(p) {
  const v = p?.private_club_only
  return v === 1 || v === true || v === '1'
}
