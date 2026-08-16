import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiFetch } from '../api/client'
import { secureStorage, storage } from '../platform/storage'
import { unregisterStoredPushNotifications } from '../notifications/push'

export type SessionUser = {
  id: number | string
  name?: string
  email?: string
  role?: string
  phone?: string
  picture?: string
  clerkUserId?: string
  is_verified?: boolean | number
  is_blocked?: boolean | number
}

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  register: (input: {
    email: string
    password: string
    name: string
    role?: 'buyer' | 'seller'
  }) => Promise<SessionUser>
  adoptSession: (user: SessionUser, authToken?: string | null) => Promise<SessionUser>
  loginWithClerk: (input: {
    clerkUserId: string
    clerkToken?: string | null
    email: string
    name: string
    picture?: string | null
    phone?: string | null
    role: 'buyer' | 'seller'
    mode: 'login' | 'register'
  }) => Promise<SessionUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'userData'
const USER_ID_KEY = 'userId'
const USER_ROLE_KEY = 'userRole'
const OWNER_FLAG = 'isOwnerLoggedIn'
const ADMIN_FLAG = 'isAdminLoggedIn'

async function persistUser(user: SessionUser | null) {
  if (!user) {
    await storage.removeItem(USER_KEY)
    await storage.removeItem(USER_ID_KEY)
    await storage.removeItem(USER_ROLE_KEY)
    await storage.removeItem(OWNER_FLAG)
    await storage.removeItem(ADMIN_FLAG)
    await secureStorage.removeItem('authToken')
    return
  }
  await storage.setItem(USER_KEY, JSON.stringify(user))
  await storage.setItem(USER_ID_KEY, String(user.id))
  const role = String(user.role || 'client').toLowerCase()
  await storage.setItem(USER_ROLE_KEY, role)
  if (role === 'seller' || role === 'owner') {
    await storage.setItem(OWNER_FLAG, 'true')
  } else {
    await storage.removeItem(OWNER_FLAG)
  }
  if (role === 'admin') {
    await storage.setItem(ADMIN_FLAG, 'true')
  } else {
    await storage.removeItem(ADMIN_FLAG)
  }
}

export function AuthProvider({
  children,
  clerkSignOut,
}: {
  children: ReactNode
  clerkSignOut?: () => Promise<unknown>
}) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const sessionEpochRef = useRef(0)

  const refresh = useCallback(async () => {
    const sessionEpoch = ++sessionEpochRef.current
    try {
      const raw = await storage.getItem(USER_KEY)
      if (!raw) {
        if (sessionEpochRef.current === sessionEpoch) setUser(null)
        return
      }
      const parsed = JSON.parse(raw) as SessionUser
      if (!parsed?.id) {
        if (sessionEpochRef.current === sessionEpoch) setUser(null)
        return
      }

      // Restore the device session before touching the network. Protected native
      // screens must never interpret a slow Railway request as a signed-out user.
      if (sessionEpochRef.current === sessionEpoch) setUser(parsed)

      // Refresh profile fields in the background. A failed or stale response must
      // not clear or resurrect a session; only the explicit logout path does that.
      void apiFetch<{ success?: boolean; data?: SessionUser } | SessionUser>(
        `/users/${encodeURIComponent(String(parsed.id))}`,
      )
        .then((fresh) => {
          if (sessionEpochRef.current !== sessionEpoch) return
          const next =
            (fresh as { data?: SessionUser })?.data ||
            ((fresh as SessionUser)?.id ? (fresh as SessionUser) : parsed)
          setUser(next)
        })
        .catch(() => undefined)
    } catch {
      if (sessionEpochRef.current === sessionEpoch) setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await refresh()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const sessionEpoch = ++sessionEpochRef.current
    const result = await apiFetch<{ success?: boolean; user: SessionUser; authToken?: string; error?: string }>(
      '/auth/email/login',
      {
        method: 'POST',
        // Match the Vite login exactly: the backend resolves the user's real cabinet role.
        body: JSON.stringify({ email, password }),
      },
    )
    if (!result?.user?.id) {
      throw { message: (result as any)?.error || 'Не удалось войти' }
    }
    if (result.authToken) {
      await secureStorage.setItem('authToken', result.authToken)
    } else {
      // Backward compatibility while Railway is still running the pre-mobile-session release.
      // Login itself is valid; push registration starts automatically after backend deployment.
      await secureStorage.removeItem('authToken')
    }
    await persistUser(result.user)
    if (sessionEpochRef.current === sessionEpoch) setUser(result.user)
    return result.user
  }, [])

  const register = useCallback(
    async (input: { email: string; password: string; name: string; role?: 'buyer' | 'seller' }) => {
      const sessionEpoch = ++sessionEpochRef.current
      const result = await apiFetch<{ success?: boolean; user: SessionUser; authToken?: string; error?: string }>(
        '/auth/email/register',
        {
          method: 'POST',
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            name: input.name,
            role: input.role || 'buyer',
          }),
        },
      )
      if (!result?.user?.id) {
        throw { message: (result as any)?.error || 'Не удалось зарегистрироваться' }
      }
      if (result.authToken) {
        await secureStorage.setItem('authToken', result.authToken)
      } else {
        await secureStorage.removeItem('authToken')
      }
      await persistUser(result.user)
      if (sessionEpochRef.current === sessionEpoch) setUser(result.user)
      return result.user
    },
    [],
  )

  const adoptSession = useCallback(async (nextUser: SessionUser, authToken?: string | null) => {
    const sessionEpoch = ++sessionEpochRef.current
    if (!nextUser?.id) throw { message: 'Backend не вернул пользователя' }
    if (authToken) {
      await secureStorage.setItem('authToken', authToken)
    } else {
      await secureStorage.removeItem('authToken')
    }
    await persistUser(nextUser)
    if (sessionEpochRef.current === sessionEpoch) setUser(nextUser)
    return nextUser
  }, [])

  const loginWithClerk = useCallback(
    async (input: {
      clerkUserId: string
      clerkToken?: string | null
      email: string
      name: string
      picture?: string | null
      phone?: string | null
      role: 'buyer' | 'seller'
      mode: 'login' | 'register'
    }) => {
      type WebUser = SessionUser & {
        first_name?: string
        last_name?: string
        phone_number?: string | null
        user_photo?: string | null
      }

      const email = String(input.email || '').trim().toLowerCase()
      if (!email) throw { message: 'Clerk не вернул email пользователя' }

      // The deployed mobile exchange is the authoritative path: Railway verifies the
      // Clerk JWT, applies login/register semantics and returns the long-lived token
      // required by protected mobile APIs such as push-token registration.
      if (input.clerkToken) {
        try {
          const mobileSession = await apiFetch<{
            success?: boolean
            user?: SessionUser
            authToken?: string | null
            error?: string
          }>('/auth/clerk/mobile', {
            method: 'POST',
            token: input.clerkToken,
            body: JSON.stringify({ role: input.role, mode: input.mode }),
          })
          if (!mobileSession?.user?.id) {
            throw { message: mobileSession?.error || 'Backend не вернул пользователя' }
          }
          return adoptSession(mobileSession.user, mobileSession.authToken)
        } catch (error) {
          const apiError = error as { status?: number; body?: { code?: string } }
          // Keep auth operational while Railway is still serving the release that
          // predates /api/auth/clerk/mobile. A semantic 404 (NEED_REGISTER) must not
          // fall through, because it is a real answer from the new endpoint.
          if (apiError?.status !== 404 || apiError?.body?.code) throw error
        }
      }

      const fullName = String(input.name || '').trim() || email.split('@')[0] || 'Пользователь'
      const [firstName, ...lastNameParts] = fullName.split(/\s+/).filter(Boolean)
      const phoneDigits = String(input.phone || '').replace(/\D/g, '')
      const result = await apiFetch<{
        success?: boolean
        data?: WebUser
        error?: string
      }>('/users', {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName || 'Пользователь',
          last_name: lastNameParts.join(' '),
          email,
          phone_number: phoneDigits || null,
          role: input.role,
          is_verified: 0,
          is_online: 1,
          ...(input.picture ? { user_photo: input.picture } : {}),
        }),
      })

      if (!result?.data?.id) {
        throw { message: result?.error || 'Не удалось связать Clerk с профилем' }
      }

      const dbUser = result.data
      return adoptSession({
        ...dbUser,
        id: dbUser.id,
        name:
          dbUser.name ||
          `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() ||
          fullName,
        email: dbUser.email || email,
        phone: dbUser.phone || dbUser.phone_number || input.phone || undefined,
        role: dbUser.role || input.role,
        picture: dbUser.picture || dbUser.user_photo || input.picture || undefined,
        clerkUserId: input.clerkUserId,
      }, null)
    },
    [adoptSession],
  )

  const logout = useCallback(async () => {
    ++sessionEpochRef.current
    const authToken = await secureStorage.getItem('authToken')
    await unregisterStoredPushNotifications(authToken)
    if (authToken) {
      await apiFetch('/auth/mobile/logout', { method: 'POST', token: authToken }).catch(() => undefined)
    }
    await clerkSignOut?.().catch(() => undefined)
    await persistUser(null)
    setUser(null)
  }, [clerkSignOut])

  const value = useMemo(
    () => ({ user, loading, login, register, adoptSession, loginWithClerk, logout, refresh }),
    [user, loading, login, register, adoptSession, loginWithClerk, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
