import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiArrowRight, FiPlay, FiX } from 'react-icons/fi'
import { publicAsset } from '../utils/publicAsset'
import './ProfileStrategyStories.css'

const STORY_DURATION_MS = 6500

const STORY_LOCALES = new Set(['ru', 'en', 'es', 'de', 'fr', 'pl', 'sv'])

function buildStrategyCopy(t, lng) {
  const opt = { lng }
  return {
    triggerEyebrow: t('profileStrategyStories_triggerEyebrow', opt),
    triggerTitle: t('profileStrategyStories_triggerTitle', opt),
    triggerText: t('profileStrategyStories_triggerText', opt),
    triggerButton: t('profileStrategyStories_triggerButton', opt),
    close: t('profileStrategyStories_close', opt),
    previous: t('profileStrategyStories_previous', opt),
    next: t('profileStrategyStories_next', opt),
    openSection: t('profileStrategyStories_openSection', opt),
    start: t('profileStrategyStories_start', opt),
    stories: Array.from({ length: 6 }, (_, i) => ({
      eyebrow: t(`profileStrategyStories_story${i}_eyebrow`, opt),
      title: t(`profileStrategyStories_story${i}_title`, opt),
      text: t(`profileStrategyStories_story${i}_text`, opt),
      note: t(`profileStrategyStories_story${i}_note`, opt),
    })),
  }
}

const STORY_BLUEPRINTS = [
  {
    id: 'intro',
    tone: 'intro',
    image: publicAsset('images/mobile-discover/welcome-summer.png'),
  },
  {
    id: 'auction',
    tone: 'auction',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-auction-summer.webp'),
    to: '/auction?filter=auction',
  },
  {
    id: 'shares',
    tone: 'shares',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-shares-summer.webp'),
    to: '/co-investment',
  },
  {
    id: 'debts',
    tone: 'debts',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-debts-summer.webp'),
    to: '/debts',
  },
  {
    id: 'buy-now',
    tone: 'buy-now',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-buy-now-summer.webp'),
    to: '/auction/buy-now',
  },
  {
    id: 'test-drive',
    tone: 'test-drive',
    image: publicAsset('images/test-drive/hero-resort-mobile.png'),
    to: '/test-drive',
  },
  {
    id: 'assistant',
    tone: 'assistant',
    image: publicAsset('images/mobile-discover/ai-trade-bg.png'),
    to: '/chat?assistant=1',
  },
]

function ProfileStrategyStories({ language = 'ru', showTrigger = true, openSignal = 0 }) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [runId, setRunId] = useState(0)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const localeCode = String(language || 'ru').toLowerCase().slice(0, 2)
  const locale = STORY_LOCALES.has(localeCode) ? localeCode : 'en'
  const copy = useMemo(() => buildStrategyCopy(t, locale), [t, locale])
  const stories = useMemo(
    () => {
      const items = STORY_BLUEPRINTS.map((story, index) => ({ ...story, ...copy.stories[index] }))
      items.splice(items.length - 1, 0, {
        id: 'development', tone: 'shares', to: '/development',
        image: publicAsset('images/development/costa-adeje-cover.png'),
        eyebrow: 'DEVELOP', title: t('develop.heading', { lng: locale }), text: t('develop.intro', { lng: locale }), note: t('develop.forecastNote', { lng: locale }),
      })
      return items
    },
    [copy, t, locale],
  )
  const activeStory = stories[activeIndex]

  const closeStories = useCallback(() => {
    setOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }, [])

  const restartTimer = useCallback(() => setRunId((value) => value + 1), [])

  const goNext = useCallback(() => {
    setActiveIndex((index) => {
      if (index >= stories.length - 1) {
        window.setTimeout(closeStories, 0)
        return index
      }
      return index + 1
    })
    restartTimer()
  }, [closeStories, restartTimer, stories.length])

  const goPrevious = useCallback(() => {
    setActiveIndex((index) => Math.max(0, index - 1))
    restartTimer()
  }, [restartTimer])

  const openStories = useCallback(() => {
    setActiveIndex(0)
    restartTimer()
    setOpen(true)
  }, [restartTimer])

  useEffect(() => {
    if (openSignal > 0) openStories()
  }, [openSignal, openStories])

  useEffect(() => {
    if (!open) return undefined
    const timeout = window.setTimeout(goNext, STORY_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [activeIndex, goNext, open, runId])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => closeRef.current?.focus(), 0)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeStories()
      if (event.key === 'ArrowLeft') goPrevious()
      if (event.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeStories, goNext, goPrevious, open])

  const handleStoryTap = (event) => {
    if (event.target.closest('button, a')) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX - bounds.left < bounds.width / 2) goPrevious()
    else goNext()
  }

  return (
    <>
      {showTrigger ? (
        <button
          ref={triggerRef}
          type="button"
          className="profile-strategy-card"
          onClick={openStories}
          aria-haspopup="dialog"
        >
          <span className="profile-strategy-card__media" aria-hidden>
            <img
              src={publicAsset('images/mobile-discover/ai-trade-bg.png')}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
          <span className="profile-strategy-card__wash" aria-hidden />
          <span className="profile-strategy-card__copy">
            <span className="profile-strategy-card__eyebrow">{copy.triggerEyebrow}</span>
            <strong>{copy.triggerTitle}</strong>
            <span className="profile-strategy-card__text">{t('develop.storiesIntro')}</span>
          </span>
          <span className="profile-strategy-card__action">
            <FiPlay size={14} fill="currentColor" aria-hidden />
            {copy.triggerButton}
          </span>
        </button>
      ) : null}

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  className="profile-strategy-stories"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                  role="dialog"
                  aria-modal="true"
                  aria-label={copy.triggerTitle}
                >
                  <motion.div
                    className="profile-strategy-story"
                    data-tone={activeStory.tone}
                    onClick={handleStoryTap}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.img
                        key={activeStory.id}
                        className="profile-strategy-story__image"
                        src={activeStory.image}
                        alt=""
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.45 }}
                      />
                    </AnimatePresence>
                    <span className="profile-strategy-story__overlay" aria-hidden />

                    <div
                      className="profile-strategy-story__progress"
                      style={{ '--story-count': stories.length }}
                      aria-label={`${activeIndex + 1} / ${stories.length}`}
                    >
                      {stories.map((story, index) => (
                        <span key={story.id} className="profile-strategy-story__progress-track">
                          <span
                            key={`${story.id}-${index === activeIndex ? runId : 'static'}`}
                            className={`profile-strategy-story__progress-fill${
                              index < activeIndex
                                ? ' profile-strategy-story__progress-fill--done'
                                : index === activeIndex
                                  ? ' profile-strategy-story__progress-fill--active'
                                  : ''
                            }`}
                            style={
                              index === activeIndex
                                ? { animationDuration: `${STORY_DURATION_MS}ms` }
                                : undefined
                            }
                          />
                        </span>
                      ))}
                    </div>

                    <div className="profile-strategy-story__topline">
                      <span className="profile-strategy-story__brand">
                        <span aria-hidden>SYB</span>
                        SellYourBrick
                      </span>
                      <button
                        ref={closeRef}
                        type="button"
                        className="profile-strategy-story__close"
                        onClick={closeStories}
                        aria-label={copy.close}
                      >
                        <FiX size={22} aria-hidden />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="profile-strategy-story__tap profile-strategy-story__tap--previous"
                      onClick={goPrevious}
                      aria-label={copy.previous}
                    />
                    <button
                      type="button"
                      className="profile-strategy-story__tap profile-strategy-story__tap--next"
                      onClick={goNext}
                      aria-label={copy.next}
                    />

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={activeStory.id}
                        className="profile-strategy-story__content"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.34, delay: 0.05 }}
                      >
                        <span className="profile-strategy-story__eyebrow">{activeStory.eyebrow}</span>
                        <h2>{activeStory.title}</h2>
                        <p>{activeStory.text}</p>
                        <span className="profile-strategy-story__note">{activeStory.note}</span>

                        {activeStory.to ? (
                          <Link
                            to={activeStory.to}
                            className="profile-strategy-story__cta"
                            onClick={closeStories}
                          >
                            <span>{activeStory.id === 'assistant' ? copy.start : copy.openSection}</span>
                            <FiArrowRight size={19} aria-hidden />
                          </Link>
                        ) : (
                          <button type="button" className="profile-strategy-story__cta" onClick={goNext}>
                            <span>{copy.start}</span>
                            <FiArrowRight size={19} aria-hidden />
                          </button>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}

export default ProfileStrategyStories
