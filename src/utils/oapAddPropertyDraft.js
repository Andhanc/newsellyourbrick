import {
  clearAllOapDraftMedia,
  clearOapDraftMediaScope,
  getOapDraftMediaItem,
  listOapDraftMediaByKind,
  pruneOapDraftMediaScope,
  putOapDraftMediaItem,
} from './oapDraftMediaStorage.js'

const OAP_DRAFT_KEY_PREFIX = 'ownerTest_addPropertyDraft'
const OAP_DRAFT_SESSION_KEY = 'ownerTest_addPropertyDraft_session'
const OAP_DRAFT_SAVE_SUPPRESS_KEY = 'ownerTest_addPropertyDraft_suppressSave'
const OAP_DRAFT_SAVE_DEBOUNCE_MS = 600
const OAP_DRAFT_VERSION = 1

export { OAP_DRAFT_SAVE_DEBOUNCE_MS, OAP_DRAFT_SESSION_KEY, OAP_DRAFT_KEY_PREFIX }

/** Block draft writes for a short window after successful publish (in-flight saves). */
export function suppressOapDraftSaves(durationMs = 4000) {
  try {
    sessionStorage.setItem(OAP_DRAFT_SAVE_SUPPRESS_KEY, String(Date.now() + durationMs))
  } catch {
    // ignore
  }
}

export function isOapDraftSaveSuppressed() {
  try {
    const until = Number(sessionStorage.getItem(OAP_DRAFT_SAVE_SUPPRESS_KEY) || 0)
    if (!Number.isFinite(until) || until <= 0) return false
    if (Date.now() > until) {
      sessionStorage.removeItem(OAP_DRAFT_SAVE_SUPPRESS_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function getOapDraftKey() {
  if (typeof localStorage === 'undefined') return OAP_DRAFT_KEY_PREFIX
  const userId = localStorage.getItem('userId')
  return userId ? `${OAP_DRAFT_KEY_PREFIX}_${userId}` : OAP_DRAFT_KEY_PREFIX
}

/** Все возможные ключи черновика (с userId и без) — чтобы не потерять данные при смене сессии. */
export function listOapDraftKeys() {
  const keys = new Set([OAP_DRAFT_KEY_PREFIX, getOapDraftKey()])
  if (typeof localStorage === 'undefined') return [...keys]
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${OAP_DRAFT_KEY_PREFIX}`)) keys.add(key)
    }
  } catch {
    // ignore
  }
  return [...keys]
}

export function loadOapDraft(draftKey = getOapDraftKey()) {
  try {
    const raw = localStorage.getItem(draftKey)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveOapDraftPayload(payload, draftKey = getOapDraftKey()) {
  if (isOapDraftSaveSuppressed()) return
  try {
    localStorage.setItem(draftKey, JSON.stringify({ ...payload, version: OAP_DRAFT_VERSION }))
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      try {
        // Keep IndexedDB media refs; drop bulky dataUrls/docs that blow localStorage quota.
        const slimPhotos = (payload.photos || [])
          .map((photo) => {
            if (!photo) return null
            if (photo.storage === 'idb' || photo.preview) {
              const { dataUrl, ...rest } = photo
              return rest
            }
            return null
          })
          .filter(Boolean)
        const slimVideos = (payload.videos || [])
          .map((video) => {
            if (!video) return null
            if (video.storage === 'idb' || video.type === 'youtube' || video.type === 'googledrive') {
              const { url, dataUrl, file, ...rest } = video
              if (video.storage === 'idb') return rest
              return {
                ...rest,
                url: typeof video.url === 'string' && !video.url.startsWith('data:') ? video.url : undefined,
              }
            }
            return null
          })
          .filter(Boolean)

        const slimDoc = (doc) => {
          if (!doc) return null
          if (doc.storage === 'idb') {
            const { dataUrl, url, file, ...rest } = doc
            return rest
          }
          return null
        }

        localStorage.setItem(
          draftKey,
          JSON.stringify({
            ...payload,
            version: OAP_DRAFT_VERSION,
            photos: slimPhotos,
            videos: slimVideos,
            additionalDocuments: (payload.additionalDocuments || []).map(slimDoc).filter(Boolean),
            requiredDocuments: {
              ownership: slimDoc(payload.requiredDocuments?.ownership),
              noDebts: slimDoc(payload.requiredDocuments?.noDebts),
            },
          }),
        )
      } catch {
        // ignore
      }
    }
  }
}

export function clearOapDraft(draftKey = getOapDraftKey()) {
  const keys = listOapDraftKeys()
  try {
    for (const key of keys) {
      if (key === draftKey || key === OAP_DRAFT_KEY_PREFIX || key.startsWith(`${OAP_DRAFT_KEY_PREFIX}_`)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(OAP_DRAFT_SESSION_KEY)
  } catch {
    // ignore
  }
  void Promise.all([
    ...keys.map((key) => clearOapDraftMediaScope(key)),
    clearAllOapDraftMedia(),
  ]).catch(() => {})
}

/** Clear draft after successful publish and block immediate re-saves from in-flight effects. */
export function clearOapDraftAfterPublish(draftKey = getOapDraftKey()) {
  suppressOapDraftSaves()
  clearOapDraft(draftKey)
}

const FORM_KEYS_IGNORED_FOR_MEANING = new Set([
  'calculatorApplied',
  'pricingFieldSource',
  'testDriveCurrency',
  'listingCurrency',
  'coordinates',
])

function isMeaningfulFormValue(value) {
  if (value == null || value === '') return false
  if (typeof value === 'boolean') return value === true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export function hasMeaningfulDraftData(draft) {
  if (!draft) return false
  if (
    draft.form &&
    Object.entries(draft.form).some(
      ([key, value]) => !FORM_KEYS_IGNORED_FOR_MEANING.has(key) && isMeaningfulFormValue(value),
    )
  ) {
    return true
  }
  if (typeof draft.step === 'number' && draft.step > 1) return true
  if (typeof draft.mobileScreen === 'number' && draft.mobileScreen > 1) return true
  if (Array.isArray(draft.photos) && draft.photos.length > 0) return true
  if (Array.isArray(draft.videos) && draft.videos.length > 0) return true
  if (Array.isArray(draft.selectedAmenities) && draft.selectedAmenities.length > 0) return true
  if (draft.requiredDocuments?.ownership || draft.requiredDocuments?.noDebts) return true
  if (Array.isArray(draft.additionalDocuments) && draft.additionalDocuments.length > 0) return true
  return false
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('read'))
    reader.readAsDataURL(file)
  })
}

async function dataUrlToFile(dataUrl, name, mimeType) {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], name || 'file', { type: mimeType || blob.type || 'application/octet-stream' })
}

function fileFromMediaRecord(record, fallbackName, fallbackType) {
  return new File([record.blob], record.name || fallbackName, {
    type: record.type || fallbackType || record.blob.type || 'application/octet-stream',
  })
}

async function blobFromDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null
  try {
    return await (await fetch(dataUrl)).blob()
  } catch {
    return null
  }
}

async function serializeDocForDraft(doc, scopeKey = getOapDraftKey(), role = 'additional') {
  if (!doc) return null

  const itemId = doc.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  let blob = doc.file instanceof Blob ? doc.file : null
  let name = doc.name || doc.file?.name || 'document'
  let mime = doc.file?.type || doc.docMime || ''
  const docType = doc.type || (mime.startsWith('image/') ? 'image' : 'pdf')

  if (!blob) blob = await blobFromDataUrl(doc.url)
  if (!blob) blob = await blobFromDataUrl(doc.dataUrl)
  if (blob && !mime) mime = blob.type

  if (blob) {
    const saved = await putOapDraftMediaItem({
      scopeKey,
      kind: 'document',
      itemId,
      blob,
      name,
      type: mime || blob.type || 'application/pdf',
      meta: { docType, role },
    })
    if (saved) {
      return {
        id: itemId,
        name,
        type: docType,
        docMime: mime || blob.type || 'application/pdf',
        storage: 'idb',
        role,
      }
    }
    try {
      const dataUrl = await fileToDataUrl(blob)
      return { id: itemId, name, type: docType, docMime: mime || blob.type, dataUrl, role }
    } catch {
      return null
    }
  }

  if (doc.storage === 'idb' && doc.id) {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      docMime: doc.docMime,
      storage: 'idb',
      role,
    }
  }

  return null
}

function restoredDocFromFile(file, serialized, dataUrl) {
  const isImage = file.type.startsWith('image/') || serialized?.type === 'image'
  return {
    id: serialized?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: serialized?.name || file.name,
    file,
    type: serialized?.type || (isImage ? 'image' : 'pdf'),
    preview: isImage ? URL.createObjectURL(file) : '',
    url: dataUrl || '',
  }
}

async function restoreDocFromDraft(serialized, scopeKey = getOapDraftKey()) {
  if (!serialized) return null

  if (serialized.storage === 'idb' && serialized.id) {
    const scopeCandidates = [...new Set([scopeKey, ...listOapDraftKeys()].filter(Boolean))]
    for (const key of scopeCandidates) {
      try {
        const record = await getOapDraftMediaItem(key, 'document', serialized.id)
        if (!record?.blob) continue
        const file = fileFromMediaRecord(
          record,
          serialized.name || 'document',
          serialized.docMime || 'application/pdf',
        )
        return restoredDocFromFile(file, { ...serialized, type: record.meta?.docType || serialized.type })
      } catch {
        // try next scope
      }
    }
  }

  if (!serialized.dataUrl) return null
  try {
    const file = await dataUrlToFile(
      serialized.dataUrl,
      serialized.name || 'document',
      serialized.docMime || 'application/pdf',
    )
    return restoredDocFromFile(file, serialized, serialized.dataUrl)
  } catch {
    return null
  }
}

async function serializeDocumentsForDraft(requiredDocuments, additionalDocuments, scopeKey) {
  const [ownership, noDebts, additional] = await Promise.all([
    serializeDocForDraft(requiredDocuments?.ownership, scopeKey, 'ownership'),
    serializeDocForDraft(requiredDocuments?.noDebts, scopeKey, 'noDebts'),
    Promise.all(
      (additionalDocuments || []).map((doc) => serializeDocForDraft(doc, scopeKey, 'additional')),
    ),
  ])
  const extra = additional.filter(Boolean)
  const keepIds = [ownership?.id, noDebts?.id, ...extra.map((doc) => doc.id)].filter(Boolean)
  await pruneOapDraftMediaScope(scopeKey, 'document', keepIds)
  return { ownership, noDebts, additional: extra }
}

function restoredDocFromRecord(record) {
  if (!record?.blob) return null
  const file = fileFromMediaRecord(record, record.name || 'document', record.type || 'application/pdf')
  return restoredDocFromFile(file, {
    id: record.itemId,
    name: record.name || file.name,
    type: record.meta?.docType,
  })
}

async function restoreDocumentsFromIdbFallback(scopeKey, current) {
  const next = {
    ownership: current.ownership,
    noDebts: current.noDebts,
    additional: [...(current.additional || [])],
  }
  if (next.ownership && next.noDebts && next.additional.length > 0) return next

  const scopeCandidates = [...new Set([scopeKey, ...listOapDraftKeys()].filter(Boolean))]
  for (const key of scopeCandidates) {
    const records = await listOapDraftMediaByKind(key, 'document')
    if (!records.length) continue
    for (const record of records) {
      const role = record.meta?.role
      const doc = restoredDocFromRecord(record)
      if (!doc) continue
      if (role === 'ownership' && !next.ownership) next.ownership = doc
      else if (role === 'noDebts' && !next.noDebts) next.noDebts = doc
      else if (role === 'additional' && !next.additional.some((item) => item.id === doc.id)) {
        next.additional.push(doc)
      }
    }
    if (next.ownership || next.noDebts || next.additional.length) break
  }
  return next
}

async function serializePhotosForDraft(photos, scopeKey = getOapDraftKey()) {
  const out = []
  const keepIds = []

  for (const photo of photos || []) {
    if (typeof photo?.preview === 'string' && (photo.preview.startsWith('http') || photo.preview.startsWith('/'))) {
      out.push({
        id: photo.id,
        preview: photo.preview,
        fromPurchased: Boolean(photo.fromPurchased),
      })
      continue
    }

    const itemId = photo?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    let blob = photo?.file instanceof Blob ? photo.file : null
    let name = photo?.file?.name || photo?.name || 'photo.jpg'
    let type = photo?.file?.type || photo?.type || ''

    if (!blob && typeof photo?.dataUrl === 'string' && photo.dataUrl.startsWith('data:')) {
      try {
        blob = await (await fetch(photo.dataUrl)).blob()
        type = type || blob.type
      } catch {
        blob = null
      }
    }

    if (!blob) continue

    const saved = await putOapDraftMediaItem({
      scopeKey,
      kind: 'photo',
      itemId,
      blob,
      name,
      type,
    })

    keepIds.push(String(itemId))

    if (saved) {
      out.push({
        id: itemId,
        name,
        type: type || blob.type || 'image/jpeg',
        storage: 'idb',
      })
      continue
    }

    // Fallback: localStorage dataUrl (may hit quota for large images)
    try {
      const dataUrl = await fileToDataUrl(blob)
      out.push({
        id: itemId,
        name,
        type: type || blob.type || 'image/jpeg',
        dataUrl,
      })
    } catch {
      // skip broken photo
    }
  }

  await pruneOapDraftMediaScope(scopeKey, 'photo', keepIds)
  return out
}

async function restorePhotosFromDraft(serializedPhotos, scopeKey = getOapDraftKey()) {
  if (!Array.isArray(serializedPhotos)) return []
  const scopeCandidates = [...new Set([scopeKey, ...listOapDraftKeys()].filter(Boolean))]
  const out = []
  for (const item of serializedPhotos) {
    if (typeof item?.preview === 'string' && (item.preview.startsWith('http') || item.preview.startsWith('/'))) {
      out.push({
        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        preview: item.preview,
        fromPurchased: Boolean(item.fromPurchased),
      })
      continue
    }

    if (item?.storage === 'idb' && item?.id) {
      let restored = null
      for (const key of scopeCandidates) {
        try {
          const record = await getOapDraftMediaItem(key, 'photo', item.id)
          if (!record?.blob) continue
          const file = new File([record.blob], record.name || item.name || 'photo.jpg', {
            type: record.type || item.type || record.blob.type || 'image/jpeg',
          })
          restored = {
            id: item.id,
            file,
            preview: URL.createObjectURL(file),
          }
          break
        } catch {
          // try next scope
        }
      }
      if (restored) {
        out.push(restored)
        continue
      }
    }

    if (!item?.dataUrl) continue
    try {
      const file = await dataUrlToFile(item.dataUrl, item.name || 'photo.jpg', item.type)
      out.push({
        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      })
    } catch {
      // skip
    }
  }
  return out
}

async function serializeVideosForDraft(videos, scopeKey = getOapDraftKey()) {
  const out = []
  const keepIds = []

  for (const video of videos || []) {
    if (!video) continue

    if (video.type === 'youtube' || video.type === 'googledrive') {
      out.push({
        id: video.id,
        type: video.type,
        url: video.url,
        videoId: video.videoId,
        thumbnail: video.thumbnail,
        duration: video.duration,
      })
      continue
    }

    const itemId = video.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    let blob = video.file instanceof Blob ? video.file : null
    let name = video.file?.name || video.name || 'video.mp4'
    let type = video.file?.type || video.mime || ''

    if (!blob && typeof video.url === 'string' && video.url.startsWith('data:')) {
      try {
        blob = await (await fetch(video.url)).blob()
        type = type || blob.type
      } catch {
        blob = null
      }
    }

    if (!blob && typeof video.dataUrl === 'string' && video.dataUrl.startsWith('data:')) {
      try {
        blob = await (await fetch(video.dataUrl)).blob()
        type = type || blob.type
      } catch {
        blob = null
      }
    }

    if (!blob) {
      // Keep lightweight metadata only (no blob URL — they die on reload)
      if (video.type === 'file' && typeof video.url === 'string' && !video.url.startsWith('blob:')) {
        out.push({
          id: itemId,
          type: 'file',
          url: video.url,
          name,
          duration: video.duration,
        })
      }
      continue
    }

    const saved = await putOapDraftMediaItem({
      scopeKey,
      kind: 'video',
      itemId,
      blob,
      name,
      type: type || blob.type || 'video/mp4',
      meta: { duration: video.duration },
    })

    keepIds.push(String(itemId))

    if (saved) {
      out.push({
        id: itemId,
        type: 'file',
        name,
        mime: type || blob.type || 'video/mp4',
        duration: video.duration,
        storage: 'idb',
      })
      continue
    }

    try {
      const dataUrl = await fileToDataUrl(blob)
      out.push({
        id: itemId,
        type: 'file',
        name,
        mime: type || blob.type || 'video/mp4',
        duration: video.duration,
        url: dataUrl,
      })
    } catch {
      // skip
    }
  }

  await pruneOapDraftMediaScope(scopeKey, 'video', keepIds)
  return out
}

async function restoreVideosFromDraft(serializedVideos, scopeKey = getOapDraftKey()) {
  if (!Array.isArray(serializedVideos)) return []
  const scopeCandidates = [...new Set([scopeKey, ...listOapDraftKeys()].filter(Boolean))]
  const out = []

  for (const item of serializedVideos) {
    if (!item) continue

    if (item.type === 'youtube' || item.type === 'googledrive') {
      out.push({
        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: item.type,
        url: item.url,
        videoId: item.videoId,
        thumbnail: item.thumbnail,
        duration: item.duration,
      })
      continue
    }

    if (item.storage === 'idb' && item.id) {
      let restored = null
      for (const key of scopeCandidates) {
        try {
          const record = await getOapDraftMediaItem(key, 'video', item.id)
          if (!record?.blob) continue
          const file = new File([record.blob], record.name || item.name || 'video.mp4', {
            type: record.type || item.mime || record.blob.type || 'video/mp4',
          })
          restored = {
            id: item.id,
            type: 'file',
            file,
            url: URL.createObjectURL(file),
            duration: record.meta?.duration ?? item.duration,
            name: file.name,
          }
          break
        } catch {
          // try next scope
        }
      }
      if (restored) {
        out.push(restored)
        continue
      }
    }

    const dataUrl =
      (typeof item.url === 'string' && item.url.startsWith('data:') && item.url) ||
      (typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:') && item.dataUrl) ||
      null

    if (!dataUrl) continue

    try {
      const file = await dataUrlToFile(dataUrl, item.name || 'video.mp4', item.mime || item.type)
      out.push({
        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'file',
        file,
        url: URL.createObjectURL(file),
        duration: item.duration,
        name: file.name,
      })
    } catch {
      // skip
    }
  }

  return out
}

function writeSessionDraftMirror(payload) {
  try {
    sessionStorage.setItem(
      OAP_DRAFT_SESSION_KEY,
      JSON.stringify({
        form: payload.form,
        step: payload.step,
        mobileScreen: payload.mobileScreen,
        selectedAmenities: payload.selectedAmenities,
        photos: Array.isArray(payload.photos) ? payload.photos : undefined,
        videos: Array.isArray(payload.videos) ? payload.videos : undefined,
        requiredDocuments: payload.requiredDocuments,
        additionalDocuments: payload.additionalDocuments,
        savedAt: payload.savedAt,
        version: OAP_DRAFT_VERSION,
        draftOrigin: payload.draftOrigin,
      }),
    )
  } catch {
    // ignore quota
  }
}

/** Быстрый sync-save текста формы — без сериализации файлов. */
export function saveOapDraftFormSync(
  { form, step, mobileScreen, selectedAmenities },
  draftKey = getOapDraftKey(),
) {
  if (typeof window === 'undefined') return
  if (isOapDraftSaveSuppressed()) return

  const existing = loadOapDraftForRestore(draftKey) || {}
  const payload = {
    ...existing,
    savedAt: Date.now(),
    version: OAP_DRAFT_VERSION,
    form: form ?? existing.form,
    step: typeof step === 'number' ? step : existing.step ?? 1,
    mobileScreen: typeof mobileScreen === 'number' ? mobileScreen : existing.mobileScreen ?? 1,
    selectedAmenities: Array.isArray(selectedAmenities)
      ? selectedAmenities
      : existing.selectedAmenities ?? [],
  }

  // Пустая начальная форма не должна затирать уже сохранённый черновик.
  if (!hasMeaningfulDraftData(payload)) return

  saveOapDraftPayload(payload, draftKey)
  // Дублируем и на общий ключ — на случай смены userId между сессиями.
  if (draftKey !== OAP_DRAFT_KEY_PREFIX) {
    saveOapDraftPayload(payload, OAP_DRAFT_KEY_PREFIX)
  }
  writeSessionDraftMirror(payload)
}

/** User-scoped draft, общий ключ или session fallback. */
export function loadOapDraftForRestore(preferredKey = getOapDraftKey()) {
  let best = null

  for (const key of listOapDraftKeys()) {
    const draft = loadOapDraft(key)
    if (!draft || !hasMeaningfulDraftData(draft)) continue
    if (!best || (draft.savedAt || 0) > (best.savedAt || 0)) best = draft
  }

  // preferred key first if equal timestamps
  const preferred = loadOapDraft(preferredKey)
  if (preferred && hasMeaningfulDraftData(preferred)) {
    if (!best || (preferred.savedAt || 0) >= (best.savedAt || 0)) best = preferred
  }

  if (best) return best

  try {
    const raw = sessionStorage.getItem(OAP_DRAFT_SESSION_KEY)
    if (!raw) return null
    const sessionDraft = JSON.parse(raw)
    if (!hasMeaningfulDraftData(sessionDraft)) return null
    return sessionDraft
  } catch {
    return null
  }
}

export async function buildOapDraftPayload(state) {
  if (isOapDraftSaveSuppressed()) {
    return {
      savedAt: Date.now(),
      form: state?.form,
      step: state?.step,
      mobileScreen: state?.mobileScreen,
      photos: [],
      videos: [],
      requiredDocuments: { ownership: null, noDebts: null },
      additionalDocuments: [],
      selectedAmenities: state?.selectedAmenities,
      testDrivePhase: state?.testDrivePhase,
      mediaScopeKey: getOapDraftKey(),
    }
  }

  const {
    form,
    step,
    mobileScreen,
    photos,
    videos,
    requiredDocuments,
    additionalDocuments,
    selectedAmenities,
    testDrivePhase,
  } = state

  const scopeKey = getOapDraftKey()

  const [docs, serializedPhotos, serializedVideos] = await Promise.all([
    serializeDocumentsForDraft(requiredDocuments, additionalDocuments, scopeKey),
    serializePhotosForDraft(photos || [], scopeKey),
    serializeVideosForDraft(videos || [], scopeKey),
  ])

  return {
    savedAt: Date.now(),
    form,
    step,
    mobileScreen,
    photos: serializedPhotos,
    videos: serializedVideos,
    requiredDocuments: {
      ownership: docs.ownership,
      noDebts: docs.noDebts,
    },
    additionalDocuments: docs.additional,
    selectedAmenities,
    testDrivePhase,
    mediaScopeKey: scopeKey,
  }
}

/** Persist photos/videos to IndexedDB + draft metadata ASAP (do not wait for full debounce). */
export async function persistOapDraftMediaNow({
  photos,
  videos,
  requiredDocuments,
  additionalDocuments,
  form,
  step,
  mobileScreen,
  selectedAmenities,
} = {}) {
  if (typeof window === 'undefined') return null
  if (isOapDraftSaveSuppressed()) return null

  const scopeKey = getOapDraftKey()
  const existing = loadOapDraftForRestore() || {}
  const [serializedPhotos, serializedVideos, docs] = await Promise.all([
    serializePhotosForDraft(photos || [], scopeKey),
    serializeVideosForDraft(videos || [], scopeKey),
    serializeDocumentsForDraft(
      requiredDocuments ?? existing.requiredDocuments,
      additionalDocuments ?? existing.additionalDocuments,
      scopeKey,
    ),
  ])

  const payload = {
    ...existing,
    savedAt: Date.now(),
    version: OAP_DRAFT_VERSION,
    form: form ?? existing.form,
    step: typeof step === 'number' ? step : existing.step ?? 1,
    mobileScreen: typeof mobileScreen === 'number' ? mobileScreen : existing.mobileScreen ?? 1,
    selectedAmenities: Array.isArray(selectedAmenities)
      ? selectedAmenities
      : existing.selectedAmenities ?? [],
    photos: serializedPhotos,
    videos: serializedVideos,
    requiredDocuments: {
      ownership: docs.ownership,
      noDebts: docs.noDebts,
    },
    additionalDocuments: docs.additional,
    mediaScopeKey: scopeKey,
  }

  if (!hasMeaningfulDraftData(payload)) return null

  saveOapDraftPayload(payload)
  if (scopeKey !== OAP_DRAFT_KEY_PREFIX) {
    saveOapDraftPayload(payload, OAP_DRAFT_KEY_PREFIX)
  }
  writeSessionDraftMirror(payload)
  return payload
}

export async function restoreOapDraftState(draft) {
  if (!draft) return null
  if (draft.version && draft.version !== OAP_DRAFT_VERSION) return null

  const scopeKey = draft.mediaScopeKey || getOapDraftKey()

  const [photos, videos, ownership, noDebts, additionalDocuments] = await Promise.all([
    restorePhotosFromDraft(draft.photos, scopeKey),
    restoreVideosFromDraft(draft.videos, scopeKey),
    restoreDocFromDraft(draft.requiredDocuments?.ownership, scopeKey),
    restoreDocFromDraft(draft.requiredDocuments?.noDebts, scopeKey),
    Promise.all((draft.additionalDocuments || []).map((doc) => restoreDocFromDraft(doc, scopeKey))),
  ])

  const restoredDocs = await restoreDocumentsFromIdbFallback(scopeKey, {
    ownership,
    noDebts,
    additional: additionalDocuments.filter(Boolean),
  })

  let restoredPhotos = photos
  let restoredVideos = videos

  // If preferred scope had no blobs (e.g. draft was under another key), try other scopes.
  if (
    restoredPhotos.length === 0 &&
    Array.isArray(draft.photos) &&
    draft.photos.some((p) => p?.storage === 'idb')
  ) {
    for (const key of listOapDraftKeys()) {
      if (key === scopeKey) continue
      const retry = await restorePhotosFromDraft(draft.photos, key)
      if (retry.length > 0) {
        restoredPhotos = retry
        break
      }
    }
  }

  if (
    restoredVideos.length === 0 &&
    Array.isArray(draft.videos) &&
    draft.videos.some((v) => v?.storage === 'idb')
  ) {
    for (const key of listOapDraftKeys()) {
      if (key === scopeKey) continue
      const retry = await restoreVideosFromDraft(draft.videos, key)
      if (retry.length > 0) {
        restoredVideos = retry
        break
      }
    }
  }

  let testDrivePhase = draft.testDrivePhase === 'details' ? 'details' : 'question'
  if (draft.form?.testDrive === 'yes' && testDrivePhase === 'question') {
    testDrivePhase = 'details'
  }
  if (draft.form?.testDrive !== 'yes') {
    testDrivePhase = 'question'
  }

  return {
    form: { ...draft.form },
    step: typeof draft.step === 'number' ? Math.min(Math.max(draft.step, 1), 11) : 1,
    mobileScreen:
      typeof draft.mobileScreen === 'number'
        ? Math.min(Math.max(draft.mobileScreen, 1), 7)
        : null,
    photos: restoredPhotos,
    videos: restoredVideos,
    requiredDocuments: {
      ownership: restoredDocs.ownership,
      noDebts: restoredDocs.noDebts,
    },
    additionalDocuments: restoredDocs.additional,
    selectedAmenities: Array.isArray(draft.selectedAmenities) ? draft.selectedAmenities : [],
    testDrivePhase,
  }
}
