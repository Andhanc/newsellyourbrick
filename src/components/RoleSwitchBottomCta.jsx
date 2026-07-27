import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiHome, FiTrendingUp, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { useRoleSwitchFlow } from '../hooks/useRoleSwitchFlow'
import { useHasBothLinkedRoles } from '../hooks/useHasBothLinkedRoles'
import { publicAsset } from '../utils/publicAsset'
import RoleSwitchDrawerShell from './RoleSwitchDrawerShell'
import ForgotPasswordModal from './ForgotPasswordModal'
import './RoleSwitch.css'

const PITCH_IMAGES = {
  buyer: publicAsset('images/role-switch/become-buyer-pitch.png'),
  seller: publicAsset('images/role-switch/become-seller-pitch.png'),
}

function RoleSwitchSwitchingOverlay({ show, message }) {
  if (!show) return null
  return (
    <div className="role-switch-switching-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="role-switch-switching-overlay__spinner" aria-hidden />
      <p className="role-switch-switching-overlay__text">{message}</p>
    </div>
  )
}

export function RoleSwitchModals({ flow }) {
  const { t } = useTranslation()
  const {
    phase,
    linkedStatus,
    profilePreview,
    loading,
    error,
    passwordHints,
    pendingSwitchRole,
    isCurrentSeller,
    targetRole,
    closeAll,
    continueFromPitch,
    submitSetup,
    selectCabinet,
    submitSwitchPassword,
    switchToBuyerViaGoogle,
    goBackToCabinet,
    switching,
  } = flow

  const [password, setPassword] = useState('')
  const [switchPassword, setSwitchPassword] = useState('')
  const [showSwitchPassword, setShowSwitchPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const resetAndClose = () => {
    if (switching) return
    setPassword('')
    setSwitchPassword('')
    closeAll()
  }

  const switchingOverlay = (
    <RoleSwitchSwitchingOverlay
      show={switching}
      message={t('roleSwitch_switchingProfile')}
    />
  )

  if (!phase) return switchingOverlay

  const pitchVariant = targetRole === 'buyer' ? 'buyer' : 'seller'
  const closeLabel = t('closeModalAria')

  if (phase === 'pitch') {
    return (
      <>
        {switchingOverlay}
        <RoleSwitchDrawerShell
        isOpen
        onClose={resetAndClose}
        ariaLabelledBy="role-switch-pitch-title"
        maxHeightRatio={0.72}
        closeLabel={closeLabel}
      >
        <img
          className="role-switch-pitch__hero"
          src={PITCH_IMAGES[pitchVariant]}
          alt=""
          aria-hidden
        />
        <div className="role-switch-pitch__body">
          <h2 id="role-switch-pitch-title" className="role-switch-pitch__title">
            {targetRole === 'buyer' ? t('roleSwitch_pitchBuyerTitle') : t('roleSwitch_pitchSellerTitle')}
          </h2>
          <p className="role-switch-pitch__text">
            {targetRole === 'buyer' ? t('roleSwitch_pitchBuyerBody') : t('roleSwitch_pitchSellerBody')}
          </p>
          {targetRole === 'seller' &&
          linkedStatus?.buyer &&
          linkedStatus.buyer.hasPassword === false ? (
            <p className="role-switch-pitch__note">{t('roleSwitch_pitchSellerGoogleNote')}</p>
          ) : null}
          <button type="button" className="role-switch-btn role-switch-btn--primary" onClick={continueFromPitch}>
            {targetRole === 'buyer' ? t('roleSwitch_pitchBuyerCta') : t('roleSwitch_pitchSellerCta')}
          </button>
          <button type="button" className="role-switch-btn role-switch-btn--ghost" onClick={resetAndClose}>
            {t('roleSwitch_cancel')}
          </button>
        </div>
      </RoleSwitchDrawerShell>
      </>
    )
  }

  if (phase === 'setup') {
    const handleSubmit = async (e) => {
      e.preventDefault()
      const ok = await submitSetup(password)
      if (ok) setPassword('')
    }

    return (
      <>
        {switchingOverlay}
        <RoleSwitchDrawerShell
        isOpen
        onClose={resetAndClose}
        ariaLabelledBy="role-switch-setup-title"
        maxHeightRatio={0.9}
        closeLabel={closeLabel}
      >
        <div className="role-switch-setup__body">
          <h2 id="role-switch-setup-title" className="role-switch-setup__title">
            {t('roleSwitch_setupTitle')}
          </h2>
          <p className="role-switch-setup__subtitle">{t('roleSwitch_setupSubtitle')}</p>
          {targetRole === 'seller' &&
          linkedStatus?.buyer &&
          linkedStatus.buyer.hasPassword === false ? (
            <p className="role-switch-setup__google-note">{t('roleSwitch_setupGoogleNote')}</p>
          ) : null}

          <div className="role-switch-profile" aria-label={t('roleSwitch_profileAria')}>
            <div className="role-switch-profile__row">
              <span className="role-switch-profile__label">{t('roleSwitch_profileName')}</span>
              <span className="role-switch-profile__value">{profilePreview.name}</span>
            </div>
            <div className="role-switch-profile__row">
              <span className="role-switch-profile__label">{t('roleSwitch_profileEmail')}</span>
              <span className="role-switch-profile__value">{profilePreview.email}</span>
            </div>
            <div className="role-switch-profile__row">
              <span className="role-switch-profile__label">{t('roleSwitch_profilePhone')}</span>
              <span className="role-switch-profile__value">{profilePreview.phone}</span>
            </div>
            <div className="role-switch-profile__row">
              <span className="role-switch-profile__label">{t('roleSwitch_profileCountry')}</span>
              <span className="role-switch-profile__value">{profilePreview.country}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="role-switch-field">
              <label htmlFor="role-switch-password">{t('roleSwitch_passwordLabel')}</label>
              <input
                id="role-switch-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('roleSwitch_passwordPlaceholder')}
                required
              />
            </div>
            <p className="role-switch-hint">{t('roleSwitch_passwordHint')}</p>
            {passwordHints?.missing?.length ? (
              <p className="role-switch-hint" role="status">
                {t('roleSwitch_passwordMissing', { items: passwordHints.missing.join(', ') })}
              </p>
            ) : null}
            {error ? <p className="role-switch-error" role="alert">{error}</p> : null}
            <button type="submit" className="role-switch-btn role-switch-btn--primary" disabled={loading || !password}>
              {loading ? t('roleSwitch_saving') : t('roleSwitch_saveAndOpen')}
            </button>
          </form>
        </div>
      </RoleSwitchDrawerShell>
      </>
    )
  }

  if (phase === 'cabinet') {
    return (
      <>
        {switchingOverlay}
        <RoleSwitchDrawerShell
        isOpen
        onClose={resetAndClose}
        ariaLabelledBy="role-switch-cabinets-title"
        wide
        maxHeightRatio={0.82}
        closeLabel={closeLabel}
      >
        <div className="role-switch-cabinets">
          <h2 id="role-switch-cabinets-title" className="role-switch-cabinets__title">
            {t('roleSwitch_cabinetsTitle')}
          </h2>
          <p className="role-switch-cabinets__subtitle">{t('roleSwitch_cabinetsSubtitle')}</p>

          <button
            type="button"
            className={`role-switch-cabinet-card${!isCurrentSeller ? ' role-switch-cabinet-card--active' : ''}`}
            onClick={() => selectCabinet('buyer')}
            disabled={!isCurrentSeller && loading}
          >
            <span className="role-switch-cabinet-card__icon role-switch-cabinet-card__icon--buyer" aria-hidden>
              <FiTrendingUp size={24} />
            </span>
            <span className="role-switch-cabinet-card__text">
              <p className="role-switch-cabinet-card__title">{t('roleSwitch_buyerCabinet')}</p>
              <p className="role-switch-cabinet-card__desc">{t('roleSwitch_buyerCabinetDesc')}</p>
            </span>
            {!isCurrentSeller ? (
              <span className="role-switch-cabinet-card__badge">{t('roleSwitch_current')}</span>
            ) : null}
          </button>

          <button
            type="button"
            className={`role-switch-cabinet-card${isCurrentSeller ? ' role-switch-cabinet-card--active' : ''}`}
            onClick={() => selectCabinet('seller')}
            disabled={isCurrentSeller && loading}
          >
            <span className="role-switch-cabinet-card__icon role-switch-cabinet-card__icon--seller" aria-hidden>
              <FiHome size={24} />
            </span>
            <span className="role-switch-cabinet-card__text">
              <p className="role-switch-cabinet-card__title">{t('roleSwitch_sellerCabinet')}</p>
              <p className="role-switch-cabinet-card__desc">{t('roleSwitch_sellerCabinetDesc')}</p>
            </span>
            {isCurrentSeller ? (
              <span className="role-switch-cabinet-card__badge">{t('roleSwitch_current')}</span>
            ) : null}
          </button>

          {error ? <p className="role-switch-error" role="alert">{error}</p> : null}
        </div>
      </RoleSwitchDrawerShell>
      </>
    )
  }

  if (phase === 'switch-password') {
    const handleSwitch = async (e) => {
      e.preventDefault()
      const ok = await submitSwitchPassword(switchPassword)
      if (ok) setSwitchPassword('')
    }

    const targetLabel =
      pendingSwitchRole === 'seller' ? t('roleSwitch_sellerCabinet') : t('roleSwitch_buyerCabinet')

    const forgotEmail =
      profilePreview.email && profilePreview.email !== '—' ? profilePreview.email : ''

    const buyerUsesGoogle =
      pendingSwitchRole === 'buyer' && linkedStatus?.buyer && linkedStatus.buyer.hasPassword === false

    if (buyerUsesGoogle) {
      return (
        <>
          {switchingOverlay}
          <RoleSwitchDrawerShell
            isOpen={!switching}
            onClose={resetAndClose}
            onBack={goBackToCabinet}
            backLabel={t('roleSwitch_back')}
            ariaLabelledBy="role-switch-switch-title"
            maxHeightRatio={0.58}
            closeLabel={closeLabel}
          >
            <div className="role-switch-setup__body">
              <h2 id="role-switch-switch-title" className="role-switch-setup__title">
                {t('roleSwitch_switchTitle', { cabinet: targetLabel })}
              </h2>
              <p className="role-switch-setup__subtitle">{t('roleSwitch_switchGoogleSubtitle')}</p>
              {error ? <p className="role-switch-error" role="alert">{error}</p> : null}
              <button
                type="button"
                className="role-switch-btn role-switch-btn--primary role-switch-btn--google"
                disabled={loading}
                onClick={() => void switchToBuyerViaGoogle()}
              >
                {loading ? t('roleSwitch_switching') : t('roleSwitch_switchGoogleCta')}
              </button>
            </div>
          </RoleSwitchDrawerShell>
        </>
      )
    }

    return (
      <>
        {switchingOverlay}
        <RoleSwitchDrawerShell
          isOpen={!switching && !showForgotPassword}
          onClose={resetAndClose}
          onBack={goBackToCabinet}
          backLabel={t('roleSwitch_back')}
          ariaLabelledBy="role-switch-switch-title"
          maxHeightRatio={0.58}
          closeLabel={closeLabel}
        >
          <div className="role-switch-setup__body">
            <h2 id="role-switch-switch-title" className="role-switch-setup__title">
              {t('roleSwitch_switchTitle', { cabinet: targetLabel })}
            </h2>
            <p className="role-switch-setup__subtitle">{t('roleSwitch_switchSubtitle')}</p>

            <form onSubmit={handleSwitch}>
              <div className="role-switch-field">
                <label htmlFor="role-switch-switch-password">{t('roleSwitch_switchPasswordLabel')}</label>
                <div className="role-switch-field__password-wrap">
                  <FiLock className="role-switch-field__password-icon" size={16} aria-hidden />
                  <input
                    id="role-switch-switch-password"
                    className="role-switch-field__password-input"
                    type={showSwitchPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={switchPassword}
                    onChange={(e) => setSwitchPassword(e.target.value)}
                    placeholder={t('roleSwitch_passwordPlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    className="role-switch-field__password-toggle"
                    onClick={() => setShowSwitchPassword((v) => !v)}
                    aria-label={showSwitchPassword ? t('hidePassword') : t('showPassword')}
                    tabIndex={-1}
                  >
                    {showSwitchPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <div className="role-switch-forgot">
                <button
                  type="button"
                  className="role-switch-forgot__link"
                  onClick={() => setShowForgotPassword(true)}
                >
                  {t('forgotPassword')}
                </button>
              </div>
              {error ? <p className="role-switch-error" role="alert">{error}</p> : null}
              <button type="submit" className="role-switch-btn role-switch-btn--primary" disabled={loading || !switchPassword}>
                {loading ? t('roleSwitch_switching') : t('roleSwitch_switchConfirm')}
              </button>
            </form>
          </div>
        </RoleSwitchDrawerShell>

        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          initialEmail={forgotEmail}
          initialRole={pendingSwitchRole}
          elevated
          onSuccess={() => {
            setShowForgotPassword(false)
            setSwitchPassword('')
          }}
        />
      </>
    )
  }

  return switchingOverlay
}

export function RoleSwitchBottomCta({
  targetRole,
  className = '',
  flow: externalFlow = null,
  renderModals = true,
  onOpen,
}) {
  const { t } = useTranslation()
  const { hasBoth, loaded } = useHasBothLinkedRoles()
  const internalFlow = useRoleSwitchFlow(targetRole)
  const flow = externalFlow || internalFlow
  const isBuyer = targetRole === 'buyer'
  const Icon = isBuyer ? FiTrendingUp : FiHome

  const handleOpen = async () => {
    if (typeof onOpen === 'function') {
      await onOpen(flow)
      return
    }
    await flow.openFlow()
  }

  if (!loaded || hasBoth) return null

  return (
    <>
      <div className={`role-switch-bottom-cta${isBuyer ? '' : ' role-switch-bottom-cta--seller'} ${className}`.trim()}>
        <button
          type="button"
          className="role-switch-bottom-cta__btn"
          onClick={() => void handleOpen()}
          disabled={flow.loading}
        >
          <Icon size={20} aria-hidden />
          {isBuyer ? t('heroPitchBecomeBuyerCta') : t('becomeSeller')}
        </button>
      </div>
      {renderModals && !externalFlow ? <RoleSwitchModals flow={flow} /> : null}
    </>
  )
}

/** Кнопка с тем же флоу — для сайдбара, рекламных блоков и т.д. */
export function RoleSwitchButton({ targetRole, className = '', children }) {
  const flow = useRoleSwitchFlow(targetRole)
  const { hasBoth, loaded } = useHasBothLinkedRoles()

  if (!loaded || hasBoth) return null

  return (
    <>
      <button type="button" className={className} onClick={flow.openFlow} disabled={flow.loading}>
        {children}
      </button>
      <RoleSwitchModals flow={flow} />
    </>
  )
}
