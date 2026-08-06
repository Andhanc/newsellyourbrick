const DOCUMENT_ASPECT_RATIO_MIN = 0.45
const DOCUMENT_ASPECT_RATIO_MAX = 2.5
/** Жёсткий блок только для совсем крошечных превью */
const BLOCK_MIN_SHORT_SIDE = 280
/** Мягкая подсказка, если фото скромного разрешения */
const WARN_MIN_WIDTH = 640
const WARN_MIN_HEIGHT = 420

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Не удалось открыть изображение'))
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

export async function validatePassportImageFile(file) {
  if (!file || !file.type?.startsWith('image/')) {
    return {
      isLikelyDocument: false,
      shouldBlock: true,
      hints: ['Выберите фото документа (JPG, PNG или HEIC).'],
    }
  }

  const image = await loadImage(file)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const shortSide = Math.min(width, height)
  const longSide = Math.max(width, height)
  const aspectRatio = longSide / Math.max(shortSide, 1)

  const hints = []
  let shouldBlock = false
  let documentScore = 0

  if (shortSide < BLOCK_MIN_SHORT_SIDE) {
    shouldBlock = true
    hints.push('Фото слишком маленькое. Подойдите ближе и снимите документ крупнее.')
  } else if (width < WARN_MIN_WIDTH || height < WARN_MIN_HEIGHT) {
    hints.push('Разрешение невысокое — распознавание может ошибиться. Лучше переснять ближе.')
    documentScore += 1
  } else {
    documentScore += 1
  }

  // Passport spread is usually ~1.4–1.6; ID cards ~1.5. Allow portrait phone shots.
  if (aspectRatio >= DOCUMENT_ASPECT_RATIO_MIN && aspectRatio <= DOCUMENT_ASPECT_RATIO_MAX) {
    documentScore += 1
  } else {
    hints.push('Расположите документ полностью в кадре, без сильной обрезки.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.min(width, 800)
  canvas.height = Math.max(1, Math.round((canvas.width / Math.max(width, 1)) * height))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (ctx) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const brightness = getBrightness(ctx, canvas.width, canvas.height)

    if (brightness < 40) {
      hints.push('Недостаточно света. Добавьте освещение и уберите тени.')
    } else if (brightness > 225) {
      hints.push('Сильная пересветка. Избегайте бликов и вспышки.')
    } else {
      documentScore += 1
    }
  }

  URL.revokeObjectURL(image.src)

  if (hints.length === 0) {
    hints.push('Отлично: документ читаем, можно запускать распознавание.')
  }

  return {
    isLikelyDocument: documentScore >= 2,
    shouldBlock,
    hints,
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
  const hints = isPassportLikely
    ? ['Паспортные признаки найдены, продолжаем извлечение данных.']
    : [
        'Похоже, на фото не паспорт. Сфотографируйте разворот паспорта без обложки.',
        'В кадре должны быть видны серия, номер и текстовые поля документа.',
      ]

  return { isPassportLikely, hints, score }
}
