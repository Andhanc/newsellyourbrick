import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiArrowRight, FiPlay, FiX } from 'react-icons/fi'
import { publicAsset } from '../utils/publicAsset'
import './ProfileStrategyStories.css'

const STORY_DURATION_MS = 6500

const STORY_COPY = {
  ru: {
    triggerEyebrow: 'Персональный маршрут',
    triggerTitle: 'Подобрать стратегию',
    triggerText: '7 коротких историй о том, как можно купить недвижимость на SellYourBrick',
    triggerButton: 'Смотреть',
    close: 'Закрыть истории',
    previous: 'Предыдущая история',
    next: 'Следующая история',
    openSection: 'Перейти',
    start: 'Начать подбор',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 минута',
        title: 'Какая стратегия подходит вам?',
        text: 'У каждого формата своя задача: купить выгоднее, войти с меньшим бюджетом, быстро оформить сделку или сначала пожить в объекте. Покажем варианты без сложных терминов.',
        note: 'Касайтесь краёв экрана или просто смотрите — истории переключатся сами.',
      },
      {
        eyebrow: 'Стратегия 01',
        title: 'Аукцион',
        text: 'Аукцион подходит для тех, кто хочет купить объект по цене, которую определяет открытый спрос. Следите за ставками, заранее выберите свой предел и участвуйте в прозрачных торгах.',
        note: 'Вы видите конкуренцию и сами решаете, до какой суммы готовы идти.',
      },
      {
        eyebrow: 'Стратегия 02',
        title: 'Доли',
        text: 'Доли подходят для тех, кто хочет инвестировать в премиальную недвижимость с меньшим бюджетом и распределить капитал между несколькими объектами.',
        note: 'Вы покупаете часть объекта и инвестируете вместе с другими участниками.',
      },
      {
        eyebrow: 'Стратегия 03',
        title: 'Долги',
        text: 'Долговые объекты подходят для тех, кто ищет недвижимость со значительным дисконтом и готов внимательно оценивать юридические и финансовые риски.',
        note: 'Мы собираем ключевые данные, чтобы решение было осознанным.',
      },
      {
        eyebrow: 'Стратегия 04',
        title: 'Купить сейчас',
        text: 'Покупка по фиксированной цене подходит для тех, кто уже нашёл подходящий объект и хочет перейти к сделке без ставок и ожидания окончания торгов.',
        note: 'Понятная стоимость, известные условия и более короткий путь к покупке.',
      },
      {
        eyebrow: 'Стратегия 05',
        title: 'Тест-драйв',
        text: 'Тест-драйв подходит для тех, кто хочет пожить в объекте до покупки и проверить район, ежедневный ритм и детали, которых не видно на фотографиях.',
        note: 'Сначала примерьте недвижимость на себя — затем принимайте решение.',
      },
      {
        eyebrow: 'Ваш следующий шаг',
        title: 'Умный помощник',
        text: 'Умный помощник подходит для тех, кто пока не определился со стратегией. Расскажите о бюджете, цели и сроке — он соберёт персональный маршрут.',
        note: 'Ответьте на несколько вопросов и получите подходящие направления.',
      },
    ],
  },
  en: {
    triggerEyebrow: 'Your personal route',
    triggerTitle: 'Choose a strategy',
    triggerText: 'Seven quick stories about ways to buy property with SellYourBrick',
    triggerButton: 'Watch',
    close: 'Close stories',
    previous: 'Previous story',
    next: 'Next story',
    openSection: 'Explore',
    start: 'Start exploring',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 minute',
        title: 'Which strategy suits you?',
        text: 'Each format solves a different need: buy at a better price, enter with a smaller budget, move quickly or live in the property before deciding. We will explain every option clearly.',
        note: 'Tap the sides or keep watching — stories move on automatically.',
      },
      {
        eyebrow: 'Strategy 01',
        title: 'Auction',
        text: 'An auction suits buyers who want the price to be shaped by open demand. Follow the bids, set your limit in advance and take part on transparent terms.',
        note: 'You can see the competition and decide exactly how far you are prepared to go.',
      },
      {
        eyebrow: 'Strategy 02',
        title: 'Shares',
        text: 'Property shares suit investors who want access to premium real estate with a smaller budget and the freedom to spread capital across several properties.',
        note: 'You own part of a property and invest alongside other participants.',
      },
      {
        eyebrow: 'Strategy 03',
        title: 'Debts',
        text: 'Debt-related properties suit investors looking for a meaningful discount who are prepared to assess the legal and financial risks carefully.',
        note: 'We bring the key information together so you can make an informed decision.',
      },
      {
        eyebrow: 'Strategy 04',
        title: 'Buy now',
        text: 'Buying at a fixed price suits people who have found the right property and want to move forward without bidding or waiting for an auction to finish.',
        note: 'A known price, clear terms and a shorter path to purchase.',
      },
      {
        eyebrow: 'Strategy 05',
        title: 'Test drive',
        text: 'A test drive suits buyers who want to live in the property before purchasing and experience the neighbourhood, daily rhythm and details that photos cannot show.',
        note: 'Try the property in real life, then make your decision.',
      },
      {
        eyebrow: 'Your next step',
        title: 'Smart assistant',
        text: 'The smart assistant suits anyone who has not chosen a strategy yet. Share your budget, goal and timeline, and it will build a personal route.',
        note: 'Answer a few questions to see the directions that fit you.',
      },
    ],
  },
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
    to: '/auction?filter=buy_now',
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
  const prefersReducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [runId, setRunId] = useState(0)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const locale = String(language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en'
  const copy = STORY_COPY[locale]
  const stories = useMemo(
    () => STORY_BLUEPRINTS.map((story, index) => ({ ...story, ...copy.stories[index] })),
    [copy],
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
            <span className="profile-strategy-card__text">{copy.triggerText}</span>
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

                    <div className="profile-strategy-story__progress" aria-label={`${activeIndex + 1} / ${stories.length}`}>
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
