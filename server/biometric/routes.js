import crypto from 'crypto'

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'

import { getPrisma } from '../database/prismaClient.js'
import { authenticateMobileRequest } from '../services/mobileAuthSessions.js'

const CHALLENGE_TTL_MS = 5 * 60 * 1000
const CEREMONY_REGISTER = 'register'
const CEREMONY_AUTHENTICATE = 'authenticate'

function cleanOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '')
}

export function resolveWebAuthnContext(req) {
  const origin = cleanOrigin(req.get('origin'))
  if (!origin) throw new Error('missing_origin')

  let url
  try {
    url = new URL(origin)
  } catch {
    throw new Error('invalid_origin')
  }

  const configuredOrigins = String(process.env.WEBAUTHN_ORIGIN || '')
    .split(',')
    .map(cleanOrigin)
    .filter(Boolean)
  const production = process.env.NODE_ENV === 'production'
  if (configuredOrigins.length > 0 && !configuredOrigins.includes(origin)) {
    throw new Error('origin_not_allowed')
  }
  if (production && configuredOrigins.length === 0) {
    throw new Error('webauthn_origin_not_configured')
  }

  const localhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localhost)) {
    throw new Error('secure_context_required')
  }

  const configuredRpId = String(process.env.WEBAUTHN_RP_ID || '').trim().toLowerCase()
  const rpID = configuredRpId || url.hostname.toLowerCase()
  if (production && !configuredRpId) throw new Error('webauthn_rp_id_not_configured')
  if (url.hostname !== rpID && !url.hostname.endsWith(`.${rpID}`)) {
    throw new Error('rp_id_origin_mismatch')
  }

  return { origin, rpID }
}

function credentialModel(prisma) {
  if (!prisma?.webauthn_credentials) throw new Error('webauthn_schema_not_ready')
  return prisma.webauthn_credentials
}

function challengeModel(prisma) {
  if (!prisma?.webauthn_challenges) throw new Error('webauthn_schema_not_ready')
  return prisma.webauthn_challenges
}

async function requireBiometricUser(req, res) {
  const auth = await authenticateMobileRequest(req)
  if (!auth) {
    res.status(401).json({ success: false, error: 'biometric_auth_required' })
    return null
  }
  const prisma = getPrisma()
  const user = await prisma.users.findUnique({
    where: { id: auth.userId },
    select: { id: true, first_name: true, last_name: true, email: true, is_blocked: true },
  })
  if (!user || user.is_blocked === 1) {
    res.status(403).json({ success: false, error: 'biometric_user_unavailable' })
    return null
  }
  return { prisma, user }
}

function stableUserHandle(userId) {
  const secret = String(
    process.env.WEBAUTHN_USER_HANDLE_SECRET || process.env.CLERK_SECRET_KEY || '',
  ).trim()
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('webauthn_user_handle_secret_not_configured')
  }
  return crypto
    .createHmac('sha256', secret || 'sellyourbrick-local-webauthn')
    .update(`user:${userId}`)
    .digest()
}

async function saveChallenge(prisma, { userId, ceremony, challenge, origin, rpID }) {
  const model = challengeModel(prisma)
  await model.deleteMany({ where: { expires_at: { lte: new Date() } } })
  return model.upsert({
    where: { user_id_ceremony: { user_id: userId, ceremony } },
    create: {
      user_id: userId,
      ceremony,
      challenge,
      origin,
      rp_id: rpID,
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
    update: {
      challenge,
      origin,
      rp_id: rpID,
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS),
      created_at: new Date(),
    },
  })
}

async function consumeChallenge(prisma, userId, ceremony) {
  return prisma.$transaction(async (tx) => {
    const model = challengeModel(tx)
    const row = await model.findUnique({
      where: { user_id_ceremony: { user_id: userId, ceremony } },
    })
    if (!row) throw new Error('challenge_not_found')
    await model.delete({ where: { id: row.id } })
    if (row.expires_at.getTime() <= Date.now()) throw new Error('challenge_expired')
    return row
  })
}

function parseTransports(value) {
  if (!value) return undefined
  try {
    const result = JSON.parse(value)
    return Array.isArray(result) ? result : undefined
  } catch {
    return undefined
  }
}

function errorStatus(code) {
  if (code === 'biometric_auth_required') return 401
  if (code === 'origin_not_allowed' || code === 'rp_id_origin_mismatch') return 403
  if (code === 'webauthn_schema_not_ready') return 503
  if (code.includes('not_configured')) return 503
  return 400
}

function sendError(res, error) {
  const code = String(error?.message || 'biometric_request_failed')
  console.error('Biometric WebAuthn error:', code)
  return res.status(errorStatus(code)).json({ success: false, error: code })
}

export function registerBiometricRoutes(app) {
  app.get('/api/biometric/status', async (req, res) => {
    try {
      const context = await requireBiometricUser(req, res)
      if (!context) return
      const count = await credentialModel(context.prisma).count({
        where: { user_id: context.user.id },
      })
      res.json({ success: true, enabled: count > 0, credentialCount: count })
    } catch (error) {
      sendError(res, error)
    }
  })

  app.post('/api/biometric/register/options', async (req, res) => {
    try {
      const context = await requireBiometricUser(req, res)
      if (!context) return
      const { origin, rpID } = resolveWebAuthnContext(req)
      const credentials = await credentialModel(context.prisma).findMany({
        where: { user_id: context.user.id },
      })
      const displayName = [context.user.first_name, context.user.last_name].filter(Boolean).join(' ')
      const options = await generateRegistrationOptions({
        rpName: 'SellYourBrick',
        rpID,
        userID: new Uint8Array(stableUserHandle(context.user.id)),
        userName: context.user.email || `user-${context.user.id}`,
        userDisplayName: displayName || 'SellYourBrick user',
        timeout: 60_000,
        attestationType: 'none',
        excludeCredentials: credentials.map((credential) => ({
          id: credential.credential_id,
          transports: parseTransports(credential.transports),
        })),
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        preferredAuthenticatorType: 'localDevice',
      })
      await saveChallenge(context.prisma, {
        userId: context.user.id,
        ceremony: CEREMONY_REGISTER,
        challenge: options.challenge,
        origin,
        rpID,
      })
      res.json({ success: true, options })
    } catch (error) {
      sendError(res, error)
    }
  })

  app.post('/api/biometric/register/verify', async (req, res) => {
    try {
      const context = await requireBiometricUser(req, res)
      if (!context) return
      const challenge = await consumeChallenge(
        context.prisma,
        context.user.id,
        CEREMONY_REGISTER,
      )
      const verification = await verifyRegistrationResponse({
        response: req.body?.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: challenge.origin,
        expectedRPID: challenge.rp_id,
        requireUserVerification: true,
      })
      if (!verification.verified || !verification.registrationInfo?.userVerified) {
        throw new Error('registration_not_verified')
      }
      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo
      const existingCredential = await credentialModel(context.prisma).findUnique({
        where: { credential_id: credential.id },
        select: { user_id: true },
      })
      if (existingCredential && existingCredential.user_id !== context.user.id) {
        throw new Error('credential_already_registered')
      }
      await credentialModel(context.prisma).upsert({
        where: { credential_id: credential.id },
        create: {
          user_id: context.user.id,
          credential_id: credential.id,
          public_key: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: credential.transports ? JSON.stringify(credential.transports) : null,
          device_type: credentialDeviceType,
          backed_up: credentialBackedUp ? 1 : 0,
        },
        update: {
          public_key: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: credential.transports ? JSON.stringify(credential.transports) : null,
          device_type: credentialDeviceType,
          backed_up: credentialBackedUp ? 1 : 0,
        },
      })
      res.json({ success: true, verified: true })
    } catch (error) {
      sendError(res, error)
    }
  })

  app.post('/api/biometric/authentication/options', async (req, res) => {
    try {
      const context = await requireBiometricUser(req, res)
      if (!context) return
      const { origin, rpID } = resolveWebAuthnContext(req)
      const credentials = await credentialModel(context.prisma).findMany({
        where: { user_id: context.user.id },
      })
      if (credentials.length === 0) throw new Error('biometric_not_enabled')
      const options = await generateAuthenticationOptions({
        rpID,
        timeout: 60_000,
        userVerification: 'required',
        allowCredentials: credentials.map((credential) => ({
          id: credential.credential_id,
          transports: parseTransports(credential.transports),
        })),
      })
      await saveChallenge(context.prisma, {
        userId: context.user.id,
        ceremony: CEREMONY_AUTHENTICATE,
        challenge: options.challenge,
        origin,
        rpID,
      })
      res.json({ success: true, options })
    } catch (error) {
      sendError(res, error)
    }
  })

  app.post('/api/biometric/authentication/verify', async (req, res) => {
    try {
      const context = await requireBiometricUser(req, res)
      if (!context) return
      const credentialId = String(req.body?.response?.id || '')
      const stored = await credentialModel(context.prisma).findFirst({
        where: { user_id: context.user.id, credential_id: credentialId },
      })
      if (!stored) throw new Error('credential_not_found')
      const challenge = await consumeChallenge(
        context.prisma,
        context.user.id,
        CEREMONY_AUTHENTICATE,
      )
      const verification = await verifyAuthenticationResponse({
        response: req.body?.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: challenge.origin,
        expectedRPID: challenge.rp_id,
        requireUserVerification: true,
        credential: {
          id: stored.credential_id,
          publicKey: new Uint8Array(stored.public_key),
          counter: Number(stored.counter),
          transports: parseTransports(stored.transports),
        },
      })
      if (!verification.verified || !verification.authenticationInfo.userVerified) {
        throw new Error('authentication_not_verified')
      }
      await credentialModel(context.prisma).update({
        where: { id: stored.id },
        data: {
          counter: BigInt(verification.authenticationInfo.newCounter),
          last_used_at: new Date(),
        },
      })
      res.json({ success: true, verified: true })
    } catch (error) {
      sendError(res, error)
    }
  })
}
