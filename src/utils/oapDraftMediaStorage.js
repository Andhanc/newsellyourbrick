/** IndexedDB for OAP add-property draft media (photos/videos) — survives reload without localStorage quota. */

const DB_NAME = 'oapAddPropertyDraftMediaDB'
const STORE_NAME = 'media'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null)
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('scopeKey', 'scopeKey', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.warn('IndexedDB error in oapDraftMediaStorage:', request.error)
      resolve(null)
    }
  })
}

function mediaRecordId(scopeKey, kind, itemId) {
  return `${scopeKey}::${kind}::${itemId}`
}

function txDone(tx, db) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      try {
        db.close()
      } catch {
        // ignore
      }
      resolve()
    }
    tx.onerror = () => reject(tx.error || new Error('idb transaction failed'))
    tx.onabort = () => reject(tx.error || new Error('idb transaction aborted'))
  })
}

export async function putOapDraftMediaItem({ scopeKey, kind, itemId, blob, name, type, meta = {} }) {
  if (!scopeKey || !kind || !itemId || !blob) return false
  try {
    const db = await openDB()
    if (!db) return false
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({
      id: mediaRecordId(scopeKey, kind, itemId),
      scopeKey: String(scopeKey),
      kind,
      itemId: String(itemId),
      blob,
      name: name || '',
      type: type || blob.type || '',
      meta,
      updatedAt: Date.now(),
    })
    await txDone(tx, db)
    return true
  } catch (e) {
    console.warn('oapDraftMediaStorage put failed:', e)
    return false
  }
}

export async function getOapDraftMediaItem(scopeKey, kind, itemId) {
  try {
    const db = await openDB()
    if (!db) return null
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const record = await new Promise((resolve) => {
      const request = store.get(mediaRecordId(scopeKey, kind, itemId))
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })
    await txDone(tx, db)
    return record
  } catch (e) {
    console.warn('oapDraftMediaStorage get failed:', e)
    return null
  }
}

export async function clearOapDraftMediaScope(scopeKey) {
  if (!scopeKey) return
  try {
    const db = await openDB()
    if (!db) return
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('scopeKey')
    await new Promise((resolve) => {
      const request = index.openCursor(IDBKeyRange.only(String(scopeKey)))
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (!cursor) {
          resolve()
          return
        }
        cursor.delete()
        cursor.continue()
      }
      request.onerror = () => resolve()
    })
    await txDone(tx, db)
  } catch (e) {
    console.warn('oapDraftMediaStorage clear scope failed:', e)
  }
}

/** Keep only the listed item ids for a kind; delete the rest in this scope. */
export async function pruneOapDraftMediaScope(scopeKey, kind, keepItemIds = []) {
  if (!scopeKey) return
  const keep = new Set((keepItemIds || []).map(String))
  try {
    const db = await openDB()
    if (!db) return
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('scopeKey')
    await new Promise((resolve) => {
      const request = index.openCursor(IDBKeyRange.only(String(scopeKey)))
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (!cursor) {
          resolve()
          return
        }
        const value = cursor.value
        if (value?.kind === kind && !keep.has(String(value.itemId))) {
          cursor.delete()
        }
        cursor.continue()
      }
      request.onerror = () => resolve()
    })
    await txDone(tx, db)
  } catch (e) {
    console.warn('oapDraftMediaStorage prune failed:', e)
  }
}

export async function listOapDraftMediaByKind(scopeKey, kind) {
  if (!scopeKey) return []
  try {
    const db = await openDB()
    if (!db) return []
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('scopeKey')
    const records = await new Promise((resolve) => {
      const out = []
      const request = index.openCursor(IDBKeyRange.only(String(scopeKey)))
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (!cursor) {
          resolve(out)
          return
        }
        if (!kind || cursor.value?.kind === kind) out.push(cursor.value)
        cursor.continue()
      }
      request.onerror = () => resolve(out)
    })
    await txDone(tx, db)
    return records
  } catch (e) {
    console.warn('oapDraftMediaStorage list failed:', e)
    return []
  }
}

export async function clearAllOapDraftMedia() {
  try {
    const db = await openDB()
    if (!db) return
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    await txDone(tx, db)
  } catch (e) {
    console.warn('oapDraftMediaStorage clear all failed:', e)
  }
}
