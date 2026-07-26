import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from '../api/client'
import { secureStorage, storage } from '../platform/storage'

export type SessionUser = {
  id: number | string
  name?: string
  email?: string
  role?: string
  phone?: string
  is_verified?: boolean | number
  is_blocked?: boolean | number
}

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string, role?: 'buyer' | 'seller') => Promise<SessionUser>
  register: (input: {
    email: string
    password: string
    name: string
    role?: 'buyer' | 'seller'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const raw = await storage.getItem(USER_KEY)
      if (!raw) {
        setUser(null)
        return
      }
      const parsed = JSON.parse(raw) as SessionUser
      if (!parsed?.id) {
        setUser(null)
        return
      }
      try {
        const fresh = await apiFetch<{ success?: boolean; data?: SessionUser } | SessionUser>(
          `/users/${encodeURIComponent(String(parsed.id))}`,
        )
        const next =
          (fresh as { data?: SessionUser })?.data ||
          ((fresh as SessionUser)?.id ? (fresh as SessionUser) : parsed)
        setUser(next)
        await persistUser(next)
      } catch {
        setUser(parsed)
      }
    } catch {
      setUser(null)
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

  const login = useCallback(async (email: string, password: string, role?: 'buyer' | 'seller') => {
    const result = await apiFetch<{ success?: boolean; user: SessionUser; error?: string }>(
      '/auth/email/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, ...(role ? { role } : {}) }),
      },
    )
    if (!result?.user?.id) {
      throw { message: (result as any)?.error || 'Не удалось войти' }
    }
    await persistUser(result.user)
    setUser(result.user)
    return result.user
  }, [])

  const register = useCallback(
    async (input: { email: string; password: string; name: string; role?: 'buyer' | 'seller' }) => {
      const result = await apiFetch<{ success?: boolean; user: SessionUser; error?: string }>(
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
      await persistUser(result.user)
      setUser(result.user)
      return result.user
    },
    [],
  )

  const logout = useCallback(async () => {
    await persistUser(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
