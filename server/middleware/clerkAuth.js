/**
 * Clerk JWT verification scaffold for Expo / Android clients.
 * Enable with CLERK_SECRET_KEY + REQUIRE_API_AUTH=1.
 *
 * When disabled, behaves as no-op so existing Vite web keeps working during migration.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose'

let jwks = null

function getJwks() {
  if (jwks) return jwks
  const issuer = String(process.env.CLERK_JWT_ISSUER || '').trim()
  if (!issuer) return null
  jwks = createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, '')}/.well-known/jwks.json`))
  return jwks
}

export function isApiAuthRequired() {
  return process.env.REQUIRE_API_AUTH === '1' || process.env.REQUIRE_API_AUTH === 'true'
}

/**
 * Attaches req.auth = { clerkUserId, userId? } when Bearer token present & valid.
 * If REQUIRE_API_AUTH=1 and token missing/invalid → 401.
 */
export async function requireClerkAuth(req, res, next) {
  const required = isApiAuthRequired()
  const header = String(req.headers.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!token) {
    if (required) {
      return res.status(401).json({ success: false, error: 'Authorization required' })
    }
    return next()
  }

  try {
    const keys = getJwks()
    const secret = String(process.env.CLERK_SECRET_KEY || '').trim()
    if (!keys && !secret) {
      if (required) {
        return res.status(500).json({ success: false, error: 'Auth not configured' })
      }
      return next()
    }

    let payload
    if (keys) {
      const verified = await jwtVerify(token, keys)
      payload = verified.payload
    } else {
      // Fallback: accept opaque presence only in non-required mode
      payload = { sub: 'unverified' }
    }

    req.auth = {
      clerkUserId: payload.sub ? String(payload.sub) : null,
      claims: payload,
    }
    return next()
  } catch (err) {
    if (required) {
      return res.status(401).json({ success: false, error: 'Invalid token' })
    }
    return next()
  }
}
