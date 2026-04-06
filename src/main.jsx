import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'
import './styles/buyer-cabinet-scroll.css'
import './i18n/config'
import { getClerkPublishableKey, getGoogleClientId } from './utils/env'

// Функция для загрузки конфигурации с сервера (runtime)
async function loadConfigFromServer() {
  try {
    const response = await fetch('/api/config')
    const data = await response.json()
    if (data.success && data.data) {
      return data.data
    }
  } catch (error) {
    console.error('Ошибка загрузки конфигурации с сервера:', error)
  }
  return null
}

// Функция для отображения ошибки
function showError() {
  const errorMessage = `
    ⚠️ Missing Clerk Publishable Key!
    
    Please set one of the following environment variables:
    - REACT_APP_CLERK_PUBLISHABLE_KEY
    - VITE_CLERK_PUBLISHABLE_KEY
    
    For Railway deployment:
    1. Go to Railway Dashboard → Your Project → Variables
    2. Add: REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
    3. Railway will automatically restart your app
    
    For local development:
    Create .env.local file with: REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
  `
  console.error(errorMessage)
  
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; padding: 20px;">
      <div style="max-width: 600px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 24px;">
        <h2 style="color: #856404; margin-top: 0;">⚠️ Configuration Error</h2>
        <p style="color: #856404; line-height: 1.6;">
          <strong>Missing Clerk Publishable Key</strong>
        </p>
        <p style="color: #856404; line-height: 1.6;">
          Please set <code>REACT_APP_CLERK_PUBLISHABLE_KEY</code> or <code>VITE_CLERK_PUBLISHABLE_KEY</code> environment variable.
        </p>
        <p style="color: #856404; line-height: 1.6;">
          <strong>For Railway:</strong> Go to Dashboard → Variables → Add the key
        </p>
        <p style="color: #856404; line-height: 1.6; margin-bottom: 0;">
          Check the browser console for more details.
        </p>
      </div>
    </div>
  `
}

// Инициализация приложения
async function initApp() {
  // Поддержка как REACT_APP_ (Create React App), так и VITE_ (Vite)
  let GOOGLE_CLIENT_ID = getGoogleClientId()
  let PUBLISHABLE_KEY = getClerkPublishableKey()

  // Если переменные не установлены во время сборки, загружаем их с сервера (runtime)
  if (!PUBLISHABLE_KEY) {
    console.log('⚠️ Clerk Publishable Key не найден во время сборки, загружаем с сервера...')
    const serverConfig = await loadConfigFromServer()
    if (serverConfig && serverConfig.clerkPublishableKey) {
      PUBLISHABLE_KEY = serverConfig.clerkPublishableKey
      GOOGLE_CLIENT_ID = serverConfig.googleClientId || GOOGLE_CLIENT_ID
      console.log('✅ Конфигурация загружена с сервера')
    } else {
      showError()
      return
    }
  }

  if (!PUBLISHABLE_KEY) {
    showError()
    return
  }

  // Оборачиваем App в GoogleOAuthProvider только если client_id установлен
  const AppWrapper = () => {
    if (GOOGLE_CLIENT_ID) {
      return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <App />
        </GoogleOAuthProvider>
      )
    }
    return <App />
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ClerkProvider 
        publishableKey={PUBLISHABLE_KEY} 
        afterSignOutUrl="/"
        afterSignInUrl="/oauth-bridge"
        afterSignUpUrl="/oauth-bridge"
      >
        <AppWrapper />
      </ClerkProvider>
    </React.StrictMode>,
  )
}

// Запускаем приложение
initApp()
