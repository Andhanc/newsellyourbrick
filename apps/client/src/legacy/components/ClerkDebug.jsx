import { useEffect } from 'react'
import { useAuth, useUser, useSession } from '@clerk/clerk-react'

/**
 * Компонент для диагностики состояния Clerk
 * Помогает понять, что не так с авторизацией
 */
const ClerkDebug = () => {
  const { isSignedIn, isLoaded: authLoaded, userId } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const { session, isLoaded: sessionLoaded } = useSession()

  useEffect(() => {
    console.log('=== CLERK DEBUG INFO ===')
    console.log('Auth loaded:', authLoaded)
    console.log('User loaded:', userLoaded)
    console.log('Session loaded:', sessionLoaded)
    console.log('Is signed in:', isSignedIn)
    console.log('User ID:', userId)
    console.log('Has user object:', !!user)
    console.log('Has session:', !!session)
    
    if (user) {
      console.log('User object:', {
        id: user.id,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        emailAddresses: user.emailAddresses,
        primaryEmailAddress: user.primaryEmailAddress,
        phoneNumbers: user.phoneNumbers,
        primaryPhoneNumber: user.primaryPhoneNumber,
        imageUrl: user.imageUrl,
        profileImageUrl: user.profileImageUrl,
        externalAccounts: user.externalAccounts
      })
    }
    
    if (session) {
      console.log('Session object:', {
        id: session.id,
        status: session.status,
        lastActiveAt: session.lastActiveAt
      })
    }
    
    console.log('Current URL:', window.location.href)
    console.log('URL search params:', window.location.search)
    console.log('========================')
  }, [isSignedIn, user, userLoaded, authLoaded, session, sessionLoaded, userId])

  // Показываем информацию на экране в режиме разработки
  if (import.meta.env?.DEV) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px'
      }}>
        <div><strong>Clerk Debug:</strong></div>
        <div>Auth: {authLoaded ? '✓' : '✗'}</div>
        <div>User: {userLoaded ? '✓' : '✗'}</div>
        <div>Signed In: {isSignedIn ? '✓' : '✗'}</div>
        <div>Has User: {user ? '✓' : '✗'}</div>
        <div>Has Session: {session ? '✓' : '✗'}</div>
      </div>
    )
  }

  return null
}

export default ClerkDebug


