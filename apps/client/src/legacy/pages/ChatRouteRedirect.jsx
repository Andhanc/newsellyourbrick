import { useLayoutEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const MANAGER_QUERY_VALUES = new Set(['1', 'true', 'yes', 'manager'])

/** /chat и /chat?manager=1 только открывают глобальные модалки, без чанка старой страницы. */
export default function ChatRouteRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useLayoutEffect(() => {
    const raw = searchParams.get('manager')
    const isManager =
      raw != null && raw !== '' && MANAGER_QUERY_VALUES.has(String(raw).toLowerCase())
    const eventName = isManager ? 'openManagerChat' : 'openAIChat'

    const referrer = typeof document !== 'undefined' ? document.referrer : ''
    let sameOriginReferrer = false
    try {
      sameOriginReferrer = Boolean(referrer) && new URL(referrer).origin === window.location.origin
    } catch {
      sameOriginReferrer = false
    }
    if (window.history.length > 1 && sameOriginReferrer) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
    const tmr = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(eventName))
    }, 0)
    return () => window.clearTimeout(tmr)
  }, [searchParams, navigate])

  return null
}
