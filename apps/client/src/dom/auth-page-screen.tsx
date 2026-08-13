import { useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { useAuth } from '../auth/session'
import AuthPage, {
  type NativeAuthResult,
  type NativeLoginInput,
  type NativeRegisterInput,
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
  const { login, register } = useAuth()

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

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <AuthPage
        onClose={handleClose}
        onNavigate={handleNavigate}
        onLogin={handleLogin}
        onRegister={handleRegister}
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
