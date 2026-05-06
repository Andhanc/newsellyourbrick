import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'
import './styles/buyer-cabinet-scroll.css'
import './i18n/config'
import { getClerkPublishableKey, getGoogleClientId } from './utils/env'

const CONFIG_FETCH_TIMEOUT_MS = 14_000

/** Один in-flight запрос: React StrictMode в dev монтирует эффект дважды. */
let runtimeConfigPromise = null

function AppBootPlaceholder() {
  return (
    <div className="app-root-fill app-html-boot-root" role="status" aria-live="polite">
      <div className="app-html-boot-banner" aria-hidden="true" />
      <p className="app-html-boot-note" lang="ru">
        Загрузка интерфейса…
      </p>
      <div className="app-html-boot-strip" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={`boot-card-${i}`} className="app-html-boot-card" />
        ))}
      </div>
    </div>
  )
}

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

function RootGate() {
  const initialClerkKey = useMemo(() => normalizeKey(getClerkPublishableKey()), [])
  const initialGoogleId = useMemo(() => normalizeKey(getGoogleClientId()), [])
  const [boot, setBoot] = useState(() => ({
    status: initialClerkKey ? 'ready' : 'booting',
    clerkKey: initialClerkKey,
    googleClientId: initialGoogleId,
  }))

  useEffect(() => {
    if (initialClerkKey) return undefined

    let cancelled = false
    ;(async () => {
      const serverConfig = await loadRuntimeConfigOnce()
      if (cancelled) return
      const clerkKey = normalizeKey(serverConfig?.clerkPublishableKey)
      const googleClientId = normalizeKey(serverConfig?.googleClientId) || initialGoogleId
      if (clerkKey) {
        setBoot({ status: 'ready', clerkKey, googleClientId })
      } else {
        setBoot({ status: 'error', clerkKey: '', googleClientId })
        console.error(
          'Missing Clerk Publishable Key: set REACT_APP_CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY for build and server env.',
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initialClerkKey, initialGoogleId])

  if (boot.status === 'booting') {
    return <AppBootPlaceholder />
  }
  if (boot.status === 'error' || !boot.clerkKey) {
    return <ConfigErrorFullPage />
  }

  return (
    <AppWithProviders publishableKey={boot.clerkKey} googleClientId={boot.googleClientId} />
  )
}

const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootGate />
    </React.StrictMode>,
  )
}
