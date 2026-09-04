import { useState, useEffect, useCallback } from 'react'
import Toast from './Toast'
import i18n from '../i18n/config'
import {
  enqueueToast,
  isStructuredToastEvent,
  normalizeToastEvent,
  removeToast as removeToastFromQueue,
} from '../utils/toastModel'
import './ToastContainer.css'

let toastId = 0
let toastListeners = []

function translateToast(key, fallback) {
  try {
    return i18n.t(key, { defaultValue: fallback })
  } catch {
    return fallback
  }
}

export const showToast = (messageOrEvent, type = 'success', duration = 3000) => {
  const id = toastId++
  const options = { translate: translateToast }
  const event =
    isStructuredToastEvent(messageOrEvent)
      ? normalizeToastEvent(messageOrEvent, 'info', 5000, options)
      : normalizeToastEvent(messageOrEvent, type, duration, options)
  toastListeners.forEach(listener => listener({ ...event, id }))
  return id
}

const ToastContainer = () => {
  const [{ visible, queued }, setQueue] = useState({ visible: [], queued: [] })

  const addToast = useCallback((toast) => {
    setQueue((previous) => enqueueToast(previous, toast))
  }, [])

  const removeToast = useCallback((id) => {
    setQueue((previous) => removeToastFromQueue(previous, id))
  }, [])

  useEffect(() => {
    toastListeners.push(addToast)
    return () => {
      toastListeners = toastListeners.filter(listener => listener !== addToast)
    }
  }, [addToast])

  return (
    <div className="toast-container" data-queued-count={queued.length}>
      {visible.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default ToastContainer
