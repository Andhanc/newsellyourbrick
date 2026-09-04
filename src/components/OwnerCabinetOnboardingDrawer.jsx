import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { OWNER_ONBOARDING_IMAGES, preloadOwnerOnboardingImages } from './ownerOnboardingImages'
import './OwnerCabinetOnboardingDrawer.css'

const DEFAULT_STEP_COUNT = 4

export default function OwnerCabinetOnboardingDrawer({
  isOpen,
  onComplete,
  translationPrefix = 'ownerTest',
  images = OWNER_ONBOARDING_IMAGES,
  stepCount = DEFAULT_STEP_COUNT,
  finishLabelKey,
  buyerStyled = translationPrefix === 'buyerTest' || translationPrefix === 'buyerWelcome' || translationPrefix === 'ownerWelcome',
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [entered, setEntered] = useState(false)

  const handleClosed = useCallback(() => {
    setStep(0)
    onComplete?.()
  }, [onComplete])

  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, handleClosed, {
    duration: DRAWER_DISMISS_MS.panel,
  })

  useEffect(() => {
    if (!visible) {
      setEntered(false)
      return undefined
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    if (images === OWNER_ONBOARDING_IMAGES) {
      preloadOwnerOnboardingImages()
    } else {
      images.forEach((src, index) => {
        const img = new Image()
        img.decoding = 'async'
        if (index === 0) img.fetchPriority = 'high'
        img.src = src
      })
    }
    return undefined
  }, [visible, images])

  useEffect(() => {
    if (!visible) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible])

  if (!visible || typeof document === 'undefined') return null

  const isLastStep = step === stepCount - 1
  const finishKey = finishLabelKey || `${translationPrefix}_onboardingStart`

  const handlePrimary = () => {
    if (isLastStep) {
      requestClose()
      return
    }
    setStep((current) => Math.min(current + 1, stepCount - 1))
  }

  const titleBefore = t(`${translationPrefix}_onboardingStep${step + 1}TitleBefore`, { defaultValue: '' })
  const titleHighlight = t(`${translationPrefix}_onboardingStep${step + 1}TitleHighlight`, { defaultValue: '' })
  const titleAfter = t(`${translationPrefix}_onboardingStep${step + 1}TitleAfter`, { defaultValue: '' })
  const titleLine2 = t(`${translationPrefix}_onboardingStep${step + 1}TitleLine2`, { defaultValue: '' })

  return createPortal(
    <>
      <div
        className={`owner-onboarding-drawer__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
        aria-hidden="true"
      />
      <div
        className={`owner-onboarding-drawer${
          buyerStyled ? ' owner-onboarding-drawer--buyer' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-onboarding-drawer-title"
      >
        <div
          className={`owner-onboarding-drawer__panel${
            buyerStyled ? ' owner-onboarding-drawer__panel--buyer' : ''
          }${entered && !isClosing ? ' owner-onboarding-drawer__panel--entering' : ''}${
            isClosing ? ' owner-onboarding-drawer__panel--closing drawer-dismiss-from-bottom--closing' : ''
          }`}
        >
          <div className="owner-onboarding-drawer__handle" aria-hidden="true">
            <span className="owner-onboarding-drawer__handle-pill" />
          </div>

          <div className="owner-onboarding-drawer__hero">
            {images.map((src, index) => (
              <img
                key={src}
                className={`owner-onboarding-drawer__illustration${
                  index === step ? ' owner-onboarding-drawer__illustration--active' : ''
                }`}
                src={src}
                alt=""
                draggable={false}
                decoding="async"
                loading={index <= 1 ? 'eager' : 'lazy'}
                fetchPriority={index === step ? 'high' : 'low'}
              />
            ))}
          </div>

          <div className="owner-onboarding-drawer__content">
            <div className="owner-onboarding-drawer__copy">
              <p className="owner-onboarding-drawer__step-label">
                {t(`${translationPrefix}_onboardingStepCounter`, { current: step + 1, total: stepCount })}
              </p>

              <h2 id="owner-onboarding-drawer-title" className="owner-onboarding-drawer__title">
                <span className="owner-onboarding-drawer__title-line owner-onboarding-drawer__title-line--compact">
                  {titleBefore}
                  {titleBefore && titleHighlight ? ' ' : null}
                  {titleHighlight ? (
                    <span className="owner-onboarding-drawer__pill">{titleHighlight}</span>
                  ) : null}
                  {!titleLine2 && titleAfter ? (
                    <>
                      {titleHighlight || titleBefore ? ' ' : null}
                      {titleAfter}
                    </>
                  ) : null}
                </span>
                {titleLine2 ? (
                  <span className="owner-onboarding-drawer__title-line owner-onboarding-drawer__title-line--compact">
                    {titleLine2}
                  </span>
                ) : null}
              </h2>

              <p className="owner-onboarding-drawer__text">
                {t(`${translationPrefix}_onboardingStep${step + 1}Text`)}
              </p>
            </div>

            <div className="owner-onboarding-drawer__footer">
              <div
                className="owner-onboarding-drawer__dots"
                role="tablist"
                aria-label={t(`${translationPrefix}_onboardingStepsAria`)}
              >
                {Array.from({ length: stepCount }, (_, index) => (
                  <span
                    key={index}
                    role="tab"
                    aria-selected={index === step}
                    aria-label={t(`${translationPrefix}_onboardingStepDot`, { step: index + 1, total: stepCount })}
                    className={`owner-onboarding-drawer__dot${
                      index === step ? ' owner-onboarding-drawer__dot--active' : ''
                    }`}
                  />
                ))}
              </div>

              <button type="button" className="owner-onboarding-drawer__cta" onClick={handlePrimary}>
                {isLastStep ? t(finishKey) : t(`${translationPrefix}_onboardingNext`)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
