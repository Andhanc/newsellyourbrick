import { fetchVerificationStatus } from './verificationStatusApi'
import { fetchLinkedRoles } from './roleSwitchApi'

function statusPassedPhotoKyc(status) {
  if (!status) return false
  if (status.needsReverificationAfterRejection) return false
  return Boolean(status.isVerified || status.hasDocuments)
}

/**
 * Skip the seller passport/selfie KYC at listing publish when:
 * - this seller already submitted or passed it, or
 * - they came from a linked buyer cabinet that already did.
 */
export function canSkipSellerPhotoKyc({
  sellerStatus = null,
  linkedBuyerStatus = null,
  hasLinkedBuyer = false,
} = {}) {
  if (statusPassedPhotoKyc(sellerStatus)) return true
  if (!hasLinkedBuyer) return false
  return statusPassedPhotoKyc(linkedBuyerStatus)
}

export async function resolveCanPublishWithoutSellerPhotoKyc(apiBaseUrl, userId) {
  const sellerStatus = await fetchVerificationStatus(apiBaseUrl, userId, { force: true })
  let linkedBuyerStatus = null
  let hasLinkedBuyer = false

  try {
    const linked = await fetchLinkedRoles({ userId })
    const buyerId = linked?.buyer?.id
    hasLinkedBuyer = Boolean(buyerId && String(buyerId) !== String(userId))
    if (hasLinkedBuyer) {
      linkedBuyerStatus = await fetchVerificationStatus(apiBaseUrl, buyerId, { force: true })
    }
  } catch {
    // Seller-only decision if linked roles are unavailable.
  }

  return canSkipSellerPhotoKyc({ sellerStatus, linkedBuyerStatus, hasLinkedBuyer })
}
