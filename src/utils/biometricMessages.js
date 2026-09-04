/**
 * Shared i18n helpers for biometric offer / lock flows.
 * @param {(key: string, options?: object) => string} t
 * @param {unknown} error
 * @param {'lock' | 'offer'} [context]
 */
export function getBiometricErrorMessage(t, error, context = 'lock') {
  const code = String(error?.message || '')
  if (code === 'biometric_platform_unavailable') {
    return context === 'offer'
      ? t('biometric_errOfferPlatform')
      : t('biometric_errPlatformUnavailable')
  }
  if (code === 'biometric_browser_unsupported') {
    return context === 'offer'
      ? t('biometric_errOfferPlatform')
      : t('biometric_errBrowserUnsupported')
  }
  if (code === 'biometric_login_session_missing') {
    return context === 'offer'
      ? t('biometric_errOfferSessionMissing')
      : t('biometric_errSessionMissing')
  }
  if (code === 'secure_context_required') {
    return context === 'offer'
      ? t('biometric_errOfferSecureContext')
      : t('biometric_errSecureContext')
  }
  if (context === 'offer') return t('biometric_errOfferFailed')
  return t('biometric_errVerifyFailed')
}
