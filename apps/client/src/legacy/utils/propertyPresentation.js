export const PRESENTATION_MAX_BYTES = 10 * 1024 * 1024

export function isPropertyPresentation(doc) {
  return doc?.kind === 'presentation'
}

export function validatePresentation(file) {
  if (file.type !== 'application/pdf' && !(file.type === '' && /\.pdf$/i.test(file.name))) {
    return 'propertyPresentationPdfOnly'
  }
  if (file.size > PRESENTATION_MAX_BYTES) return 'propertyPresentationTooLarge'
  return null
}

export function readDocumentDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

// IndexedDB restores files without a data URL. Recreate it before publishing.
export async function serializePropertyDocuments(documents = []) {
  return Promise.all(documents.map(async (doc) => ({
    name: doc.name,
    url: doc.url || doc.dataUrl || (doc.file ? await readDocumentDataUrl(doc.file) : ''),
    type: doc.type,
    ...(isPropertyPresentation(doc) ? { kind: 'presentation' } : {}),
  })))
}
