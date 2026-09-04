import mammoth from 'mammoth'
// Import the parser implementation directly. The package entry point treats
// ESM imports as direct execution on newer Node versions and tries to open a
// test fixture from its own repository during server startup.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import XLSX from 'xlsx'

const MAX_FILES = 2
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_BYTES = 8 * 1024 * 1024
const MAX_EXTRACTED_CHARS = 24000

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'xml', 'html', 'yaml', 'yml'])
const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls'])

function safeName(value) {
  return String(value || 'file')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .slice(0, 120)
}

function extensionOf(name) {
  return safeName(name).split('.').pop()?.toLowerCase() || ''
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/i)
  if (!match) throw new Error('Некорректный формат вложения')
  const mimeType = String(match[1] || 'application/octet-stream').toLowerCase()
  const buffer = match[2]
    ? Buffer.from(match[3], 'base64')
    : Buffer.from(decodeURIComponent(match[3]), 'utf8')
  return { mimeType, buffer }
}

function trimExtractedText(text) {
  return String(text || '').replace(/\u0000/g, '').trim().slice(0, MAX_EXTRACTED_CHARS)
}

async function extractSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const chunks = []
  for (const sheetName of workbook.SheetNames.slice(0, 4)) {
    const sheet = workbook.Sheets[sheetName]
    chunks.push(`# ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet).slice(0, 8000)}`)
  }
  return chunks.join('\n\n')
}

async function extractText({ buffer, mimeType, name }) {
  const extension = extensionOf(name)
  if (mimeType.startsWith('text/') || TEXT_EXTENSIONS.has(extension)) {
    return trimExtractedText(buffer.toString('utf8'))
  }
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    const parsed = await pdfParse(buffer)
    return trimExtractedText(parsed?.text)
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    const parsed = await mammoth.extractRawText({ buffer })
    return trimExtractedText(parsed?.value)
  }
  if (SPREADSHEET_EXTENSIONS.has(extension)) {
    return trimExtractedText(await extractSpreadsheet(buffer))
  }
  return ''
}

export async function prepareAssistantAttachments(rawAttachments) {
  const source = Array.isArray(rawAttachments) ? rawAttachments.slice(0, MAX_FILES) : []
  const prepared = []
  let totalBytes = 0

  for (const item of source) {
    const name = safeName(item?.name)
    const declaredSize = Number(item?.size) || 0
    if (declaredSize > MAX_FILE_BYTES) continue

    let decoded
    try {
      decoded = decodeDataUrl(item?.dataUrl)
    } catch {
      continue
    }

    const { mimeType, buffer } = decoded
    if (buffer.length > MAX_FILE_BYTES || totalBytes + buffer.length > MAX_TOTAL_BYTES) continue
    totalBytes += buffer.length

    if (mimeType.startsWith('image/')) {
      prepared.push({
        name,
        mimeType,
        size: buffer.length,
        imageUrl: String(item.dataUrl),
        text: '',
      })
      continue
    }

    try {
      const text = await extractText({ buffer, mimeType, name })
      if (text) prepared.push({ name, mimeType, size: buffer.length, text, imageUrl: '' })
    } catch (error) {
      console.warn(`[assistant] attachment ${name}:`, error?.message || error)
    }
  }

  return prepared
}

export function formatAttachmentsForPrompt(attachments = []) {
  const textFiles = attachments.filter((item) => item?.text)
  if (!textFiles.length) return ''
  return textFiles
    .map((item) => `FILE: ${item.name}\n${item.text}`)
    .join('\n\n')
    .slice(0, MAX_EXTRACTED_CHARS * MAX_FILES)
}

export const ASSISTANT_ATTACHMENT_LIMITS = Object.freeze({
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
})
