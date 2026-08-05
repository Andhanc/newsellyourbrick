import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { CLERK_DB_USER_SYNCED, getStoredNumericUserId, getUserData, saveUserData } from '../services/authService'
import { fetchUserById } from '../utils/usersApi'
import { OWNER_TEST_API_BASE_URL } from '../utils/ownerTestProfile'

function resolvePhotoPath(photoPath, apiBaseUrl = OWNER_TEST_API_BASE_URL) {
  if (!photoPath) return null
  if (String(photoPath).startsWith('http') || String(photoPath).startsWith('data:')) {
    return photoPath
  }
  const baseUrl = String(apiBaseUrl).replace(/\/api\/?$/, '')
  const normalizedPath = String(photoPath).startsWith('/') ? photoPath : `/${photoPath}`
  return `${baseUrl}${normalizedPath}`
}

async function loadOwnerTestUserPhoto(clerkUser) {
  const userData = getUserData()
  const storedPicture = userData?.picture ? resolvePhotoPath(userData.picture) : null
  const clerkPhoto = clerkUser?.imageUrl || clerkUser?.profileImageUrl || null

  // Сначала локально сохранённое / загруженное в профиль фото, затем Clerk
  if (storedPicture) return storedPicture
  if (clerkPhoto) return clerkPhoto

  const dbUserId = getStoredNumericUserId()
  if (!dbUserId) return null

  try {
    const result = await fetchUserById(OWNER_TEST_API_BASE_URL, dbUserId, {
      includeMeta: true,
      force: true,
    })
    if (!result.ok || !result.user?.user_photo) return null

    const photo = resolvePhotoPath(result.user.user_photo)
    if (photo && userData) {
      saveUserData({ ...userData, picture: photo }, userData.loginMethod || 'clerk')
    }
    return photo
  } catch (error) {
    console.warn('useOwnerTestUserPhoto: не удалось загрузить фото из БД', error)
    return null
  }
}

export function useOwnerTestUserPhoto() {
  const { user, isLoaded } = useUser()
  const [photoUrl, setPhotoUrl] = useState(() => {
    const stored = getUserData()?.picture
    return stored ? resolvePhotoPath(stored) : null
  })

  useEffect(() => {
    if (!isLoaded) return undefined

    let cancelled = false

    const load = async () => {
      const photo = await loadOwnerTestUserPhoto(user)
      if (!cancelled) setPhotoUrl(photo)
    }

    load()

    const onFocus = () => {
      load()
    }

    const onUserSynced = () => {
      load()
    }

    window.addEventListener('focus', onFocus)
    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    }
  }, [isLoaded, user?.id, user?.imageUrl])

  return photoUrl
}
