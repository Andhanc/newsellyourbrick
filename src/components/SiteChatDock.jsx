import { useEffect, useState } from 'react'
import '../pages/Home.css'

export default function SiteChatDock({
  wrapperClassName = 'site-chat-dock',
  footerNear = false,
  hideFab = false,
  children,
}) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)

  useEffect(() => {
    const onAi = (event) => setIsChatOpen(Boolean(event.detail?.isOpen))
    const onManager = (event) => setIsManagerChatOpen(Boolean(event.detail?.isOpen))
    window.addEventListener('aiChatStateChange', onAi)
    window.addEventListener('managerChatStateChange', onManager)
    return () => {
      window.removeEventListener('aiChatStateChange', onAi)
      window.removeEventListener('managerChatStateChange', onManager)
    }
  }, [])

  const handleFabClick = () => {
    if (isChatOpen) {
      window.dispatchEvent(new CustomEvent('closeAIChat'))
      return
    }
    window.dispatchEvent(new CustomEvent('openAIChat'))
  }

  return (
    <div
      className={`${wrapperClassName}${footerNear ? ` ${wrapperClassName}--footer-near` : ''}`.trim()}
      aria-hidden={footerNear && !isChatOpen && !isManagerChatOpen}
    >
      {children}

      {!hideFab ? (
        <button
          type="button"
          className="ai-button"
          onClick={handleFabClick}
          aria-label="AI Assistant"
          aria-expanded={isChatOpen}
        >
          AI
        </button>
      ) : null}
    </div>
  )
}
