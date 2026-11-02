import crypto from 'node:crypto'

/** Same digest the email login compares against. */
export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password ?? '')).digest('hex')
}
