import { useCallback } from 'react'
import { getClerkInstance, useAuth as useClerkAuth, useClerk } from '@clerk/expo'
import { useSSO } from '@clerk/expo/experimental'
import { useSignInWithGoogle } from '@clerk/expo/google'
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

const CLERK_SSO_REDIRECT_URL = 'sellyourbrick://sso-callback'

async function waitForClerkUser() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const clerk = getClerkInstance()
    const user = clerk.user ?? clerk.session?.user ?? null
    if (user) return user
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return null
}

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
  const { isSignedIn } = useClerkAuth()
  const { signOut: clerkSignOut } = useClerk()
  const { startSSOFlow } = useSSO()
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle()

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
        const user = await login(input.email, input.password)
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
        let clerkUser = isSignedIn ? getClerkInstance().user : null
        if (!clerkUser) {
          if (input.provider === 'google') {
            // Android Credential Manager opens the native account chooser immediately.
            // This avoids browser SSO getting stuck before Chrome opens on Samsung devices.
            const result = await startGoogleAuthenticationFlow({
              unsafeMetadata: { role: input.role },
            })
            if (!result.createdSessionId || !result.setActive) {
              return { success: false, cancelled: true }
            }
            await result.setActive({ session: result.createdSessionId })
          } else {
            const result = await startSSOFlow({
              strategy: 'oauth_facebook',
              unsafeMetadata: { role: input.role },
              // Keep the release callback stable and allowlist this exact URL in Clerk.
              redirectUrl: CLERK_SSO_REDIRECT_URL,
              authSessionOptions: { showInRecents: true },
            })
            if (result.authSessionResult?.type !== 'success') {
              return { success: false, cancelled: true }
            }
          }
          clerkUser = await waitForClerkUser()
        }
        if (!clerkUser) {
          return { success: false, error: 'Clerk не вернул профиль активной сессии' }
        }

        const primaryEmail =
          clerkUser.primaryEmailAddress?.emailAddress ||
          clerkUser.emailAddresses?.[0]?.emailAddress ||
          ''
        const primaryPhone =
          clerkUser.primaryPhoneNumber?.phoneNumber ||
          clerkUser.phoneNumbers?.[0]?.phoneNumber ||
          null
        const fullName =
          clerkUser.fullName ||
          `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
          clerkUser.username ||
          primaryEmail.split('@')[0] ||
          'Пользователь'
        const clerkToken = await getClerkInstance().session?.getToken()

        const user = await loginWithClerk({
          clerkUserId: clerkUser.id,
          clerkToken,
          email: primaryEmail,
          name: fullName,
          picture: clerkUser.imageUrl || null,
          phone: primaryPhone,
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
    [clerkSignOut, isSignedIn, loginWithClerk, startGoogleAuthenticationFlow, startSSOFlow],
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
