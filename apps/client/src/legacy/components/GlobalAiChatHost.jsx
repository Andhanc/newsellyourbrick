import { lazy, Suspense, useEffect, useState } from 'react'

const GlobalAiChatSession = lazy(() => import('./GlobalAiChatSession'))

const EMPTY_RECOMMENDATION_PROPERTIES = Object.freeze([])

/**
 * App-wide AI chat host (Header «Умный помощник», FAB AI, owner cabinet).
 * The assistant session chunk stays off the page until openAIChat fires.
 */
export default function GlobalAiChatHost() {
  const [sessionArmed, setSessionArmed] = useState(false)
  const [recommendationProperties, setRecommendationProperties] = useState(
    EMPTY_RECOMMENDATION_PROPERTIES,
  )
  const [resolveRecommendationProperty, setResolveRecommendationProperty] = useState(null)
  const [onRecommendationClick, setOnRecommendationClick] = useState(null)

  useEffect(() => {
    const onOpen = () => setSessionArmed(true)
    const onConfigure = (event) => {
      const detail = event.detail || {}
      if (Array.isArray(detail.recommendationProperties)) {
        setRecommendationProperties(detail.recommendationProperties)
      }
      if (typeof detail.resolveRecommendationProperty === 'function') {
        setResolveRecommendationProperty(() => detail.resolveRecommendationProperty)
      }
      if (typeof detail.onRecommendationClick === 'function') {
        setOnRecommendationClick(() => detail.onRecommendationClick)
      }
    }
    window.addEventListener('openAIChat', onOpen)
    window.addEventListener('configureAIChatHost', onConfigure)
    return () => {
      window.removeEventListener('openAIChat', onOpen)
      window.removeEventListener('configureAIChatHost', onConfigure)
    }
  }, [])

  if (!sessionArmed) return null

  return (
    <Suspense fallback={null}>
      <GlobalAiChatSession
        initialOpen
        recommendationProperties={recommendationProperties}
        resolveRecommendationProperty={resolveRecommendationProperty}
        onRecommendationClick={onRecommendationClick}
      />
    </Suspense>
  )
}
