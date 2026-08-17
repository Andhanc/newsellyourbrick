import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import useMobileLayout from '../hooks/useMobileLayout'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import AiChatPanel from './AiChatPanel'
import '../pages/Home.css'
import './ManagerChatModal.css'
import './SiteChatDock.css'

/**
 * AI-чат: модалка на десктопе, drawer на мобилке — тот же chrome, что у чата с менеджером.
 */
export default function AiChatModal({
  open,
  onClose,
  chat,
  recommendationProperties,
  resolveRecommendationProperty,
  onRecommendationClick,
}) {
  const { t } = useTranslation()
  const isMobile = useMobileLayout(767)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open || isMobile) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, isMobile, handleClose])

  const panel = (
    <AiChatPanel
      chat={chat}
      inDrawer={isMobile}
      onClose={handleClose}
      recommendationProperties={recommendationProperties}
      resolveRecommendationProperty={resolveRecommendationProperty}
      onRecommendationClick={onRecommendationClick}
    />
  )

  if (!open || typeof document === 'undefined') return null

  if (isMobile) {
    return (
      <BuyerSheetShell
        isOpen={open}
        onClose={handleClose}
        titleId="ai-chat-drawer-title"
        closeLabel={t('closeChat')}
        className="site-ai-drawer site-manager-drawer manager-chat-drawer ai-chat-drawer"
      >
        {panel}
      </BuyerSheetShell>
    )
  }

  return createPortal(
    <div
      className="manager-chat-modal-root ai-chat-modal-root"
      role="dialog"
      aria-modal="true"
      aria-label={t('chatTitle')}
    >
      <button
        type="button"
        className="manager-chat-modal-root__backdrop"
        onClick={handleClose}
        aria-label={t('closeChat')}
      />
      {panel}
    </div>,
    document.body,
  )
}
