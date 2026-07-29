import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { getUserData, saveUserData } from '../services/authService'
import { fetchUserById } from '../utils/usersApi'
import { OWNER_TEST_API_BASE_URL } from '../utils/ownerTestProfile'

function resolvePhotoPath(photoPath, apiBaseUrl = OWNER_TEST_API_BASE_URL) {
  if (!photoPath) return null
  if (String(photoPath).startsWith('http')) return photoPath
  const baseUrl = apiBaseUrl.replace(/\/api$/, '')
  const normalizedPath = String(photoPath).startsWith('/') ? photoPath : `/${photoPath}`
  return `${baseUrl}${normalizedPath}`
}

async function loadOwnerTestUserPhoto(clerkUser) {
  const clerkPhoto = clerkUser?.imageUrl || clerkUser?.profileImageUrl || null
  if (clerkPhoto) return clerkPhoto

  const userData = getUserData()
  if (userData?.picture) return userData.picture

  const dbUserId = localStorage.getItem('userId')
  if (!dbUserId || !/^\d+$/.test(dbUserId)) return null

  try {
    const result = await fetchUserById(OWNER_TEST_API_BASE_URL, dbUserId, { includeMeta: true })
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
  const [photoUrl, setPhotoUrl] = useState(null)

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

    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [isLoaded, user])

  return photoUrl
}
