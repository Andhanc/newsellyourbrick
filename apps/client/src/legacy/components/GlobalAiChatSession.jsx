import { lazy, Suspense, useCallback } from 'react'
import { useSiteAiChatDock } from '../hooks/useSiteAiChatDock'

const AiChatModal = lazy(() => import('./AiChatModal'))

const EMPTY_RECOMMENDATION_PROPERTIES = Object.freeze([])

/**
 * Loaded only after the user opens AI chat, so listing pages do not parse
 * assistant/catalog modules on first paint.
 */
export default function GlobalAiChatSession({
  initialOpen = false,
  recommendationProperties = EMPTY_RECOMMENDATION_PROPERTIES,
  resolveRecommendationProperty = null,
  onRecommendationClick = null,
}) {
  const chat = useSiteAiChatDock({ recommendationProperties, initialOpen })

  const closeChat = useCallback(() => {
    chat.closeChatDock()
  }, [chat])

  if (!chat.isChatOpen) return null

  return (
    <Suspense fallback={null}>
      <AiChatModal
        open={chat.isChatOpen}
        onClose={closeChat}
        chat={chat}
        recommendationProperties={recommendationProperties}
        resolveRecommendationProperty={resolveRecommendationProperty}
        onRecommendationClick={onRecommendationClick}
      />
    </Suspense>
  )
}
