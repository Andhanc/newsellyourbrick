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

/** i18n key for the identification field label. */
export function getIdentificationLabelKeyByCountry(countryName) {
  return isSpainCountry(countryName) ? 'buyerData_labelDniNie' : 'buyerData_labelIdNumber'
}

/** @deprecated use getIdentificationLabelKeyByCountry + t() */
export function getIdentificationLabelByCountry(countryName) {
  return getIdentificationLabelKeyByCountry(countryName)
}

export const INVALID_SPAIN_DNI_NIE_MESSAGE_KEY = 'buyerData_invalidDniNie'

/** @deprecated use INVALID_SPAIN_DNI_NIE_MESSAGE_KEY + t() */
export const INVALID_SPAIN_DNI_NIE_MESSAGE = INVALID_SPAIN_DNI_NIE_MESSAGE_KEY

export function normalizeIdentificationInput(value, countryName) {
  const raw = String(value || '')
  if (!isSpainCountry(countryName)) return raw
  return raw.toUpperCase().replace(/[\s-]/g, '')
}
