import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiHome,
  FiLock,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi'
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

function RoleSwitchProgress({ current, total, label }) {
  return (
    <div className="role-switch-progress" aria-label={label}>
      <div className="role-switch-progress__meta">
        <span>{label}</span>
      </div>
      <div className="role-switch-progress__track" aria-hidden>
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={index < current ? 'role-switch-progress__segment role-switch-progress__segment--active' : 'role-switch-progress__segment'}
          />
        ))}
      </div>
    </div>
  )
}

function RoleSwitchPasswordField({
  id,
  label,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  placeholder,
  showPasswordLabel,
  hidePasswordLabel,
  requirementsId,
}) {
  return (
    <div className="role-switch-field">
      <label htmlFor={id}>{label}</label>
      <div className="role-switch-field__password-wrap">
        <FiLock className="role-switch-field__password-icon" size={17} aria-hidden />
        <input
          id={id}
          className="role-switch-field__password-input"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={placeholder}
          aria-describedby={requirementsId}
          required
        />
        <button
          type="button"
          className="role-switch-field__password-toggle"
          onClick={() => setShowPassword((visible) => !visible)}
          aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
        >
          {showPassword ? <FiEyeOff size={19} /> : <FiEye size={19} />}
        </button>
      </div>
    </div>
  )
}

function RoleSwitchPasswordChecklist({ id, password, t, includeDifferent = false }) {
  const rules = [
    { label: t('roleSwitch_passwordRequirementUpper'), met: /[A-ZА-Я]/.test(password) },
    { label: t('roleSwitch_passwordRequirementDigit'), met: /[0-9]/.test(password) },
    { label: t('roleSwitch_passwordRequirementSpecial'), met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) },
  ]
  const metCount = rules.filter((rule) => rule.met).length

  return (
    <div id={id} className="role-switch-password-checklist">
      <p className="role-switch-password-checklist__title">{t('roleSwitch_passwordRequirementsTitle')}</p>
      <div className="role-switch-password-checklist__grid" role="list">
        {rules.map((rule) => (
          <span
            key={rule.label}
            className={rule.met ? 'role-switch-password-rule role-switch-password-rule--met' : 'role-switch-password-rule'}
            role="listitem"
          >
            <span className="role-switch-password-rule__icon" aria-hidden>
              {rule.met ? <FiCheck size={13} /> : null}
            </span>
            {rule.label}
          </span>
        ))}
        {includeDifferent ? (
          <span className="role-switch-password-rule role-switch-password-rule--note" role="listitem">
            <FiShield className="role-switch-password-rule__shield" size={15} aria-hidden />
            {t('roleSwitch_passwordRequirementDifferent')}
          </span>
        ) : null}
      </div>
      <span className="role-switch-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {t('roleSwitch_passwordRequirementsProgress', { current: metCount, total: rules.length })}
      </span>
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
    pendingSwitchRole,
    isCurrentSeller,
    targetRole,
    closeAll,
    continueFromPitch,
    submitBuyerPassword,
    submitSetup,
    selectCabinet,
    submitSwitchPassword,
    switchToBuyerViaGoogle,
    goBackToCabinet,
    switching,
  } = flow

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [switchPassword, setSwitchPassword] = useState('')
  const [showSwitchPassword, setShowSwitchPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const resetAndClose = () => {
    if (switching) return
    setPassword('')
    setShowPassword(false)
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
  const sellerNeedsBuyerPassword =
    targetRole === 'seller' && linkedStatus?.buyer && linkedStatus.buyer.hasPassword === false
  const setupTotalSteps = sellerNeedsBuyerPassword ? 3 : 2
  const progressLabel = (current) => t('roleSwitch_stepLabel', { current, total: setupTotalSteps })

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
          <RoleSwitchProgress current={1} total={setupTotalSteps} label={progressLabel(1)} />
          {targetRole === 'seller' ? (
            <span className="role-switch-pitch__eyebrow">{t('roleSwitch_pitchSellerEyebrow')}</span>
          ) : null}
          <h2 id="role-switch-pitch-title" className="role-switch-pitch__title">
            {targetRole === 'buyer' ? t('roleSwitch_pitchBuyerTitle') : t('roleSwitch_pitchSellerTitle')}
          </h2>
          <p className="role-switch-pitch__text">
            {targetRole === 'buyer' ? t('roleSwitch_pitchBuyerBody') : t('roleSwitch_pitchSellerBody')}
          </p>
          {targetRole === 'seller' ? (
            <div className="role-switch-pitch__benefits" aria-label={t('roleSwitch_pitchSellerBenefitsAria')}>
              <span><FiCheck size={15} aria-hidden />{t('roleSwitch_pitchSellerBenefitOne')}</span>
              <span><FiCheck size={15} aria-hidden />{t('roleSwitch_pitchSellerBenefitTwo')}</span>
              <span><FiCheck size={15} aria-hidden />{t('roleSwitch_pitchSellerBenefitThree')}</span>
            </div>
          ) : null}
          {targetRole === 'seller' &&
          linkedStatus?.buyer &&
          linkedStatus.buyer.hasPassword === false ? (
            <p className="role-switch-pitch__note">{t('roleSwitch_pitchSellerGoogleNote')}</p>
          ) : null}
          <button type="button" className="role-switch-btn role-switch-btn--primary" onClick={continueFromPitch}>
            {targetRole === 'buyer' ? t('roleSwitch_pitchBuyerCta') : t('roleSwitch_pitchSellerCta')}
            <FiArrowRight size={18} aria-hidden />
          </button>
          <button type="button" className="role-switch-btn role-switch-btn--ghost" onClick={resetAndClose}>
            {t('roleSwitch_cancel')}
          </button>
        </div>
      </RoleSwitchDrawerShell>
      </>
    )
  }

  if (phase === 'buyer-password') {
    const handleBuyerPasswordSubmit = async (e) => {
      e.preventDefault()
      const ok = await submitBuyerPassword(password)
      if (ok) {
        setPassword('')
        setShowPassword(false)
      }
    }

    return (
      <>
        {switchingOverlay}
        <RoleSwitchDrawerShell
          isOpen
          onClose={resetAndClose}
          ariaLabelledBy="role-switch-buyer-password-title"
          maxHeightRatio={0.9}
          closeLabel={closeLabel}
        >
          <div className="role-switch-setup__body">
            <RoleSwitchProgress current={2} total={3} label={t('roleSwitch_stepLabel', { current: 2, total: 3 })} />
            <h2 id="role-switch-buyer-password-title" className="role-switch-setup__title">
              {t('roleSwitch_buyerPasswordTitle')}
            </h2>
            <p className="role-switch-setup__subtitle">{t('roleSwitch_buyerPasswordSubtitle')}</p>
            <p className="role-switch-setup__google-note">{t('roleSwitch_buyerPasswordGoogleNote')}</p>

            <div className="role-switch-profile" aria-label={t('roleSwitch_profileAria')}>
              <div className="role-switch-profile__row">
                <span className="role-switch-profile__label">{t('roleSwitch_profileName')}</span>
                <span className="role-switch-profile__value">{profilePreview.name}</span>
              </div>
              <div className="role-switch-profile__row">
                <span className="role-switch-profile__label">{t('roleSwitch_profileEmail')}</span>
                <span className="role-switch-profile__value">{profilePreview.email}</span>
              </div>
            </div>

            <form onSubmit={handleBuyerPasswordSubmit}>
              <RoleSwitchPasswordField
                id="role-switch-buyer-password"
                label={t('roleSwitch_buyerPasswordLabel')}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                placeholder={t('roleSwitch_passwordPlaceholder')}
                showPasswordLabel={t('showPassword')}
                hidePasswordLabel={t('hidePassword')}
                requirementsId="role-switch-buyer-password-requirements"
              />
              <RoleSwitchPasswordChecklist
                id="role-switch-buyer-password-requirements"
                password={password}
                t={t}
              />
              {error ? <p className="role-switch-error" role="alert">{error}</p> : null}
              <button
                type="submit"
                className="role-switch-btn role-switch-btn--primary"
                disabled={loading || !password}
              >
                {loading ? t('roleSwitch_saving') : t('roleSwitch_buyerPasswordSave')}
              </button>
            </form>
          </div>
        </RoleSwitchDrawerShell>
      </>
    )
  }

  if (phase === 'setup') {
    const handleSubmit = async (e) => {
      e.preventDefault()
      const ok = await submitSetup(password)
      if (ok) {
        setPassword('')
        setShowPassword(false)
      }
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
          <RoleSwitchProgress
            current={setupTotalSteps}
            total={setupTotalSteps}
            label={progressLabel(setupTotalSteps)}
          />
          <h2 id="role-switch-setup-title" className="role-switch-setup__title">
            {targetRole === 'seller' ? t('roleSwitch_setupSellerTitle') : t('roleSwitch_setupTitle')}
          </h2>
          <p className="role-switch-setup__subtitle">{t('roleSwitch_setupSubtitle')}</p>
          {targetRole === 'seller' ? (
            <div className="role-switch-password-explainer">
              <span className="role-switch-password-explainer__icon" aria-hidden><FiShield size={20} /></span>
              <span>
                <strong>{t('roleSwitch_passwordWhyTitle')}</strong>
                <small>{t('roleSwitch_passwordWhyBody')}</small>
              </span>
            </div>
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
            <RoleSwitchPasswordField
              id="role-switch-password"
              label={targetRole === 'seller' ? t('roleSwitch_sellerPasswordLabel') : t('roleSwitch_passwordLabel')}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              placeholder={t('roleSwitch_passwordPlaceholder')}
              showPasswordLabel={t('showPassword')}
              hidePasswordLabel={t('hidePassword')}
              requirementsId="role-switch-seller-password-requirements"
            />
            <RoleSwitchPasswordChecklist
              id="role-switch-seller-password-requirements"
              password={password}
              t={t}
              includeDifferent={targetRole === 'seller'}
            />
            {error ? <p className="role-switch-error" role="alert">{error}</p> : null}
            <button type="submit" className="role-switch-btn role-switch-btn--primary" disabled={loading || !password}>
              {loading
                ? t('roleSwitch_saving')
                : targetRole === 'seller'
                  ? t('roleSwitch_createSellerCabinet')
                  : t('roleSwitch_saveAndOpen')}
              {!loading ? <FiArrowRight size={18} aria-hidden /> : null}
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
            ariaLabelledBy="role-switch-switch-google-title"
            maxHeightRatio={0.58}
            closeLabel={closeLabel}
          >
            <div className="role-switch-setup__body">
              <h2 id="role-switch-switch-google-title" className="role-switch-setup__title">
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
