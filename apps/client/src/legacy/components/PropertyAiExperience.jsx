import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiArrowRight,
  FiArrowUp,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiMessageCircle,
  FiRefreshCw,
  FiShield,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi'
import { getStoredNumericUserId, isAuthenticated } from '../services/authService'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import {
  getPropertyAiHistory,
  getPropertyAiPdfBlob,
  getPropertyAiReport,
  startPropertyAiReport,
} from '../services/propertyAiService'
import './PropertyAiExperience.css'

const SCENARIOS = [
  { id: 'risks', label: 'Плюсы и риски', question: 'Какие у этого объекта главные плюсы и риски?', Icon: FiShield },
  { id: 'investment', label: 'Инвестиционный потенциал', question: 'Какой инвестиционный потенциал у этого объекта?', Icon: FiTrendingUp },
  { id: 'details', label: 'Подробный разбор', question: 'Сделай подробный разбор этого объекта.', Icon: FiFileText },
  { id: 'custom', label: 'Свой вопрос', question: '', Icon: FiMessageCircle },
]

const STATUS_COPY = {
  queued: ['Готовим анализ', 'Собираем данные объявления'],
  analyzing: ['Анализируем объект', 'Gemini изучает характеристики и фотографии'],
  rendering: ['Оформляем презентацию', 'Создаём страницы и собираем PDF'],
}

const LAUNCHER_HOLD_MS = 1100
const LAUNCHER_MORPH_MS = 2800
const LAUNCHER_MORPH_EASE = 'cubic-bezier(0.45, 0.05, 0.25, 1)'

function propertyImages(property) {
  const source = property?.images || property?.photos || []
  if (Array.isArray(source)) return source.filter(Boolean)
  try {
    const parsed = JSON.parse(source)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return property?.image ? [property.image] : []
  }
}

function splitAnswerLines(value) {
  return String(value || '')
    .split(/\n+|(?<=[.!?])\s+(?=[А-ЯA-ZЁ])/u)
    .map((line) => line.trim())
    .filter(Boolean)
}

function PropertyMiniCard({ property }) {
  const image = propertyImages(property)[0]
  return (
    <article className="property-ai-card">
      {image ? <img src={image} alt="" /> : <div className="property-ai-card__placeholder">AI</div>}
      <div>
        <strong>{property?.title || property?.name || 'Объект недвижимости'}</strong>
        <span>{[property?.area ? `${property.area} м²` : '', property?.rooms ? `${property.rooms} комн.` : '', property?.floor ? `${property.floor} этаж` : ''].filter(Boolean).join(' · ')}</span>
        <small>{property?.location || 'Локация указана в объявлении'}</small>
      </div>
    </article>
  )
}

export default function PropertyAiExperience({
  property,
  onRequireLogin,
  desktop = false,
  deferLauncherCollapse = false,
}) {
  const [view, setView] = useState('closed')
  const [launcherExpanded, setLauncherExpanded] = useState(true)
  const [job, setJob] = useState(null)
  const [question, setQuestion] = useState('')
  const [customQuestion, setCustomQuestion] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [revealedLineCount, setRevealedLineCount] = useState(0)
  const pollAbortRef = useRef(null)
  const launcherRef = useRef(null)
  const sparkRef = useRef(null)
  const labelRef = useRef(null)
  const morphAnimsRef = useRef([])
  const propertyId = property?.id
  const propertyTable = property?.source_table || property?.property_table || property?.table || ''
  const images = useMemo(() => propertyImages(property).slice(0, 2), [property])
  const directAnswer = job?.report?.directAnswer || job?.shortAnswer
  const answerLines = useMemo(() => splitAnswerLines(directAnswer), [directAnswer])
  const answerStrengths = job?.report?.strengths || []
  const answerRisks = job?.report?.risks || []
  const answerRevealComplete = answerLines.length > 0 && revealedLineCount >= answerLines.length

  const requireUser = useCallback(() => {
    const userId = getStoredNumericUserId()
    if (!isAuthenticated() || !userId) {
      if (onRequireLogin) onRequireLogin()
      else requestOpenLoginModal({ wizard: true })
      return null
    }
    return userId
  }, [onRequireLogin])

  const loadHistory = useCallback(async () => {
    const userId = getStoredNumericUserId()
    if (!userId || !propertyId) return
    try {
      setHistory(await getPropertyAiHistory({ userId, propertyId, propertyTable }))
    } catch {
      setHistory([])
    }
  }, [propertyId, propertyTable])

  const pollReport = useCallback(async (reportId, userId) => {
    pollAbortRef.current?.abort()
    const controller = new AbortController()
    pollAbortRef.current = controller
    for (let attempt = 0; attempt < 35; attempt += 1) {
      const next = await getPropertyAiReport({ userId, reportId, signal: controller.signal })
      setJob(next)
      if (next.status === 'completed' || next.status === 'failed') {
        void loadHistory()
        return next
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
    }
    throw new Error('Генерация занимает больше обычного. Отчёт появится в истории.')
  }, [loadHistory])

  const start = useCallback(async (category, nextQuestion) => {
    const userId = requireUser()
    if (!userId || !propertyId) return
    setView('chat')
    setHistoryOpen(false)
    setQuestion(nextQuestion)
    setJob({ status: 'queued', question: nextQuestion, category })
    setError('')
    try {
      const result = await startPropertyAiReport({
        userId, propertyId, propertyTable, category, question: nextQuestion,
      })
      setJob(result.data)
      if (!['completed', 'failed'].includes(result.data.status)) {
        await pollReport(result.data.id, userId)
      } else {
        void loadHistory()
      }
    } catch (startError) {
      if (startError?.name !== 'AbortError') {
        setError(startError?.message || 'Не удалось подготовить отчёт.')
        setJob((current) => ({ ...current, status: 'failed' }))
      }
    }
  }, [loadHistory, pollReport, propertyId, propertyTable, requireUser])

  const selectScenario = (scenario) => {
    if (!requireUser()) return
    if (scenario.id === 'custom') {
      setQuestion('')
      setJob(null)
      setView('chat')
      return
    }
    void start(scenario.id, scenario.question)
  }

  const submitCustom = () => {
    const value = customQuestion.trim()
    if (value.length < 5) {
      setError('Напишите вопрос длиной не менее 5 символов.')
      return
    }
    setCustomQuestion('')
    void start('custom', value)
  }

  const openHistoryReport = (report) => {
    pollAbortRef.current?.abort()
    setJob(report)
    setQuestion(report.question)
    setHistoryOpen(false)
    setError(report.error || '')
  }

  const handlePdf = async (download) => {
    const userId = requireUser()
    if (!userId || !job?.id) return
    setPdfBusy(true)
    try {
      const blob = await getPropertyAiPdfBlob({ userId, reportId: job.id, download })
      const url = URL.createObjectURL(blob)
      if (download) {
        const link = document.createElement('a')
        link.href = url
        link.download = `property-ai-${propertyId}-${job.id}.pdf`
        link.click()
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (pdfError) {
      setError(pdfError?.message || 'Не удалось открыть PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  const clearLauncherInlineStyles = useCallback(() => {
    const el = launcherRef.current
    const spark = sparkRef.current
    const label = labelRef.current
    if (el) {
      el.classList.remove('property-ai-launcher--morphing')
      el.style.width = ''
      el.style.transform = ''
      el.style.padding = ''
    }
    if (spark) spark.style.transform = ''
    if (label) {
      label.style.maxWidth = ''
      label.style.opacity = ''
      label.style.width = ''
    }
  }, [])

  const cancelLauncherMorph = useCallback(() => {
    morphAnimsRef.current.forEach((animation) => {
      try {
        animation.cancel()
      } catch {
        /* ignore */
      }
    })
    morphAnimsRef.current = []
    clearLauncherInlineStyles()
  }, [clearLauncherInlineStyles])

  const runLauncherMorph = useCallback((anims) => {
    morphAnimsRef.current = anims
    Promise.all(anims.map((animation) => animation.finished.catch(() => {}))).then(() => {
      if (!launcherRef.current) return
      // Снимаем fill:forwards, иначе CSS-разворот по клику не применяется
      anims.forEach((animation) => {
        try {
          animation.cancel()
        } catch {
          /* ignore */
        }
      })
      morphAnimsRef.current = []
      clearLauncherInlineStyles()
    })
  }, [clearLauncherInlineStyles])

  const collapseLauncherWithMorph = useCallback(() => {
    const el = launcherRef.current
    const spark = sparkRef.current
    const label = labelRef.current
    if (!el) {
      setLauncherExpanded(false)
      return
    }

    cancelLauncherMorph()

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLauncherExpanded(false)
      return
    }

    const firstBox = el.getBoundingClientRect()
    const labelWidth = label ? Math.ceil(label.scrollWidth) : 0
    const firstPadding = getComputedStyle(el).padding

    // FLIP синхронно до paint: иначе один кадр со «скачком» влево
    el.classList.add('property-ai-launcher--morphing')
    el.classList.add('property-ai-launcher--collapsed')
    const lastBox = el.getBoundingClientRect()
    const lastWidth = lastBox.width

    // Правый якорь + исходная ширина; звезда absolute слева — сама приедет в центр круга
    el.style.width = `${firstBox.width}px`
    el.style.padding = firstPadding
    if (label) {
      label.style.maxWidth = `${labelWidth}px`
      label.style.opacity = '1'
    }
    if (spark) spark.style.transform = 'rotate(0deg)'

    const invertedBox = el.getBoundingClientRect()
    const dx = firstBox.left - invertedBox.left
    el.style.transform = `translate3d(${dx}px, 0, 0)`
    el.getBoundingClientRect()

    setLauncherExpanded(false)

    const anims = [
      el.animate(
        [
          {
            width: `${firstBox.width}px`,
            transform: `translate3d(${dx}px, 0, 0)`,
            padding: firstPadding,
          },
          {
            width: `${lastWidth}px`,
            transform: 'translate3d(0, 0, 0)',
            padding: '0px',
          },
        ],
        { duration: LAUNCHER_MORPH_MS, easing: LAUNCHER_MORPH_EASE, fill: 'forwards' },
      ),
    ]

    if (label) {
      anims.push(
        label.animate(
          [
            { maxWidth: `${labelWidth}px`, opacity: 1 },
            { maxWidth: '0px', opacity: 0 },
          ],
          { duration: LAUNCHER_MORPH_MS, easing: LAUNCHER_MORPH_EASE, fill: 'forwards' },
        ),
      )
    }

    if (spark) {
      anims.push(
        spark.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
          { duration: LAUNCHER_MORPH_MS, easing: LAUNCHER_MORPH_EASE, fill: 'forwards' },
        ),
      )
    }

    runLauncherMorph(anims)
  }, [cancelLauncherMorph, runLauncherMorph])

  const expandLauncherWithMorph = useCallback(() => {
    const el = launcherRef.current
    const spark = sparkRef.current
    const label = labelRef.current
    if (!el) {
      setLauncherExpanded(true)
      return
    }

    cancelLauncherMorph()

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLauncherExpanded(true)
      return
    }

    const firstBox = el.getBoundingClientRect()

    el.classList.add('property-ai-launcher--morphing')
    el.classList.remove('property-ai-launcher--collapsed')
    if (label) {
      label.style.maxWidth = 'none'
      label.style.width = 'auto'
      label.style.opacity = '0'
    }
    el.style.width = ''
    el.style.padding = ''
    el.style.transform = ''

    const lastBox = el.getBoundingClientRect()
    const lastWidth = lastBox.width
    const lastPadding = getComputedStyle(el).padding
    const labelWidth = label ? Math.ceil(label.scrollWidth) : 0

    el.style.transform = 'translate3d(0, 0, 0)'
    const baseExpandedBox = el.getBoundingClientRect()
    const endDx = lastBox.left - baseExpandedBox.left

    el.style.width = `${firstBox.width}px`
    el.style.padding = '0px'
    el.style.transform = 'translate3d(0, 0, 0)'
    if (label) {
      label.style.maxWidth = '0px'
      label.style.opacity = '0'
    }
    if (spark) spark.style.transform = 'rotate(0deg)'

    const invertedBox = el.getBoundingClientRect()
    const startDx = firstBox.left - invertedBox.left
    el.style.transform = `translate3d(${startDx}px, 0, 0)`
    el.getBoundingClientRect()

    setLauncherExpanded(true)

    const anims = [
      el.animate(
        [
          {
            width: `${firstBox.width}px`,
            transform: `translate3d(${startDx}px, 0, 0)`,
            padding: '0px',
          },
          {
            width: `${lastWidth}px`,
            transform: `translate3d(${endDx}px, 0, 0)`,
            padding: lastPadding,
          },
        ],
        { duration: LAUNCHER_MORPH_MS, easing: LAUNCHER_MORPH_EASE, fill: 'forwards' },
      ),
    ]

    if (label) {
      anims.push(
        label.animate(
          [
            { maxWidth: '0px', opacity: 0 },
            { maxWidth: `${labelWidth}px`, opacity: 1 },
          ],
          { duration: LAUNCHER_MORPH_MS, easing: LAUNCHER_MORPH_EASE, fill: 'forwards' },
        ),
      )
    }

    if (spark) {
      anims.push(
        spark.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }],
          { duration: LAUNCHER_MORPH_MS, easing: LAUNCHER_MORPH_EASE, fill: 'forwards' },
        ),
      )
    }

    runLauncherMorph(anims)
  }, [cancelLauncherMorph, runLauncherMorph])

  useEffect(() => () => pollAbortRef.current?.abort(), [])
  useEffect(() => {
    cancelLauncherMorph()
    setLauncherExpanded(true)
    if (deferLauncherCollapse) return undefined
    const timer = window.setTimeout(() => collapseLauncherWithMorph(), LAUNCHER_HOLD_MS)
    return () => {
      window.clearTimeout(timer)
      cancelLauncherMorph()
    }
  }, [cancelLauncherMorph, collapseLauncherWithMorph, deferLauncherCollapse, propertyId])

  useEffect(() => {
    if (view !== 'closed') document.body.classList.add('property-ai-is-open')
    else document.body.classList.remove('property-ai-is-open')
    return () => document.body.classList.remove('property-ai-is-open')
  }, [view])

  useEffect(() => {
    setRevealedLineCount(0)
    if (!answerLines.length) return undefined
    const timer = window.setInterval(() => {
      setRevealedLineCount((count) => {
        if (count >= answerLines.length) {
          window.clearInterval(timer)
          return count
        }
        return count + 1
      })
    }, 320)
    return () => window.clearInterval(timer)
  }, [answerLines])

  const statusCopy = STATUS_COPY[job?.status]
  const handleLauncherClick = () => {
    if (!launcherExpanded) {
      expandLauncherWithMorph()
      return
    }
    setView('picker')
  }

  return (
    <section className={`property-ai-experience${desktop ? ' property-ai-experience--desktop' : ''}`}>
      <button
        ref={launcherRef}
        type="button"
        className={`property-ai-launcher${launcherExpanded ? '' : ' property-ai-launcher--collapsed'}`}
        onClick={handleLauncherClick}
        aria-label={launcherExpanded ? 'Открыть Недвижимость AI' : 'Развернуть Недвижимость AI'}
      >
        <span ref={sparkRef} className="property-ai-spark" aria-hidden>✦</span>
        <span ref={labelRef} className="property-ai-launcher__label">НЕДВИЖИМОСТЬ AI</span>
      </button>

      {view === 'picker' && (
        <div className="property-ai-overlay property-ai-overlay--picker" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setView('closed')}>
          <div className="property-ai-picker" role="dialog" aria-modal="true" aria-labelledby="property-ai-picker-title">
            <button className="property-ai-close property-ai-close--dark" type="button" onClick={() => setView('closed')} aria-label="Закрыть"><FiX /></button>
            <div className="property-ai-picker__thumbs" aria-hidden>
              {images.map((image, index) => <img key={image} src={image} alt="" style={{ transform: `rotate(${index ? 8 : -2}deg)` }} />)}
              {!images.length && <span>AI</span>}
            </div>
            <h2 id="property-ai-picker-title">РАССКАЖУ ПРО ЭТОТ<br />ОБЪЕКТ</h2>
            <div className="property-ai-picker__actions">
              {SCENARIOS.map((scenario) => {
                const Icon = scenario.Icon
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    className="btn-tiffany-shine"
                    onClick={() => selectScenario(scenario)}
                  >
                    <span className="property-ai-picker__action-icon" aria-hidden>
                      <Icon size={18} strokeWidth={2.4} />
                    </span>
                    <span className="property-ai-picker__action-label">{scenario.label}</span>
                    <span className="property-ai-picker__action-arrow" aria-hidden>
                      <FiArrowRight size={18} strokeWidth={2.4} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'chat' && (
        <div
          className="property-ai-drawer-layer"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setView('closed')}
        >
          <div className="property-ai-chat" role="dialog" aria-modal="true" aria-label="Недвижимость AI">
          <header className="property-ai-chat__header">
            <button type="button" onClick={() => setView('closed')} aria-label="Закрыть"><FiX /></button>
            <strong>НЕДВИЖИМОСТЬ AI</strong>
            <button type="button" onClick={() => { setHistoryOpen((open) => !open); void loadHistory() }} aria-label="История"><FiClock /></button>
          </header>

          <div className="property-ai-chat__body">
            <p className="property-ai-greeting">Привет! Я изучу данные этого объявления, дам короткий ответ и подготовлю подробную PDF-презентацию.</p>
            <div className="property-ai-property-row"><PropertyMiniCard property={property} /></div>
            {question && <div className="property-ai-user-message">{question}</div>}

            {statusCopy && (
              <div className="property-ai-progress" aria-live="polite">
                <span className="property-ai-progress__orb">✦</span>
                <div><strong>{statusCopy[0]}</strong><p>{statusCopy[1]}</p></div>
                <i />
              </div>
            )}

            {answerLines.length > 0 && (
              <div className="property-ai-answer" aria-live="polite">
                {answerLines.slice(0, revealedLineCount).map((line, index) => (
                  <p
                    key={`answer-${job?.id || 'pending'}-${index}`}
                    className="property-ai-answer-line"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}

            {answerRevealComplete && (answerStrengths.length > 0 || answerRisks.length > 0) && (
              <div className="property-ai-answer-summary">
                {answerStrengths.length > 0 && (
                  <section className="property-ai-answer-summary__group property-ai-answer-summary__group--strengths">
                    <strong><span aria-hidden>+</span> Плюсы</strong>
                    <ul>{answerStrengths.slice(0, 4).map((item, index) => <li key={`strength-${index}`}>{item}</li>)}</ul>
                  </section>
                )}
                {answerRisks.length > 0 && (
                  <section className="property-ai-answer-summary__group property-ai-answer-summary__group--risks">
                    <strong><span aria-hidden>!</span> Риски</strong>
                    <ul>{answerRisks.slice(0, 4).map((item, index) => <li key={`risk-${index}`}>{item}</li>)}</ul>
                  </section>
                )}
              </div>
            )}

            {job?.shortAnswer && answerRevealComplete && (
              <article className={`property-ai-pdf-card${job.status !== 'completed' ? ' property-ai-pdf-card--pending' : ''}`}>
                <div className="property-ai-pdf-card__icon">
                  {job.status === 'rendering' ? <span className="property-ai-pdf-spinner" aria-hidden /> : <FiFileText />}
                </div>
                <div>
                  <span>
                    {job.status === 'completed'
                      ? 'PDF · 6–7 страниц'
                      : job.status === 'failed'
                        ? 'PDF не создан'
                        : 'Собираем PDF-презентацию'}
                  </span>
                  <strong>{job.report?.title || 'Подробный AI-разбор объекта'}</strong>
                  <small>
                    {job.status === 'completed'
                      ? 'С реальными фото, выводами и допущениями'
                      : job.status === 'failed'
                        ? 'Можно повторить создание файла'
                        : 'Файл появится здесь автоматически'}
                  </small>
                </div>
                {job.status === 'completed' ? (
                  <div className="property-ai-pdf-card__actions">
                    <button type="button" disabled={pdfBusy} onClick={() => handlePdf(false)}><FiExternalLink /> Открыть</button>
                    <button type="button" disabled={pdfBusy} onClick={() => handlePdf(true)}><FiDownload /> Скачать</button>
                  </div>
                ) : job.status === 'failed' ? (
                  <div className="property-ai-pdf-card__actions">
                    <button type="button" onClick={() => start(job.category || 'custom', job.question)}><FiRefreshCw /> Создать снова</button>
                  </div>
                ) : (
                  <div className="property-ai-pdf-wait" aria-label="PDF создаётся"><i /></div>
                )}
              </article>
            )}

            {error && <div className="property-ai-error"><p>{error}</p>{job?.question && <button type="button" onClick={() => start(job.category || 'custom', job.question)}><FiRefreshCw /> Попробовать снова</button>}</div>}
          </div>

          <form className="property-ai-composer" onSubmit={(event) => { event.preventDefault(); submitCustom() }}>
            <input value={customQuestion} onChange={(event) => setCustomQuestion(event.target.value)} placeholder="Задайте свой вопрос" aria-label="Ваш вопрос" />
            <button type="submit" disabled={Boolean(statusCopy)} aria-label="Отправить"><FiArrowUp /></button>
          </form>

          {historyOpen && (
            <aside className="property-ai-history">
              <div><strong>История отчётов</strong><button type="button" onClick={() => setHistoryOpen(false)}><FiX /></button></div>
              {history.length ? history.map((item) => (
                <button key={item.id} type="button" onClick={() => openHistoryReport(item)}>
                  <span>{item.question}</span><small>{item.status === 'completed' ? 'PDF готов' : item.status === 'failed' ? 'Ошибка' : 'Готовится'}</small>
                </button>
              )) : <p>Здесь появятся ваши анализы этого объекта.</p>}
            </aside>
          )}
          </div>
        </div>
      )}
    </section>
  )
}
