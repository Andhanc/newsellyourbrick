import { useState, useEffect, useRef, useCallback } from 'react'
import { FiX, FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiHome, FiTrendingUp } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import {
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
  resetPasswordWithToken,
  validatePassword,
  validateEmail,
} from '../services/authService'
import './ForgotPasswordModal.css'

const CODE_LENGTH = 4

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = '',
  /** buyer | seller — пропускает шаг выбора кабинета после проверки кода */
  initialRole = null,
  /** Поверх role-switch drawer и других высоких слоёв */
  elevated = false,
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState(initialEmail || '')
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''))
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [devCode, setDevCode] = useState(null)
  const [resetToken, setResetToken] = useState(null)
  const [availableRoles, setAvailableRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const inputRefs = useRef([])

  const resetState = useCallback(() => {
    setStep('email')
    setCode(Array(CODE_LENGTH).fill(''))
    setPassword('')
    setConfirmPassword('')
    setError('')
    setCountdown(0)
    setDevCode(null)
    setResetToken(null)
    setAvailableRoles([])
    setSelectedRole(initialRole || null)
    setShowPassword(false)
    setShowConfirmPassword(false)
  }, [initialRole])

  useEffect(() => {
    if (!isOpen) return
    resetState()
    setEmail(initialEmail || '')
  }, [isOpen, initialEmail, initialRole, resetState])

  const cabinetRoleForReset = selectedRole ?? initialRole

  useEffect(() => {
    if (countdown <= 0) return undefined
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = async (e) => {
    e?.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const validation = await validateEmail(email)
      if (!validation.valid) {
        setError(validation.error || t('enterValidEmail'))
        return
      }
      const result = await sendForgotPasswordCode(email)
      if (!result.success) {
        setError(result.error || t('forgotPassword_sendError'))
        return
      }
      if (result.devCode) {
        setDevCode(result.devCode)
      }
      setAvailableRoles(result.roles || [])
      setStep('code')
      setCountdown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch {
      setError(t('genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  const proceedAfterCodeVerified = (verifyResult) => {
    setResetToken(verifyResult.resetToken)
    const roles = verifyResult.roles || []
    setAvailableRoles(roles)
    if (initialRole) {
      setSelectedRole(initialRole)
      setStep('password')
      return
    }
    if (verifyResult.hasMultipleRoles) {
      setStep('role')
      setSelectedRole(null)
    } else {
      setSelectedRole(roles[0] || null)
      setStep('password')
    }
  }

  const handleVerifyCode = async (codeString) => {
    if (codeString.length !== CODE_LENGTH) {
      setError(t('forgotPassword_codeLength'))
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const result = await verifyForgotPasswordCode(email, codeString)
      if (!result.success) {
        setError(result.error || t('forgotPassword_wrongCode'))
        return
      }
      proceedAfterCodeVerified(result)
    } catch {
      setError(t('genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const next = [...code]
    next[index] = value
    setCode(next)
    setError('')
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    if (next.every((d) => d !== '') && next.join('').length === CODE_LENGTH) {
      void handleVerifyCode(next.join(''))
    }
  }

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, CODE_LENGTH)
    if (pasted.length === CODE_LENGTH) {
      setCode(pasted.split(''))
      inputRefs.current[CODE_LENGTH - 1]?.focus()
      void handleVerifyCode(pasted)
    }
  }

  const handleRoleContinue = () => {
    if (!selectedRole) {
      setError(t('forgotPassword_pickRole'))
      return
    }
    setError('')
    setStep('password')
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      return
    }

    const validation = validatePassword(password)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    if (!resetToken) {
      setError(t('forgotPassword_sessionExpired'))
      setStep('email')
      return
    }

    setIsLoading(true)
    try {
      const roleToReset = cabinetRoleForReset
      if (!roleToReset) {
        setError(t('forgotPassword_pickRole'))
        return
      }
      await resetPasswordWithToken(email, resetToken, password, roleToReset)
      onSuccess?.()
      onClose()
    } catch (err) {
      if (err.status === 'password_same_as_other') {
        setError(err.message)
      } else if (err.passwordValidation) {
        setError(err.message)
      } else {
        setError(err.message || t('forgotPassword_saveError'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`forgot-password-overlay${elevated ? ' forgot-password-overlay--elevated' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="forgot-password-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
      >
        <button
          type="button"
          className="forgot-password-modal__close"
          onClick={onClose}
          aria-label={t('closeModalAria')}
        >
          <FiX size={22} />
        </button>

        {step !== 'email' ? (
          <button
            type="button"
            className="forgot-password-modal__back"
            onClick={() => {
              setError('')
              if (step === 'password' && availableRoles.length > 1 && !initialRole) setStep('role')
              else if (step === 'role' || step === 'password') setStep('code')
              else setStep('email')
            }}
          >
            <FiArrowLeft size={16} aria-hidden /> {t('roleSwitch_back')}
          </button>
        ) : null}

        <div className="forgot-password-modal__icon" aria-hidden>
          <FiMail size={28} />
        </div>

        <h2 id="forgot-password-title" className="forgot-password-modal__title">
          {step === 'email' && t('forgotPassword_title')}
          {step === 'code' && t('forgotPassword_codeTitle')}
          {step === 'role' && t('forgotPassword_roleTitle')}
          {step === 'password' && t('forgotPassword_newPasswordTitle')}
        </h2>

        <p className="forgot-password-modal__subtitle">
          {step === 'email' && (
            cabinetRoleForReset
              ? t('forgotPassword_subtitleCabinet', {
                  cabinet:
                    cabinetRoleForReset === 'seller'
                      ? t('roleSwitch_sellerCabinet')
                      : t('roleSwitch_buyerCabinet'),
                })
              : t('forgotPassword_subtitle')
          )}
          {step === 'code' && t('forgotPassword_codeSubtitle', { email })}
          {step === 'role' && t('forgotPassword_roleSubtitle')}
          {step === 'password' && (
            cabinetRoleForReset
              ? t('forgotPassword_newPasswordSubtitleCabinet', {
                  cabinet:
                    cabinetRoleForReset === 'seller'
                      ? t('roleSwitch_sellerCabinet')
                      : t('roleSwitch_buyerCabinet'),
                })
              : t('forgotPassword_newPasswordSubtitle')
          )}
        </p>

        {step === 'email' && (
          <form className="forgot-password-modal__form" onSubmit={handleSendCode}>
            <label className="forgot-password-modal__label" htmlFor="forgot-email">
              {t('email')}
            </label>
            <input
              id="forgot-email"
              type="email"
              className="forgot-password-modal__input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="email@example.com"
              autoComplete="email"
              required
            />
            {error ? <p className="forgot-password-modal__error" role="alert">{error}</p> : null}
            <button type="submit" className="forgot-password-modal__submit" disabled={isLoading}>
              {isLoading ? t('forgotPassword_sending') : t('forgotPassword_sendCode')}
            </button>
          </form>
        )}

        {step === 'code' && (
          <div className="forgot-password-modal__form">
            {devCode ? (
              <p className="forgot-password-modal__dev-code" role="status">
                {t('forgotPassword_devCode', { code: devCode })}
              </p>
            ) : null}
            <div className="forgot-password-modal__code-row" onPaste={handleCodePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="forgot-password-modal__code-cell"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  aria-label={t('forgotPassword_codeDigit', { n: index + 1 })}
                />
              ))}
            </div>
            {error ? <p className="forgot-password-modal__error" role="alert">{error}</p> : null}
            {isLoading ? <p className="forgot-password-modal__hint">{t('forgotPassword_verifying')}</p> : null}
            <button
              type="button"
              className="forgot-password-modal__resend"
              disabled={countdown > 0 || isLoading}
              onClick={handleSendCode}
            >
              {countdown > 0
                ? t('forgotPassword_resendIn', { seconds: countdown })
                : t('forgotPassword_resend')}
            </button>
          </div>
        )}

        {step === 'role' && (
          <div className="forgot-password-modal__form">
            <div className="forgot-password-modal__roles">
              {availableRoles.includes('buyer') ? (
                <button
                  type="button"
                  className={`forgot-password-modal__role-card${selectedRole === 'buyer' ? ' forgot-password-modal__role-card--active' : ''}`}
                  onClick={() => {
                    setSelectedRole('buyer')
                    setError('')
                  }}
                >
                  <FiTrendingUp size={22} aria-hidden />
                  <span>{t('roleSwitch_buyerCabinet')}</span>
                </button>
              ) : null}
              {availableRoles.includes('seller') ? (
                <button
                  type="button"
                  className={`forgot-password-modal__role-card${selectedRole === 'seller' ? ' forgot-password-modal__role-card--active' : ''}`}
                  onClick={() => {
                    setSelectedRole('seller')
                    setError('')
                  }}
                >
                  <FiHome size={22} aria-hidden />
                  <span>{t('roleSwitch_sellerCabinet')}</span>
                </button>
              ) : null}
            </div>
            {error ? <p className="forgot-password-modal__error" role="alert">{error}</p> : null}
            <button type="button" className="forgot-password-modal__submit" onClick={handleRoleContinue}>
              {t('forgotPassword_continue')}
            </button>
          </div>
        )}

        {step === 'password' && (
          <form className="forgot-password-modal__form" onSubmit={handleResetPassword}>
            <label className="forgot-password-modal__label" htmlFor="forgot-new-password">
              {t('forgotPassword_newPasswordLabel')}
            </label>
            <div className="forgot-password-modal__password-wrap">
              <FiLock size={16} className="forgot-password-modal__password-icon" aria-hidden />
              <input
                id="forgot-new-password"
                type={showPassword ? 'text' : 'password'}
                className="forgot-password-modal__input forgot-password-modal__input--password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="forgot-password-modal__password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            <label className="forgot-password-modal__label" htmlFor="forgot-confirm-password">
              {t('confirmPasswordLabel')}
            </label>
            <div className="forgot-password-modal__password-wrap">
              <FiLock size={16} className="forgot-password-modal__password-icon" aria-hidden />
              <input
                id="forgot-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="forgot-password-modal__input forgot-password-modal__input--password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError('')
                }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="forgot-password-modal__password-toggle"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
              >
                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            <p className="forgot-password-modal__hint">{t('roleSwitch_passwordHint')}</p>
            {error ? <p className="forgot-password-modal__error" role="alert">{error}</p> : null}
            <button type="submit" className="forgot-password-modal__submit" disabled={isLoading}>
              {isLoading ? t('forgotPassword_saving') : t('forgotPassword_savePassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
