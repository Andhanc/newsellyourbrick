import type { ReactNode } from 'react'

type ChildrenProps = {
  children?: ReactNode
}

export type NativeClerkUser = {
  id: string
  name?: string
  email?: string
  phone?: string
}

const asyncNoop = async () => undefined

let nativeUser: Record<string, unknown> | null = null
let nativeSignOut: (() => Promise<void>) | null = null

export function setNativeClerkUser(user: NativeClerkUser | null) {
  if (!user) {
    nativeUser = null
    return
  }

  const nameParts = String(user.name || '').trim().split(/\s+/).filter(Boolean)
  const emailAddress = user.email ? { emailAddress: user.email } : null
  const phoneNumber = user.phone ? { phoneNumber: user.phone } : null
  nativeUser = {
    id: String(user.id),
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' '),
    fullName: user.name || '',
    primaryEmailAddress: emailAddress,
    emailAddresses: emailAddress ? [emailAddress] : [],
    primaryPhoneNumber: phoneNumber,
    phoneNumbers: phoneNumber ? [phoneNumber] : [],
  }
}

export function setNativeClerkSignOut(signOut: (() => Promise<void>) | null) {
  nativeSignOut = signOut
}

const signedOutAuth = {
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  sessionId: null,
  actor: null,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  has: () => false,
  getToken: async () => null,
  signOut: asyncNoop,
}

const signedOutSession = {
  session: null,
  isLoaded: true,
  isSignedIn: false,
}

const signedOutSignIn = {
  isLoaded: true,
  signIn: {
    status: null,
    supportedFirstFactors: [],
    supportedSecondFactors: [],
    create: async () => ({ status: null }),
    prepareFirstFactor: async () => ({ status: null }),
    attemptFirstFactor: async () => ({ status: null }),
    prepareSecondFactor: async () => ({ status: null }),
    attemptSecondFactor: async () => ({ status: null }),
    authenticateWithRedirect: asyncNoop,
  },
  setActive: asyncNoop,
}

const signedOutClerk = {
  signOut: asyncNoop,
  openSignIn: asyncNoop,
  openSignUp: asyncNoop,
  closeSignIn: asyncNoop,
  closeSignUp: asyncNoop,
  setActive: asyncNoop,
}

export function ClerkProvider({ children }: ChildrenProps) {
  return <>{children}</>
}

export function SignedIn({ children }: ChildrenProps) {
  return nativeUser ? <>{children}</> : null
}

export function SignedOut({ children }: ChildrenProps) {
  return nativeUser ? null : <>{children}</>
}

export function AuthenticateWithRedirectCallback() {
  return null
}

export function useUser() {
  return {
    user: nativeUser,
    isLoaded: true,
    isSignedIn: Boolean(nativeUser),
  }
}

export function useAuth() {
  return nativeUser
    ? {
        ...signedOutAuth,
        isSignedIn: true,
        userId: String(nativeUser.id || ''),
        signOut: async () => {
          await nativeSignOut?.()
        },
      }
    : signedOutAuth
}

export function useSession() {
  return signedOutSession
}

export function useSignIn() {
  return signedOutSignIn
}

export function useClerk() {
  return {
    ...signedOutClerk,
    signOut: async () => {
      await nativeSignOut?.()
    },
  }
}
