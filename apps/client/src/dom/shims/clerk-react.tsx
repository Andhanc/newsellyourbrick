import type { ReactNode } from 'react'

type ChildrenProps = {
  children?: ReactNode
}

const asyncNoop = async () => undefined

const signedOutUser = {
  user: null,
  isLoaded: true,
  isSignedIn: false,
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

export function SignedIn() {
  return null
}

export function SignedOut({ children }: ChildrenProps) {
  return <>{children}</>
}

export function AuthenticateWithRedirectCallback() {
  return null
}

export function useUser() {
  return signedOutUser
}

export function useAuth() {
  return signedOutAuth
}

export function useSession() {
  return signedOutSession
}

export function useSignIn() {
  return signedOutSignIn
}

export function useClerk() {
  return signedOutClerk
}
