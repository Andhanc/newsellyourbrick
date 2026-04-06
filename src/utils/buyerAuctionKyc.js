/**
 * Согласовано с server/server.js (POST /api/bids): для аукциона KYC не требуется для seller/owner/admin.
 */
export function roleSkipsAuctionKyc(role) {
  const r = String(role || 'buyer').toLowerCase()
  return r === 'seller' || r === 'owner' || r === 'admin'
}
