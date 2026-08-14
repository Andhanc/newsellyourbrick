import { useCallback } from 'react'
import { getClerkInstance, useAuth as useClerkAuth, useClerk, useSSO } from '@clerk/expo'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { useAuth } from '../auth/session'
import AuthPage, {
  type NativeAuthResult,
  type NativeLoginInput,
  type NativeRegisterInput,
  type NativeSessionInput,
  type NativeSocialAuthInput,
} from './auth-page.dom'

function authError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim()
    if (message) return message
  }
  return fallback
}

export function AuthPageScreen() {
  const router = useRouter()
  const { login, register, adoptSession, loginWithClerk } = useAuth()
  const { getToken, isSignedIn } = useClerkAuth()
  const { signOut: clerkSignOut } = useClerk()
  const { startSSOFlow } = useSSO()

  const handleClose = useCallback(async () => {
    router.replace('/')
  }, [router])

  const handleNavigate = useCallback(
    async (path: string) => {
      router.replace(path as never)
    },
    [router],
  )

  const handleLogin = useCallback(
    async (input: NativeLoginInput): Promise<NativeAuthResult> => {
      try {
        const user = await login(input.email, input.password, input.role)
        return { success: true, user }
      } catch (error) {
        return { success: false, error: authError(error, 'Не удалось войти') }
      }
    },
    [login],
  )

  const handleRegister = useCallback(
    async (input: NativeRegisterInput): Promise<NativeAuthResult> => {
      try {
        const user = await register(input)
        return { success: true, user }
      } catch (error) {
        return { success: false, error: authError(error, 'Не удалось зарегистрироваться') }
      }
    },
    [register],
  )

  const handleAuthSuccess = useCallback(
    async (input: NativeSessionInput): Promise<NativeAuthResult> => {
      try {
        const user = await adoptSession(input.user, input.authToken)
        return { success: true, user }
      } catch (error) {
        return { success: false, error: authError(error, 'Не удалось сохранить сессию') }
      }
    },
    [adoptSession],
  )

  const handleSocialAuth = useCallback(
    async (input: NativeSocialAuthInput): Promise<NativeAuthResult> => {
      try {
        let clerkToken = isSignedIn ? await getToken() : null
        if (!clerkToken) {
          const result = await startSSOFlow({
            strategy: input.provider === 'facebook' ? 'oauth_facebook' : 'oauth_google',
            unsafeMetadata: { role: input.role },
          })
          if (!result.createdSessionId || !result.setActive) {
            return { success: false, cancelled: true }
          }
          await result.setActive({ session: result.createdSessionId })
          clerkToken = (await getClerkInstance().session?.getToken()) ?? null
        }
        if (!clerkToken) {
          return { success: false, error: 'Clerk не создал активную сессию' }
        }
        const user = await loginWithClerk({
          clerkToken,
          role: input.role,
          mode: input.mode,
        })
        return { success: true, user }
      } catch (error) {
        await clerkSignOut().catch(() => undefined)
        return {
          success: false,
          error: authError(error, `Не удалось войти через ${input.provider === 'facebook' ? 'Facebook' : 'Google'}`),
        }
      }
    },
    [clerkSignOut, getToken, isSignedIn, loginWithClerk, startSSOFlow],
  )

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <AuthPage
        onClose={handleClose}
        onNavigate={handleNavigate}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onSocialAuth={handleSocialAuth}
        onAuthSuccess={handleAuthSuccess}
        dom={{
          contentInsetAdjustmentBehavior: 'never',
          style: styles.dom,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dom: {
    flex: 1,
    backgroundColor: '#fff',
  },
})
