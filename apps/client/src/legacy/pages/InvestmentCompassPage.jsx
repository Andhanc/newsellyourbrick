import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Confetti from 'react-confetti'
import { FiArrowLeft, FiArrowUpRight } from 'react-icons/fi'
import { usePageSeoOverride } from '../context/PageSeoContext'
import { publicAsset } from '../utils/publicAsset'
import {
  COMPASS_CONFETTI_COLORS,
  COMPASS_ICON_SRC,
  COMPASS_INTRO_KEY,
  COMPASS_INTRO_MS,
  COMPASS_QUESTIONS,
  COMPASS_SELECT_ADVANCE_MS,
  COMPASS_STRATEGY_ICONS,
  clearCompassResult,
  consumeCompassIntroPending,
  getStrategyInfoSection,
  getStrategyPath,
  getStrategyTitleKey,
  isCompassComplete,
  readCompassState,
  saveCompassResult,
  scoreCompassAnswers,
} from '../utils/investmentCompass'
import './InvestmentCompassPage.css'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useWindowSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }))

  useEffect(() => {
    const sync = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return size
}

export default function InvestmentCompassPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const windowSize = useWindowSize()
  const advanceTimerRef = useRef(null)

  const [answers, setAnswers] = useState(() => readCompassState().result?.answers || {})
  const [stepIndex, setStepIndex] = useState(() => (
    readCompassState().result?.strategy ? COMPASS_QUESTIONS.length : 0
  ))
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return window.sessionStorage?.getItem(COMPASS_INTRO_KEY) === '1' && !prefersReducedMotion()
    } catch {
      return false
    }
  })
  const [justCompleted, setJustCompleted] = useState(false)
  const [confettiRecycle, setConfettiRecycle] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)

  const scored = useMemo(() => scoreCompassAnswers(answers), [answers])
  const isResult = stepIndex >= COMPASS_QUESTIONS.length && Boolean(scored.strategy)
  const question = COMPASS_QUESTIONS[stepIndex]
  const strategy = scored.strategy
  const infoSection = getStrategyInfoSection(strategy)
  const strategyTitle = t(getStrategyTitleKey(strategy))

  usePageSeoOverride({
    title: t('compass_seoTitle'),
    description: t('compass_seoDescription'),
    canonicalPath: '/compass',
  })

  useEffect(() => {
    const prev = document.title
    document.title = `${t('compass_seoTitle')} · SellYourBrick`
    return () => {
      document.title = prev
    }
  }, [t])

  useEffect(() => {
    consumeCompassIntroPending()
  }, [])

  useEffect(() => {
    if (!showIntro) return undefined
    const id = window.setTimeout(() => setShowIntro(false), COMPASS_INTRO_MS)
    return () => window.clearTimeout(id)
  }, [showIntro])

  useEffect(() => () => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current)
  }, [])

  useEffect(() => {
    if (!justCompleted) return undefined
    setShowConfetti(true)
    setConfettiRecycle(true)
    const stop = window.setTimeout(() => setConfettiRecycle(false), 5000)
    return () => window.clearTimeout(stop)
  }, [justCompleted])

  const finishQuiz = useCallback((nextAnswers) => {
    const result = scoreCompassAnswers(nextAnswers)
    saveCompassResult({
      strategy: result.strategy,
      answers: nextAnswers,
      scores: result.scores,
    })
    setJustCompleted(true)
    setStepIndex(COMPASS_QUESTIONS.length)
  }, [])

  const selectOption = useCallback((questionId, option) => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current)
    const nextAnswers = { ...answers, [questionId]: option }
    setAnswers(nextAnswers)

    const isLast = stepIndex >= COMPASS_QUESTIONS.length - 1
    const delay = prefersReducedMotion() ? 0 : COMPASS_SELECT_ADVANCE_MS
    advanceTimerRef.current = window.setTimeout(() => {
      if (isLast && isCompassComplete(nextAnswers)) finishQuiz(nextAnswers)
      else setStepIndex((current) => Math.min(current + 1, COMPASS_QUESTIONS.length))
    }, delay)
  }, [answers, finishQuiz, stepIndex])

  const goBack = useCallback(() => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current)
    if (isResult) {
      navigate('/')
      return
    }
    if (stepIndex === 0) {
      navigate(-1)
      return
    }
    setStepIndex((current) => Math.max(0, current - 1))
  }, [isResult, navigate, stepIndex])

  const retake = useCallback(() => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current)
    clearCompassResult()
    setAnswers({})
    setStepIndex(0)
    setJustCompleted(false)
    setShowConfetti(false)
    setConfettiRecycle(true)
  }, [])

  return (
    <div className="compass-page">
      {showIntro ? (
        <div className="compass-intro" aria-hidden="true">
          <span className="compass-intro__glow" />
          <span className="compass-intro__orbit" />
          <img
            className="compass-intro__icon"
            src={publicAsset(COMPASS_ICON_SRC)}
            alt=""
            width="512"
            height="512"
          />
          <p className="compass-intro__label">{t('compass_introLabel')}</p>
        </div>
      ) : null}

      {showConfetti ? (
        <div className="winner-celebration-confetti compass-confetti" aria-hidden>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={confettiRecycle}
            numberOfPieces={500}
            gravity={0.1}
            wind={0.02}
            colors={COMPASS_CONFETTI_COLORS}
            confettiSource={{
              x: 0,
              y: 0,
              w: windowSize.width,
              h: 0,
            }}
            initialVelocityX={4}
            initialVelocityY={6}
            tweenDuration={10000}
            onConfettiComplete={() => setShowConfetti(false)}
          />
        </div>
      ) : null}

      <header className="compass-page__top">
        <button type="button" className="compass-page__back" onClick={goBack} aria-label={t('compass_back')}>
          <FiArrowLeft aria-hidden="true" />
        </button>
        <div className="compass-page__brand">
          <img src={publicAsset(COMPASS_ICON_SRC)} alt="" width="512" height="512" />
          <h1>
            <span>{t('compass_kicker')}</span>
            <i>{t('compass_title')}</i>
          </h1>
        </div>
        {!isResult && question ? (
          <p className="compass-page__progress">
            {t('compass_progress', { current: stepIndex + 1, total: COMPASS_QUESTIONS.length })}
          </p>
        ) : (
          <span className="compass-page__progress-spacer" />
        )}
      </header>

      {!isResult ? (
        <div className="compass-page__track" aria-hidden="true">
          <span style={{ width: `${((stepIndex + 1) / COMPASS_QUESTIONS.length) * 100}%` }} />
        </div>
      ) : null}

      <main className="compass-page__main">
        {!isResult && question ? (
          <section className="compass-quiz" aria-labelledby="compass-question-title">
            <h2 id="compass-question-title">{t(`compass_q_${question.id}`)}</h2>
            <div className="compass-quiz__options">
              {question.options.map((option) => {
                const selected = answers[question.id] === option
                return (
                  <button
                    key={option}
                    type="button"
                    className={`compass-quiz__option${selected ? ' is-on' : ''}`}
                    onClick={() => selectOption(question.id, option)}
                  >
                    <span>{t(`compass_q_${question.id}_${option}`)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="compass-result" aria-labelledby="compass-result-title">
            <div className="compass-result__hero" aria-hidden="true">
              <img
                src={publicAsset(COMPASS_STRATEGY_ICONS[strategy] || COMPASS_STRATEGY_ICONS.auction)}
                alt=""
                width="512"
                height="512"
              />
            </div>
            <p className="compass-result__eyebrow">{t('compass_resultEyebrow')}</p>
            <h2 id="compass-result-title">{t('compass_resultTitle')}</h2>
            <p className="compass-result__profile">{t(`compass_profile_${strategy}`)}</p>
            <p className="compass-result__strategy">
              <span>{strategyTitle}</span>
            </p>
            <p className="compass-result__lead">{t(`compass_lead_${strategy}`)}</p>

            <div className="compass-result__howto">
              <h3>{t('compass_resultHow')}</h3>
              <ol>
                <li>{t(`sectionInfo_${infoSection}Step1`)}</li>
                <li>{t(`sectionInfo_${infoSection}Step2`)}</li>
                <li>{t(`sectionInfo_${infoSection}Step3`)}</li>
              </ol>
              <p className="compass-result__note">{t(`sectionInfo_${infoSection}Note`)}</p>
            </div>

            <div className="compass-result__actions">
              <button
                type="button"
                className="compass-result__cta"
                onClick={() => navigate(getStrategyPath(strategy))}
              >
                <span>{t(`compass_cta_${strategy}`)}</span>
                <span className="compass-result__cta-icon" aria-hidden="true">
                  <FiArrowUpRight />
                </span>
              </button>
              <button type="button" className="compass-result__retake" onClick={retake}>
                {t('compass_retake')}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
