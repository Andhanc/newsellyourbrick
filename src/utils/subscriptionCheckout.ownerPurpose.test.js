import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./subscriptionCheckout.js', import.meta.url), 'utf8')

test('owner checkout marks itself so buyer Pro is not billed as a seller plan', () => {
  assert.match(source, /export async function startOwnerSubscriptionCheckout/)
  assert.match(source, /checkout_purpose:\s*'owner_subscription'/)
})
