import { useCallback, useEffect, useRef, useState } from 'react'
import { FiAlertTriangle, FiArrowRight, FiCheck, FiInfo, FiX } from 'react-icons/fi'
import './Toast.css'

const EXIT_MS = 240

function ToastIcon({ type }) {
  if (type === 'success') return <FiCheck aria-hidden />
  if (type === 'error' || type === 'warning') return <FiAlertTriangle aria-hidden />
  return <FiInfo aria-hidden />
}

const Toast = ({
  title,
  message,
  type = 'info',
  duration = 5000,
  persistent = false,
  action = null,
  announcement = 'polite',
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef(null)
  const exitTimerRef = useRef(null)
  const startedAtRef = useRef(0)
  const remainingRef = useRef(duration)
  const hoveredRef = useRef(false)
  const focusedRef = useRef(false)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const clearTimer = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const beginClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    clearTimer()
    setIsVisible(false)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    exitTimerRef.current = window.setTimeout(() => onCloseRef.current?.(), reduceMotion ? 1 : EXIT_MS)
  }, [clearTimer])

  const startTimer = useCallback(() => {
    if (persistent || duration <= 0 || closingRef.current) return
    clearTimer()
    startedAtRef.current = Date.now()
    timerRef.current = window.setTimeout(beginClose, Math.max(0, remainingRef.current))
  }, [beginClose, clearTimer, duration, persistent])

  const pauseTimer = useCallback((event) => {
    if (event?.type === 'mouseenter') hoveredRef.current = true
    if (event?.type === 'focus') focusedRef.current = true
    if (closingRef.current || persistent || duration <= 0) return
    if (timerRef.current) {
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current))
    }
    clearTimer()
    setIsPaused(true)
  }, [clearTimer, duration, persistent])

  const resumeTimer = useCallback((event) => {
    if (event?.type === 'mouseleave') hoveredRef.current = false
    if (document.hidden || hoveredRef.current || focusedRef.current || closingRef.current) return
    setIsPaused(false)
    startTimer()
  }, [startTimer])

  const handleBlur = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    focusedRef.current = false
    resumeTimer()
  }, [resumeTimer])

  const handleAction = useCallback(() => {
    try {
      action?.onClick?.()
    } finally {
      beginClose()
    }
  }, [action, beginClose])

  useEffect(() => {
    closingRef.current = false
    remainingRef.current = duration
    setIsVisible(true)
    setIsPaused(false)
    startTimer()

    return () => {
      clearTimer()
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current)
    }
  }, [clearTimer, duration, message, persistent, startTimer, title])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) pauseTimer()
      else resumeTimer()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [pauseTimer, resumeTimer])

  return (
    <article
      className={`toast toast--${type} ${isVisible ? 'toast--visible' : 'toast--leaving'}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={announcement}
      aria-atomic="true"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocusCapture={pauseTimer}
      onBlurCapture={handleBlur}
    >
      <span className="toast__accent" aria-hidden />
      <div className="toast__icon"><ToastIcon type={type} /></div>
      <div className="toast__content">
        <strong className="toast__title">{title}</strong>
        {message ? <div className="toast__message">{message}</div> : null}
        {action?.label ? (
          <button type="button" className="toast__action" onClick={handleAction}>
            <span>{action.label}</span>
            <FiArrowRight aria-hidden />
          </button>
        ) : null}
      </div>
      <button type="button" className="toast__close" onClick={beginClose} aria-label="Закрыть уведомление">
        <FiX aria-hidden />
      </button>
      {!persistent && duration > 0 ? (
        <span
          key={`${title}-${message}-${duration}`}
          className="toast__progress"
          style={{ '--toast-duration': `${duration}ms`, animationPlayState: isPaused ? 'paused' : 'running' }}
          aria-hidden
        />
      ) : null}
    </article>
  )
}

export default Toast
