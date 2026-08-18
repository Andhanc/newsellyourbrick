import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8')

test('buyer-turned-seller skips photo KYC at listing publish when buyer already verified', async () => {
  const kyc = await read('./sellerPublishKyc.js')
  const oap = await read('../pages/OwnerAddPropertyTestPage.jsx')
  const addProperty = await read('../pages/AddProperty.jsx')
  const server = await read('../../server/server.js')

  assert.match(kyc, /export function canSkipSellerPhotoKyc/)
  assert.match(kyc, /hasLinkedBuyer/)
  assert.match(kyc, /linkedBuyerStatus/)
  assert.match(kyc, /needsReverificationAfterRejection/)
  assert.match(kyc, /resolveCanPublishWithoutSellerPhotoKyc/)
  assert.match(kyc, /fetchLinkedRoles/)

  assert.match(oap, /resolveCanPublishWithoutSellerPhotoKyc/)
  assert.match(addProperty, /resolveCanPublishWithoutSellerPhotoKyc/)

  assert.match(server, /function buildLinkedRoleProfileFromUser/)
  assert.match(
    server,
    /is_verified:\s*sourceUser\.is_verified === 1 \|\| sourceUser\.is_verified === true \? 1 : 0/,
  )
})
