import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const memory = new Map<string, string>()

async function webLocalGet(key: string) {
  if (typeof localStorage === 'undefined') return memory.get(key) ?? null
  return localStorage.getItem(key)
}

async function webLocalSet(key: string, value: string) {
  if (typeof localStorage === 'undefined') {
    memory.set(key, value)
    return
  }
  localStorage.setItem(key, value)
}

async function webLocalRemove(key: string) {
  if (typeof localStorage === 'undefined') {
    memory.delete(key)
    return
  }
  localStorage.removeItem(key)
}

/** Non-sensitive key/value storage. */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webLocalGet(key)
    return AsyncStorage.getItem(key)
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return webLocalSet(key, value)
    await AsyncStorage.setItem(key, value)
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return webLocalRemove(key)
    await AsyncStorage.removeItem(key)
  },
}

/** Sensitive values (tokens). Falls back to AsyncStorage on web. */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webLocalGet(key)
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return AsyncStorage.getItem(key)
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return webLocalSet(key, value)
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      await AsyncStorage.setItem(key, value)
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return webLocalRemove(key)
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      await AsyncStorage.removeItem(key)
    }
  },
}
