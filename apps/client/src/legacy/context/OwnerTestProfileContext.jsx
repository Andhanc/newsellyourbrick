import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getUserData, saveUserData } from '../services/authService'
import { fetchUserById, invalidateUserByIdCache } from '../utils/usersApi'
import {
  buildOwnerTestProfileUpdatePayload,
  getOwnerTestProfileFullName,
  mapOwnerTestProfileFromLocal,
  mergeOwnerTestProfileWithDb,
  OWNER_TEST_API_BASE_URL,
} from '../utils/ownerTestProfile'

const OwnerTestProfileContext = createContext(null)

import { ownerTestT } from '../utils/ownerTestI18n'

export function OwnerTestProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => mapOwnerTestProfileFromLocal(getUserData()))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const userData = getUserData()
      let nextProfile = mapOwnerTestProfileFromLocal(userData)

      const dbUserId = localStorage.getItem('userId')
      if (dbUserId && /^\d+$/.test(dbUserId)) {
        const dbUser = await fetchUserById(OWNER_TEST_API_BASE_URL, dbUserId)
        nextProfile = mergeOwnerTestProfileWithDb(nextProfile, dbUser)
      }

      setProfile(nextProfile)
    } catch (error) {
      console.warn('OwnerTestProfile: не удалось загрузить профиль', error)
      setProfile(mapOwnerTestProfileFromLocal(getUserData()))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateProfile = useCallback((field, value) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev))
  }, [])

  const saveProfile = useCallback(async () => {
    if (!profile) return { success: false, error: 'Профиль не загружен' }

    const dbUserId = localStorage.getItem('userId')
    if (!dbUserId || !/^\d+$/.test(dbUserId)) {
      return { success: false, error: 'Пользователь не авторизован' }
    }

    setSaving(true)
    try {
      const response = await fetch(`${OWNER_TEST_API_BASE_URL}/users/${dbUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildOwnerTestProfileUpdatePayload(profile)),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error || 'Не удалось сохранить профиль',
        }
      }

      invalidateUserByIdCache(OWNER_TEST_API_BASE_URL, dbUserId)

      const userData = getUserData()
      const fullName = getOwnerTestProfileFullName(profile)
      saveUserData(
        {
          ...userData,
          name: fullName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email || userData.email,
          phone: profile.phone || userData.phone,
          phoneFormatted: profile.phone || userData.phoneFormatted,
          country: profile.country || userData.country,
        },
        userData.loginMethod || 'clerk'
      )

      if (result.data) {
        setProfile(mergeOwnerTestProfileWithDb(profile, result.data))
      }

      return { success: true }
    } catch (error) {
      console.error('OwnerTestProfile: ошибка сохранения', error)
      return { success: false, error: 'Ошибка сети при сохранении' }
    } finally {
      setSaving(false)
    }
  }, [profile])

  const value = useMemo(
    () => ({
      profile,
      loading,
      saving,
      fullName: getOwnerTestProfileFullName(profile),
      roleLabel: ownerTestT('ownerTest_roleSeller'),
      updateProfile,
      saveProfile,
      reloadProfile: loadProfile,
    }),
    [profile, loading, saving, updateProfile, saveProfile, loadProfile]
  )

  return (
    <OwnerTestProfileContext.Provider value={value}>{children}</OwnerTestProfileContext.Provider>
  )
}

export function useOwnerTestProfile() {
  const ctx = useContext(OwnerTestProfileContext)
  if (!ctx) {
    throw new Error('useOwnerTestProfile must be used within OwnerTestProfileProvider')
  }
  return ctx
}

export function useOwnerTestProfileOptional() {
  return useContext(OwnerTestProfileContext)
}
