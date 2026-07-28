import { useEffect, useState } from 'react'
import { setChatDockActive } from '../utils/siteDocumentLayoutFlags'

/**
 * Синхронизирует открытый чат (AI / менеджер / модалка) с классом на <html>.
 */
export default function ChatDockActiveBridge() {
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [managerChatOpen, setManagerChatOpen] = useState(false)
  const [globalAiModalOpen, setGlobalAiModalOpen] = useState(false)

  useEffect(() => {
    const onAi = (event) => setAiChatOpen(Boolean(event.detail?.isOpen))
    const onManager = (event) => setManagerChatOpen(Boolean(event.detail?.isOpen))
    const onGlobal = (event) => setGlobalAiModalOpen(Boolean(event.detail?.isOpen))

    window.addEventListener('aiChatStateChange', onAi)
    window.addEventListener('managerChatStateChange', onManager)
    window.addEventListener('globalAiModalStateChange', onGlobal)

    return () => {
      window.removeEventListener('aiChatStateChange', onAi)
      window.removeEventListener('managerChatStateChange', onManager)
      window.removeEventListener('globalAiModalStateChange', onGlobal)
    }
  }, [])

  useEffect(() => {
    setChatDockActive(aiChatOpen || managerChatOpen || globalAiModalOpen)
    return () => setChatDockActive(false)
  }, [aiChatOpen, managerChatOpen, globalAiModalOpen])

  return null
}
