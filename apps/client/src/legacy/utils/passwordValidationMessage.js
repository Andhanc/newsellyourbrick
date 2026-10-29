/** Stable password requirement tokens used by client + API. */
export const PASSWORD_REQ_I18N = {
  upper: 'roleSwitch_passwordRequirementUpper',
  special: 'roleSwitch_passwordRequirementSpecial',
  digit: 'roleSwitch_passwordRequirementDigit',
}

/** Legacy Russian labels from older API / client validation. */
const LEGACY_LABEL_TO_KEY = {
  'заглавную букву': 'upper',
  'спецсимвол': 'special',
  цифру: 'digit',
}

export function normalizePasswordReqToken(token) {
  const raw = String(token || '').trim()
  if (!raw) return null
  if (PASSWORD_REQ_I18N[raw]) return raw
  const lower = raw.toLowerCase()
  if (LEGACY_LABEL_TO_KEY[raw]) return LEGACY_LABEL_TO_KEY[raw]
  if (LEGACY_LABEL_TO_KEY[lower]) return LEGACY_LABEL_TO_KEY[lower]
  return null
}

function localizeReqList(tokens, t) {
  return (tokens || [])
    .map(normalizePasswordReqToken)
    .filter(Boolean)
    .map((key) => t(PASSWORD_REQ_I18N[key]))
}

/**
 * Localized password-requirements error for UI (registration, reset, role switch).
 * Accepts either stable keys (`upper`) or legacy Russian labels from the API.
 */
export function formatPasswordValidationMessage(validation, t) {
  if (!validation) {
    return t('passwordValidationFailedGeneric', {
      defaultValue: 'Password does not meet requirements',
    })
  }
  if (validation.valid) {
    return t('passwordMeetsRequirements', {
      defaultValue: 'Password meets all requirements',
    })
  }

  const missing = localizeReqList(validation.missing, t)
  const present = localizeReqList(validation.present, t)

  if (missing.length === 0 && typeof validation.message === 'string' && validation.message.trim()) {
    // Unknown shape — avoid flashing raw Russian if we can detect nothing
    const maybeRu = /[А-Яа-яЁё]/.test(validation.message)
    if (!maybeRu) return validation.message
  }

  let message = t('passwordValidationFailed', {
    missing: missing.join(', '),
    defaultValue: 'Password does not meet requirements. Add: {{missing}}.',
  })
  if (present.length > 0) {
    message += ` ${t('passwordValidationPresent', {
      present: present.join(', '),
      defaultValue: 'Already have: {{present}}.',
    })}`
  }
  return message.trim()
}
