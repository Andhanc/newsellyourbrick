import { useCallback, useEffect, useState } from 'react'
import { useSiteAiChatDock } from '../hooks/useSiteAiChatDock'
import AiChatModal from './AiChatModal'

const EMPTY_RECOMMENDATION_PROPERTIES = Object.freeze([])

/**
 * App-wide AI chat host (Header «Умный помощник», FAB AI, owner cabinet).
 * Desktop → modal, mobile → drawer — same shell as manager chat.
 */
export default function GlobalAiChatHost() {
  const [recommendationProperties, setRecommendationProperties] = useState(EMPTY_RECOMMENDATION_PROPERTIES)
  const [resolveRecommendationProperty, setResolveRecommendationProperty] = useState(null)
  const [onRecommendationClick, setOnRecommendationClick] = useState(null)

  const chat = useSiteAiChatDock({ recommendationProperties })

  const closeChat = useCallback(() => {
    chat.closeChatDock()
  }, [chat])

  useEffect(() => {
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
    window.addEventListener('configureAIChatHost', onConfigure)
    return () => window.removeEventListener('configureAIChatHost', onConfigure)
  }, [])

  return (
    <AiChatModal
      open={chat.isChatOpen}
      onClose={closeChat}
      chat={chat}
      recommendationProperties={recommendationProperties}
      resolveRecommendationProperty={resolveRecommendationProperty}
      onRecommendationClick={onRecommendationClick}
    />
  )
}
