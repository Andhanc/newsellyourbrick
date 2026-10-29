const DOCUMENT_ASPECT_RATIO_MIN = 0.45
const DOCUMENT_ASPECT_RATIO_MAX = 2.5
/** Hard block only for tiny previews */
const BLOCK_MIN_SHORT_SIDE = 280
/** Soft hint when resolution is modest */
const WARN_MIN_WIDTH = 640
const WARN_MIN_HEIGHT = 420

export const PASSPORT_PHOTO_HINT = {
  OPEN_FAILED: 'passportVal_openFailed',
  SELECT_DOCUMENT: 'passportVal_selectDocument',
  TOO_SMALL: 'passportVal_tooSmall',
  LOW_RESOLUTION: 'passportVal_lowResolution',
  FRAME_DOCUMENT: 'passportVal_frameDocument',
  TOO_DARK: 'passportVal_tooDark',
  TOO_BRIGHT: 'passportVal_tooBright',
  LOOKS_GOOD: 'passportVal_looksGood',
  PASSPORT_SIGNALS_OK: 'passportVal_passportSignalsOk',
  NOT_PASSPORT: 'passportVal_notPassport',
  NEED_SERIES_AND_FIELDS: 'passportVal_needSeriesAndFields',
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(PASSPORT_PHOTO_HINT.OPEN_FAILED))
    image.src = URL.createObjectURL(file)
  })
}

function getBrightness(canvasCtx, width, height) {
  const { data } = canvasCtx.getImageData(0, 0, width, height)
  let total = 0
  for (let i = 0; i < data.length; i += 4) {
    total += (data[i] + data[i + 1] + data[i + 2]) / 3
  }
  return total / (data.length / 4)
}

/**
 * @returns {Promise<{ isLikelyDocument: boolean, shouldBlock: boolean, hints: string[], hintKeys: string[] }>}
 * `hintKeys` are i18n keys; `hints` mirror them for backward compatibility (translate via t()).
 */
export async function validatePassportImageFile(file) {
  if (!file || !file.type?.startsWith('image/')) {
    return {
      isLikelyDocument: false,
      shouldBlock: true,
      hintKeys: [PASSPORT_PHOTO_HINT.SELECT_DOCUMENT],
      hints: [PASSPORT_PHOTO_HINT.SELECT_DOCUMENT],
    }
  }

  const image = await loadImage(file)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const shortSide = Math.min(width, height)
  const longSide = Math.max(width, height)
  const aspectRatio = longSide / Math.max(shortSide, 1)

  const hintKeys = []
  let shouldBlock = false
  let documentScore = 0

  if (shortSide < BLOCK_MIN_SHORT_SIDE) {
    shouldBlock = true
    hintKeys.push(PASSPORT_PHOTO_HINT.TOO_SMALL)
  } else if (width < WARN_MIN_WIDTH || height < WARN_MIN_HEIGHT) {
    hintKeys.push(PASSPORT_PHOTO_HINT.LOW_RESOLUTION)
    documentScore += 1
  } else {
    documentScore += 1
  }

  // Passport spread is usually ~1.4–1.6; ID cards ~1.5. Allow portrait phone shots.
  if (aspectRatio >= DOCUMENT_ASPECT_RATIO_MIN && aspectRatio <= DOCUMENT_ASPECT_RATIO_MAX) {
    documentScore += 1
  } else {
    hintKeys.push(PASSPORT_PHOTO_HINT.FRAME_DOCUMENT)
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.min(width, 800)
  canvas.height = Math.max(1, Math.round((canvas.width / Math.max(width, 1)) * height))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (ctx) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const brightness = getBrightness(ctx, canvas.width, canvas.height)

    if (brightness < 40) {
      hintKeys.push(PASSPORT_PHOTO_HINT.TOO_DARK)
    } else if (brightness > 225) {
      hintKeys.push(PASSPORT_PHOTO_HINT.TOO_BRIGHT)
    } else {
      documentScore += 1
    }
  }

  URL.revokeObjectURL(image.src)

  if (hintKeys.length === 0) {
    hintKeys.push(PASSPORT_PHOTO_HINT.LOOKS_GOOD)
  }

  return {
    isLikelyDocument: documentScore >= 2,
    shouldBlock,
    hintKeys,
    hints: hintKeys,
  }
}

export function evaluatePassportText(text) {
  const normalized = (text || '').toLowerCase()

  const strongSignals = [
    /passport/,
    /паспорт/,
    /identification/,
    /идентификац/,
    /surname/,
    /given name/,
    /date of birth/,
    /nationality/,
    /<<</,
    /p<[a-z0-9<]{6,}/,
  ]

  let score = 0
  for (const signal of strongSignals) {
    if (signal.test(normalized)) score += 1
  }

  const isPassportLikely = score >= 2
  const hintKeys = isPassportLikely
    ? [PASSPORT_PHOTO_HINT.PASSPORT_SIGNALS_OK]
    : [PASSPORT_PHOTO_HINT.NOT_PASSPORT, PASSPORT_PHOTO_HINT.NEED_SERIES_AND_FIELDS]

  return { isPassportLikely, hintKeys, hints: hintKeys, score }
}
