export function normalizeCountryForDocumentRules(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[().,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSpainCountry(value) {
  const normalized = normalizeCountryForDocumentRules(value)
  return (
    normalized === 'es' ||
    normalized === 'spain' ||
    normalized === 'espana' ||
    normalized === 'испания' ||
    normalized === 'espagne' ||
    normalized === 'spanien'
  )
}

export function isValidSpainDniNie(value) {
  const normalized = String(value || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')

  const dniRegex = /^\d{8}[A-Z]$/
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/
  return dniRegex.test(normalized) || nieRegex.test(normalized)
}

export function getIdentificationLabelByCountry(countryName) {
  return isSpainCountry(countryName) ? 'DNI или NIE' : 'Идентификационный номер'
}

export const INVALID_SPAIN_DNI_NIE_MESSAGE =
  'Для Испании укажите корректный DNI или NIE (например: 12345678Z или X1234567L).'

export function normalizeIdentificationInput(value, countryName) {
  const raw = String(value || '')
  if (!isSpainCountry(countryName)) return raw
  return raw.toUpperCase().replace(/[\s-]/g, '')
}
