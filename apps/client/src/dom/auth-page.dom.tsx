'use dom'

import './storage-polyfill'
import { useEffect, useRef } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'

import '../legacy/i18n/config'
import '../legacy/App.css'
import '../legacy/components/LoginModal.css'
import LoginModal from '../legacy/components/LoginModal'

const NativeLoginModal = LoginModal as unknown as (props: {
  isOpen: boolean
  onClose: () => void
  authEntryVariant: string
  nativeEmailLogin: (input: NativeLoginInput) => Promise<NativeAuthResult>
  nativeSocialAuth: (input: NativeSocialAuthInput) => Promise<NativeAuthResult>
  nativeAuthSuccess: (input: NativeSessionInput) => Promise<NativeAuthResult>
}) => React.ReactNode

type AuthRole = 'buyer' | 'seller'

export type NativeAuthUser = {
  id: number | string
  name?: string
  email?: string
  phone?: string
  role?: string
}

export type NativeAuthResult = {
  success: boolean
  user?: NativeAuthUser
  error?: string
  cancelled?: boolean
}

export type NativeLoginInput = {
  email: string
  password: string
  role: AuthRole
}

export type NativeRegisterInput = NativeLoginInput & {
  name: string
}

export type NativeSocialAuthInput = {
  provider: 'google' | 'facebook'
  mode: 'login' | 'register'
  role: AuthRole
}

export type NativeSessionInput = {
  user: NativeAuthUser
  authToken?: string | null
}

type AuthPageProps = {
  onClose: () => Promise<void>
  onNavigate: (path: string) => Promise<void>
  onLogin: (input: NativeLoginInput) => Promise<NativeAuthResult>
  onRegister: (input: NativeRegisterInput) => Promise<NativeAuthResult>
  onSocialAuth: (input: NativeSocialAuthInput) => Promise<NativeAuthResult>
  onAuthSuccess: (input: NativeSessionInput) => Promise<NativeAuthResult>
  dom?: import('expo/dom').DOMProps
}

function NavigationBridge({ onNavigate }: Pick<AuthPageProps, 'onNavigate'>) {
  const location = useLocation()
  const lastPath = useRef('/login')
  const currentPath = `${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
    if (currentPath === lastPath.current) return
    lastPath.current = currentPath
    void onNavigate(currentPath)
  }, [currentPath, onNavigate])

  return null
}

function AuthModal({ onClose, onNavigate, onLogin, onSocialAuth, onAuthSuccess }: Omit<AuthPageProps, 'dom'>) {
  return (
    <>
      <NavigationBridge onNavigate={onNavigate} />
      <NativeLoginModal
        isOpen
        onClose={() => void onClose()}
        authEntryVariant="header_wizard"
        nativeEmailLogin={onLogin}
        nativeSocialAuth={onSocialAuth}
        nativeAuthSuccess={onAuthSuccess}
      />
    </>
  )
}

export default function AuthPage(props: AuthPageProps) {
  return (
    <MemoryRouter initialEntries={['/login']}>
      <AuthModal {...props} />
    </MemoryRouter>
  )
}
