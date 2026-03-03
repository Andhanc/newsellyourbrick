// Простое хранилище фотографий для верификации на базе IndexedDB.
// Позволяет пережить перезагрузку страницы, не используя localStorage.

const DB_NAME = 'verificationPhotosDB'
const STORE_NAME = 'verificationPhotos'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null)
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      console.warn('IndexedDB error in verificationStorage:', request.error)
      resolve(null)
    }
  })
}

export async function saveVerificationPhoto(userId, type, dataUrl) {
  try {
    if (!userId || !dataUrl) return
    const db = await openDB()
    if (!db) return

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const id = `${userId}:${type}`

    store.put({
      id,
      userId: String(userId),
      type,
      dataUrl,
      updatedAt: Date.now()
    })

    // Закрываем соединение после завершения транзакции
    tx.oncomplete = () => {
      db.close()
    }
  } catch (e) {
    console.warn('Не удалось сохранить фото в IndexedDB:', e)
  }
}

export async function loadVerificationPhotos(userId) {
  const empty = {
    passport: null,
    selfie: null,
    selfieWithPassport: null
  }

  try {
    if (!userId) return empty
    const db = await openDB()
    if (!db) return empty

    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    const types = ['passport', 'selfie', 'selfieWithPassport']
    const result = { ...empty }

    await Promise.all(
      types.map(
        (type) =>
          new Promise((resolve) => {
            const id = `${userId}:${type}`
            const request = store.get(id)
            request.onsuccess = () => {
              if (request.result && request.result.dataUrl) {
                result[type] = request.result.dataUrl
              }
              resolve()
            }
            request.onerror = () => resolve()
          })
      )
    )

    tx.oncomplete = () => {
      db.close()
    }

    return result
  } catch (e) {
    console.warn('Не удалось загрузить фото из IndexedDB:', e)
    return empty
  }
}

export async function clearVerificationPhotos(userId) {
  try {
    if (!userId) return
    const db = await openDB()
    if (!db) return

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const types = ['passport', 'selfie', 'selfieWithPassport']

    types.forEach((type) => {
      const id = `${userId}:${type}`
      store.delete(id)
    })

    tx.oncomplete = () => {
      db.close()
    }
  } catch (e) {
    console.warn('Не удалось очистить фото в IndexedDB:', e)
  }
}

