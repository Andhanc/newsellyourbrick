import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { PRESENTATION_MAX_BYTES, isPropertyPresentation, serializePropertyDocuments, validatePresentation } from './propertyPresentation.js'
import { buildOapDraftPayload, restoreOapDraftState } from './oapAddPropertyDraft.js'

test('presentation upload validates PDF format and the size limit', () => {
  assert.equal(validatePresentation({ name: 'deck.pdf', type: 'application/pdf', size: PRESENTATION_MAX_BYTES }), null)
  assert.equal(validatePresentation({ name: 'DECK.PDF', type: '', size: 100 }), null)
  assert.equal(validatePresentation({ name: 'deck.pptx', type: '', size: 100 }), 'propertyPresentationPdfOnly')
  assert.equal(validatePresentation({ name: 'deck.pdf', type: 'text/html', size: 100 }), 'propertyPresentationPdfOnly')
  assert.equal(validatePresentation({ name: 'deck.pdf', type: 'application/pdf', size: PRESENTATION_MAX_BYTES + 1 }), 'propertyPresentationTooLarge')
})

test('presentation metadata and PDF contents survive a draft save, reload and publish', async () => {
  const previousReader = globalThis.FileReader
  globalThis.FileReader = class {
    async readAsDataURL(blob) {
      this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`
      this.onload?.()
      this.onloadend?.()
    }
  }
  try {
    const file = new File(['%PDF-1.4 test presentation'], 'villa.pdf', { type: 'application/pdf' })
    const doc = { id: 'presentation-1', name: file.name, file, kind: 'presentation', type: 'pdf' }
    const draft = await buildOapDraftPayload({ form: {}, additionalDocuments: [doc] })
    assert.equal(draft.additionalDocuments[0].kind, 'presentation')
    const restored = await restoreOapDraftState(JSON.parse(JSON.stringify(draft)))
    const recovered = restored.additionalDocuments[0]
    assert.equal(isPropertyPresentation(recovered), true)
    assert.equal(await recovered.file.text(), await file.text())
    // IndexedDB restoration intentionally has no URL; publishing must read its file.
    const payload = await serializePropertyDocuments([{ ...recovered, url: '' }])
    assert.equal(payload[0].kind, 'presentation')
    assert.match(payload[0].url, /^data:application\/pdf;base64,/)
    assert.equal(Buffer.from(payload[0].url.split(',')[1], 'base64').toString(), await file.text())
    const ordinary = { name: 'registry.pdf', type: 'pdf', url: '/uploads/registry.pdf' }
    assert.deepEqual(await serializePropertyDocuments([ordinary]), [ordinary])
    assert.deepEqual(await serializePropertyDocuments([]), [])
  } finally {
    globalThis.FileReader = previousReader
  }
})

test('presentation feature stays identical in web and legacy implementations', async () => {
  for (const path of [
    'components/PropertyPresentationUpload.jsx', 'components/PropertyPresentationUpload.css',
    'components/PropertyPreviewModal.jsx', 'utils/propertyPresentation.js',
    'utils/oapPublishProperty.js', 'utils/oapAddPropertyDraft.js',
    'pages/OwnerAddPropertyDocumentsStep.jsx', 'pages/AddProperty.jsx', 'pages/PropertyDetailClassic.jsx',
  ]) {
    const web = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    const legacy = await readFile(new URL(`../../apps/client/src/legacy/${path}`, import.meta.url), 'utf8')
    assert.equal(web, legacy, path)
  }
  for (const locale of ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']) {
    const path = `i18n/locales/mainPage/${locale}.json`
    const web = JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'))
    const legacy = JSON.parse(await readFile(new URL(`../../apps/client/src/legacy/${path}`, import.meta.url), 'utf8'))
    for (const key of ['Title', 'Hint', 'Upload', 'Replace', 'Loading', 'Formats', 'PdfOnly', 'TooLarge']) {
      assert.ok(web[`propertyPresentation${key}`], `${locale}: ${key}`)
      assert.equal(web[`propertyPresentation${key}`], legacy[`propertyPresentation${key}`])
    }
  }
})
