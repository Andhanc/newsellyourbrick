const OAP_DRAFT_KEY_PREFIX = 'ownerTest_addPropertyDraft'
const OAP_DRAFT_SAVE_DEBOUNCE_MS = 600
const OAP_DRAFT_VERSION = 1

export { OAP_DRAFT_SAVE_DEBOUNCE_MS }

export function getOapDraftKey() {
  if (typeof localStorage === 'undefined') return OAP_DRAFT_KEY_PREFIX
  const userId = localStorage.getItem('userId')
  return userId ? `${OAP_DRAFT_KEY_PREFIX}_${userId}` : OAP_DRAFT_KEY_PREFIX
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
  try {
    localStorage.setItem(draftKey, JSON.stringify({ ...payload, version: OAP_DRAFT_VERSION }))
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            ...payload,
            version: OAP_DRAFT_VERSION,
            photos: [],
            videos: [],
            additionalDocuments: [],
            requiredDocuments: { ownership: null, noDebts: null },
          })
        )
      } catch {
        // ignore
      }
    }
  }
}

export function clearOapDraft(draftKey = getOapDraftKey()) {
  try {
    localStorage.removeItem(draftKey)
  } catch {
    // ignore
  }
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

async function serializeDocForDraft(doc) {
  if (!doc) return null
  if (doc.file instanceof File) {
    const dataUrl = await fileToDataUrl(doc.file)
    return {
      id: doc.id,
      name: doc.name || doc.file.name,
      type: doc.type,
      docMime: doc.file.type,
      dataUrl,
    }
  }
  if (typeof doc.url === 'string' && doc.url.startsWith('data:')) {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      docMime: doc.file?.type,
      dataUrl: doc.url,
    }
  }
  if (typeof doc.dataUrl === 'string' && doc.dataUrl.startsWith('data:')) {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      docMime: doc.docMime,
      dataUrl: doc.dataUrl,
    }
  }
  return null
}

async function restoreDocFromDraft(serialized) {
  if (!serialized?.dataUrl) return null
  const file = await dataUrlToFile(
    serialized.dataUrl,
    serialized.name || 'document',
    serialized.docMime || 'application/pdf'
  )
  const isImage = file.type.startsWith('image/') || serialized.type === 'image'
  return {
    id: serialized.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: serialized.name || file.name,
    file,
    type: serialized.type || (isImage ? 'image' : 'pdf'),
    preview: isImage ? URL.createObjectURL(file) : '',
    url: serialized.dataUrl,
  }
}

async function serializePhotosForDraft(photos) {
  const out = []
  for (const photo of photos) {
    if (!photo?.file) continue
    try {
      const dataUrl = await fileToDataUrl(photo.file)
      out.push({
        id: photo.id,
        name: photo.file.name,
        type: photo.file.type,
        dataUrl,
      })
    } catch {
      // skip broken photo
    }
  }
  return out
}

async function restorePhotosFromDraft(serializedPhotos) {
  if (!Array.isArray(serializedPhotos)) return []
  const out = []
  for (const item of serializedPhotos) {
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

function serializeVideosForDraft(videos) {
  return videos.map((video) => {
    const { file, ...rest } = video
    return rest
  })
}

export function hasMeaningfulDraftData(draft) {
  if (!draft) return false
  if (draft.form && Object.values(draft.form).some((v) => v !== '' && v != null)) return true
  if (draft.step > 1) return true
  if (Array.isArray(draft.photos) && draft.photos.length > 0) return true
  if (Array.isArray(draft.videos) && draft.videos.length > 0) return true
  if (Array.isArray(draft.selectedAmenities) && draft.selectedAmenities.length > 0) return true
  if (draft.requiredDocuments?.ownership || draft.requiredDocuments?.noDebts) return true
  if (Array.isArray(draft.additionalDocuments) && draft.additionalDocuments.length > 0) return true
  return false
}

export async function buildOapDraftPayload(state) {
  const {
    form,
    step,
    photos,
    videos,
    requiredDocuments,
    additionalDocuments,
    selectedAmenities,
    testDrivePhase,
  } = state

  const [ownershipSer, noDebtsSer, serializedPhotos, serializedAdditional] = await Promise.all([
    serializeDocForDraft(requiredDocuments.ownership),
    serializeDocForDraft(requiredDocuments.noDebts),
    serializePhotosForDraft(photos),
    Promise.all(additionalDocuments.map((doc) => serializeDocForDraft(doc))),
  ])

  return {
    savedAt: Date.now(),
    form,
    step,
    photos: serializedPhotos,
    videos: serializeVideosForDraft(videos),
    requiredDocuments: {
      ownership: ownershipSer,
      noDebts: noDebtsSer,
    },
    additionalDocuments: serializedAdditional.filter(Boolean),
    selectedAmenities,
    testDrivePhase,
  }
}

export async function restoreOapDraftState(draft) {
  if (!draft) return null
  if (draft.version && draft.version !== OAP_DRAFT_VERSION) return null

  const [photos, ownership, noDebts, additionalDocuments] = await Promise.all([
    restorePhotosFromDraft(draft.photos),
    restoreDocFromDraft(draft.requiredDocuments?.ownership),
    restoreDocFromDraft(draft.requiredDocuments?.noDebts),
    Promise.all((draft.additionalDocuments || []).map((doc) => restoreDocFromDraft(doc))),
  ])

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
    photos,
    videos: Array.isArray(draft.videos) ? draft.videos : [],
    requiredDocuments: {
      ownership: ownership,
      noDebts: noDebts,
    },
    additionalDocuments: additionalDocuments.filter(Boolean),
    selectedAmenities: Array.isArray(draft.selectedAmenities) ? draft.selectedAmenities : [],
    testDrivePhase,
  }
}
