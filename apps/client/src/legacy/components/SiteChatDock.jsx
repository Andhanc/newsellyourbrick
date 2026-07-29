import { FiX, FiSend, FiPhone, FiMail, FiMessageCircle } from 'react-icons/fi'
import { WhatsAppIcon, TelegramIcon } from './icons/ContactChannelIcons'
import { useTranslation } from 'react-i18next'
import { useSiteAiChatDock } from '../hooks/useSiteAiChatDock'
import '../pages/Home.css'

export default function SiteChatDock({
  wrapperClassName = 'site-chat-dock',
  footerNear = false,
  hideFab = false,
  children,
  recommendationProperties = [],
  resolveRecommendationProperty,
  onRecommendationClick,
}) {
  const { t } = useTranslation()
  const chat = useSiteAiChatDock({ recommendationProperties })

  const findRecommendation = (recId) => {
    if (typeof resolveRecommendationProperty === 'function') {
      return resolveRecommendationProperty(recId)
    }
    return recommendationProperties.find(
      (item) => String(item.id) === String(recId) || String(item.key) === String(recId),
    )
  }

  return (
    <div
      className={`${wrapperClassName}${footerNear ? ` ${wrapperClassName}--footer-near` : ''}`.trim()}
      aria-hidden={footerNear && !chat.isChatOpen && !chat.isManagerChatOpen}
    >
      {children}

      {!hideFab ? (
        <button
          type="button"
          className="ai-button"
          onClick={chat.toggleChat}
          aria-label="AI Assistant"
          aria-expanded={chat.isChatOpen}
        >
          AI
        </button>
      ) : null}

      {chat.isChatOpen && (
        <div className="chat-widget">
          <div className="chat-widget__header">
            <div className="chat-widget__header-info">
              <div className="chat-widget__avatar">AI</div>
              <div className="chat-widget__header-text">
                <h3 className="chat-widget__title">{t('chatTitle')}</h3>
                <span className="chat-widget__status">{t('chatOnline')}</span>
              </div>
            </div>
            <button
              type="button"
              className="chat-widget__close"
              onClick={chat.toggleChat}
              aria-label={t('closeChat')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="chat-widget__messages" ref={chat.chatMessagesRef}>
            {chat.chatMessages.map((message, idx) => (
              <div
                key={message.id}
                ref={idx === chat.chatMessages.length - 1 ? chat.lastMessageRef : null}
                className={`chat-widget__message ${
                  message.sender === 'user' ? 'chat-widget__message--user' : 'chat-widget__message--bot'
                }`}
              >
                <div className="chat-widget__message-content">
                  {message.text}
                  {message.recommendations && message.recommendations.length > 0 && (
                    <div className="chat-widget__recommendations">
                      <div className="chat-widget__recommendations-title">{t('chatRecommendationsTitle')}</div>
                      {message.recommendations.map((recId) => {
                        const property = findRecommendation(recId)
                        if (!property) return null
                        const propertyName = property.name || property.title || t('listingDefault')
                        const propertyPrice = property.price
                          ? `${Number(property.price).toLocaleString('ru-RU')} €`
                          : t('priceNotSpecified')
                        const propertyArea = property.area || property.sqft
                        const propertyRooms = property.rooms || property.beds

                        return (
                          <button
                            key={recId}
                            type="button"
                            className="chat-widget__recommendation-link"
                            onClick={() => {
                              if (typeof onRecommendationClick === 'function') {
                                onRecommendationClick(property)
                              }
                              chat.toggleChat()
                            }}
                          >
                            <div className="chat-widget__recommendation-item">
                              <div className="chat-widget__recommendation-title">{propertyName}</div>
                              <div className="chat-widget__recommendation-location">{property.location}</div>
                              <div className="chat-widget__recommendation-details">
                                {propertyRooms ? <span>{t('roomCount', { count: propertyRooms })}</span> : null}
                                {propertyArea ? (
                                  <span>
                                    {propertyArea} {t('squareMeters')}
                                  </span>
                                ) : null}
                              </div>
                              <div className="chat-widget__recommendation-price">{propertyPrice}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                {message.buttons && message.buttons.length > 0 && (
                  <div
                    className={`chat-widget__buttons${
                      message.buttons.some((b) => typeof b === 'object' && b?.type === 'contact_pref')
                        ? ' chat-widget__buttons--contact'
                        : ''
                    }`}
                  >
                    {message.buttons.map((button, index) => {
                      if (typeof button === 'object' && button?.type === 'contact_pref') {
                        const IconCmp =
                          button.value === 'phone'
                            ? FiPhone
                            : button.value === 'email'
                              ? FiMail
                              : button.value === 'whatsapp'
                                ? WhatsAppIcon
                                : button.value === 'telegram'
                                  ? TelegramIcon
                                  : FiMessageCircle
                        return (
                          <button
                            key={index}
                            type="button"
                            className="chat-widget__button chat-widget__button--contact"
                            onClick={() =>
                              !chat.isLoadingAI && chat.handleButtonClick(null, { contactPref: button.value })
                            }
                            disabled={chat.isLoadingAI}
                          >
                            <IconCmp size={18} aria-hidden />
                            <span>{button.label}</span>
                          </button>
                        )
                      }
                      return (
                        <button
                          key={index}
                          type="button"
                          className="chat-widget__button"
                          onClick={() => !chat.isLoadingAI && chat.handleButtonClick(button)}
                          disabled={chat.isLoadingAI}
                        >
                          {button}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="chat-widget__message-time">
                  {message.timestamp.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
            {chat.isLoadingAI && (
              <div className="chat-widget__message chat-widget__message--bot">
                <div className="chat-widget__message-content">
                  <div className="chat-widget__typing">
                    <span />
                    <span />
                    <span />
                  </div>
                  {chat.isSlowAIResponse && (
                    <div className="chat-widget__slow-hint">{t('chatSlowHint')}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form className="chat-widget__input-form" onSubmit={chat.handleChatSubmit}>
            <input
              type="text"
              className="chat-widget__input"
              placeholder={chat.isLoadingAI ? t('aiThinking') : t('chatPlaceholder')}
              value={chat.chatInput}
              onChange={chat.handleChatInputChange}
              disabled={chat.isLoadingAI}
              autoFocus
            />
            <button
              type="submit"
              className="chat-widget__send"
              aria-label={t('sendMessage')}
              disabled={chat.isLoadingAI}
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}

      {chat.isManagerChatOpen && (
        <div
          className={`chat-widget chat-widget--manager-dock${
            chat.isChatOpen ? ' chat-widget--stacked-above-ai' : ''
          }`}
          role="dialog"
          aria-label={t('chatManagerTitle')}
        >
          <div className="chat-widget__header">
            <div className="chat-widget__header-info">
              <div className="chat-widget__avatar chat-widget__avatar--manager">M</div>
              <div className="chat-widget__header-text">
                <h3 className="chat-widget__title">{t('chatManagerTitle')}</h3>
                <span className="chat-widget__status">{t('chatManagerOnline')}</span>
              </div>
            </div>
            <button
              type="button"
              className="chat-widget__close"
              onClick={chat.closeManagerChatDock}
              aria-label={t('closeChat')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="chat-widget__messages" ref={chat.managerMessagesRef}>
            {chat.managerConnecting && (
              <div className="chat-widget__message chat-widget__message--bot">
                <div className="chat-widget__message-content">
                  <div className="chat-widget__typing" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </div>
                  <p className="chat-widget__manager-connect-hint">{t('liveChatWaitNotice')}</p>
                </div>
              </div>
            )}
            {!chat.managerConnecting &&
              chat.managerThreadUi.map((message) => (
                <div
                  key={message.id}
                  className={`chat-widget__message ${
                    message.sender === 'user'
                      ? 'chat-widget__message--user'
                      : message.sender === 'manager'
                        ? 'chat-widget__message--manager'
                        : 'chat-widget__message--system'
                  }`}
                >
                  <div className="chat-widget__message-content">{message.text}</div>
                  <div className="chat-widget__message-time">{message.time}</div>
                </div>
              ))}
          </div>

          <form className="chat-widget__input-form" onSubmit={chat.submitManagerMessage}>
            <input
              type="text"
              className="chat-widget__input"
              placeholder={t('chatPlaceholder')}
              value={chat.managerChatInput}
              onChange={(e) => chat.setManagerChatInput(e.target.value)}
              autoComplete="off"
              disabled={chat.managerConnecting || !chat.liveChatToken}
            />
            <button
              type="submit"
              className="chat-widget__send"
              aria-label={t('sendMessage')}
              disabled={chat.managerConnecting || !chat.liveChatToken}
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
