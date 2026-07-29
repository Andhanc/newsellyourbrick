import { Buffer } from 'buffer'
if (typeof globalThis !== 'undefined') globalThis.Buffer = Buffer
if (typeof window !== 'undefined') window.Buffer = Buffer

import React, { Suspense, use, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'
import './styles/drawerDismiss.css'
import { i18nReady } from './i18n/config'
import { getClerkPublishableKey, getGoogleClientId } from './utils/env'

const CONFIG_FETCH_TIMEOUT_MS = 14_000

/** Один in-flight запрос: React StrictMode в dev монтирует эффект дважды. */
let runtimeConfigPromise = null

function ConfigErrorFullPage() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        fontFamily: 'system-ui, sans-serif',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ color: '#856404', marginTop: 0 }}>Ошибка конфигурации</h2>
        <p style={{ color: '#856404', lineHeight: 1.6 }}>
          <strong>Не задан Clerk Publishable Key</strong>
        </p>
        <p style={{ color: '#856404', lineHeight: 1.6 }}>
          Укажите переменную <code>REACT_APP_CLERK_PUBLISHABLE_KEY</code> или{' '}
          <code>VITE_CLERK_PUBLISHABLE_KEY</code> при сборке{' '}
          <em>и</em> в окружении сервера (для <code>GET /api/config</code>), затем перезапустите приложение.
        </p>
        <p style={{ color: '#856404', lineHeight: 1.6, marginBottom: 0 }}>
          Откройте консоль браузера для подробностей.
        </p>
      </div>
    </div>
  )
}

async function loadConfigFromServer(timeoutMs = CONFIG_FETCH_TIMEOUT_MS) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer =
    controller &&
    window.setTimeout(() => {
      controller.abort()
    }, timeoutMs)
  try {
    const response = await fetch('/api/config', {
      signal: controller?.signal,
      credentials: 'same-origin',
    })
    if (!response.ok) return null
    const data = await response.json()
    if (data.success && data.data) {
      return data.data
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.error('Таймаут загрузки /api/config:', timeoutMs, 'ms')
    } else {
      console.error('Ошибка загрузки конфигурации с сервера:', error)
    }
  } finally {
    if (timer != null) window.clearTimeout(timer)
  }
  return null
}

function loadRuntimeConfigOnce() {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadConfigFromServer()
  }
  return runtimeConfigPromise
}

/** @param {unknown} v */
function normalizeKey(v) {
  return typeof v === 'string' ? v.trim() : ''
}

/** Параллельный старт /api/config до первого commit React, если ключа нет в бандле. */
if (typeof window !== 'undefined' && !normalizeKey(getClerkPublishableKey())) {
  void loadRuntimeConfigOnce()
}

/** Лёгкий экран до Clerk config с сервера (тот же фон, что в index.html — без пустого белого кадра). */
function ConfigBootFallback() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#fafafa',
      }}
      aria-busy="true"
      aria-label="Загрузка"
    />
  )
}

function AppWithProviders({ publishableKey, googleClientId }) {
  const Wrapper = () => {
    if (googleClientId) {
      return (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      )
    }
    return <App />
  }
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/"
      afterSignInUrl="/oauth-bridge"
      afterSignUpUrl="/oauth-bridge"
    >
      <Wrapper />
    </ClerkProvider>
  )
}

/**
 * Ключ Clerk только с GET /api/config (в сборке пусто). Suspense + use(): без экрана «Загрузка интерфейса».
 */
function RootGateFromServer({ initialGoogleId }) {
  const serverConfig = use(loadRuntimeConfigOnce())
  const clerkKey = normalizeKey(serverConfig?.clerkPublishableKey)
  const googleClientId = normalizeKey(serverConfig?.googleClientId) || initialGoogleId
  if (!clerkKey) {
    console.error(
      'Missing Clerk Publishable Key: set REACT_APP_CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY for build and server env.',
    )
    return <ConfigErrorFullPage />
  }
  return <AppWithProviders publishableKey={clerkKey} googleClientId={googleClientId} />
}

function RootGate() {
  use(i18nReady)
  const initialClerkKey = useMemo(() => normalizeKey(getClerkPublishableKey()), [])
  const initialGoogleId = useMemo(() => normalizeKey(getGoogleClientId()), [])

  if (initialClerkKey) {
    return (
      <AppWithProviders publishableKey={initialClerkKey} googleClientId={initialGoogleId} />
    )
  }

  return (
    <Suspense fallback={<ConfigBootFallback />}>
      <RootGateFromServer initialGoogleId={initialGoogleId} />
    </Suspense>
  )
}

const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Suspense fallback={<ConfigBootFallback />}>
        <RootGate />
      </Suspense>
    </React.StrictMode>,
  )
}
