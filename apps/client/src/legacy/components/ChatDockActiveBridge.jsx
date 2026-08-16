import { useEffect, useState } from 'react'
import { setChatDockActive } from '../utils/siteDocumentLayoutFlags'

/**
 * Синхронизирует открытый чат (AI / менеджер / модалка) с классом на <html>.
 */
export default function ChatDockActiveBridge() {
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [managerChatOpen, setManagerChatOpen] = useState(false)

  useEffect(() => {
    const onAi = (event) => setAiChatOpen(Boolean(event.detail?.isOpen))
    const onManager = (event) => setManagerChatOpen(Boolean(event.detail?.isOpen))

    window.addEventListener('aiChatStateChange', onAi)
    window.addEventListener('managerChatStateChange', onManager)

    return () => {
      window.removeEventListener('aiChatStateChange', onAi)
      window.removeEventListener('managerChatStateChange', onManager)
    }
  }, [])

  useEffect(() => {
    setChatDockActive(aiChatOpen || managerChatOpen)
    return () => setChatDockActive(false)
  }, [aiChatOpen, managerChatOpen])

  return null
}
