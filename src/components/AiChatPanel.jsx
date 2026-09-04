import { useRef } from 'react'
import {
  FiAward,
  FiArrowRight,
  FiBarChart2,
  FiBookmark,
  FiCheck,
  FiCompass,
  FiCreditCard,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiHeart,
  FiHome,
  FiLayers,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiPlus,
  FiSend,
  FiShield,
  FiStar,
  FiTrash2,
  FiTrendingUp,
  FiUser,
  FiX,
} from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import {
  applyPropertyImageFallback,
  getPropertyCardImage,
  PROPERTY_CARD_IMAGE_FALLBACK,
} from '../utils/propertyImage'
import { visibleAssistantButtons } from '../utils/siteAssistantHelpers'
import { WhatsAppIcon, TelegramIcon } from './icons/ContactChannelIcons'

const STARTERS = [
  { id: 'site', Icon: FiCompass },
  { id: 'property', Icon: FiHome },
  { id: 'legal', Icon: FiShield },
  { id: 'investment', Icon: FiTrendingUp },
]

const ACTION_ICONS = {
  proDocuments: FiFileText,
  compare: FiLayers,
  presentation: FiStar,
  calculator: FiBarChart2,
  allServices: FiGlobe,
  vipClub: FiStar,
}

function navigationPresentation(path = '') {
  if (path.startsWith('/favorites')) return { Icon: FiHeart, tone: 'rose' }
  if (path.startsWith('/compare')) return { Icon: FiLayers, tone: 'indigo' }
  if (path.startsWith('/calculator')) return { Icon: FiBarChart2, tone: 'blue' }
  if (path.startsWith('/subscriptions')) return { Icon: FiAward, tone: 'amber' }
  if (path.startsWith('/private-club')) return { Icon: FiStar, tone: 'amber' }
  if (path.startsWith('/wallet') || path.startsWith('/deposit')) {
    return { Icon: FiCreditCard, tone: 'blue' }
  }
  if (path.startsWith('/profile') || path.startsWith('/data')) {
    return { Icon: FiUser, tone: 'indigo' }
  }
  if (path.startsWith('/auction') || path.startsWith('/property')) {
    return { Icon: FiHome, tone: 'green' }
  }
  if (path.startsWith('/map')) return { Icon: FiMapPin, tone: 'green' }
  if (path.startsWith('/sections')) return { Icon: FiCompass, tone: 'teal' }
  return { Icon: FiBookmark, tone: 'teal' }
}

function formatFileSize(size) {
  const bytes = Number(size) || 0
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AiChatPanel({
  chat,
  inDrawer = false,
  onClose,
  recommendationProperties = [],
  resolveRecommendationProperty,
  onRecommendationClick,
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, isLoaded: userLoaded } = useUser()
  const fileInputRef = useRef(null)
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const catalog = chat.catalogProperties || recommendationProperties || []
  const titleId = inDrawer ? 'ai-chat-drawer-title' : 'ai-chat-dock-title'
  const hasStarted = chat.chatMessages.some((message) => message.sender === 'user')
  const currentLocale = i18n.resolvedLanguage || i18n.language || 'ru'

  const findRecommendation = (recId) => {
    if (typeof resolveRecommendationProperty === 'function') {
      return resolveRecommendationProperty(recId)
    }
    return catalog.find(
      (item) => String(item.id) === String(recId) || String(item.key) === String(recId),
    )
  }

  const openRecommendation = (property) => {
    if (!property) return
    if (typeof onRecommendationClick === 'function') {
      onRecommendationClick(property)
    } else {
      navigate(getPropertyDetailPath(property.id ?? property.key, { property }), {
        state: { property },
      })
    }
    chat.closeChatDock()
  }

  const openNavigationPath = (path, gate = 'public') => {
    if (!path) return
    if (gate === 'auth' && !isSiteUserSignedIn(user, userLoaded)) {
      chat.closeChatDock()
      window.setTimeout(() => requestOpenLoginModal({ wizard: true }), 180)
      return
    }
    navigate(path)
    chat.closeChatDock()
  }

  const openLanguageDrawer = (suggestedLanguage) => {
    chat.closeChatDock()
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('openSiteLanguageDrawer', { detail: { suggestedLanguage } }),
      )
    }, 220)
  }

  const formatEuro = (value) =>
    new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0))

  const favoriteCategory = (property) => (property?.source_table ? undefined : 'property')

  const renderPropertyCard = (property, recId) => {
    const propertyName = property.name || property.title || t('listingDefault')
    const propertyPrice = property.price ? formatEuro(property.price) : t('priceNotSpecified')
    const propertyArea = property.area || property.sqft
    const propertyRooms = property.rooms || property.beds
    const category = favoriteCategory(property)
    const liked = isFavorite(property, category)

    return (
      <article key={recId} className="assistant-property-card">
        <button
          type="button"
          className="assistant-property-card__main"
          onClick={() => openRecommendation(property)}
          aria-label={`${t('chatOpenListing')}: ${propertyName}`}
        >
          <span className="assistant-property-card__media">
            <img
              src={getPropertyCardImage(property, PROPERTY_CARD_IMAGE_FALLBACK)}
              alt=""
              loading="lazy"
              onError={(event) => applyPropertyImageFallback(event)}
            />
            <span className="assistant-property-card__format">{t('assistantPropertyMatch')}</span>
          </span>
          <span className="assistant-property-card__body">
            <strong>{propertyName}</strong>
            {property.location ? (
              <span className="assistant-property-card__location">
                <FiMapPin aria-hidden /> {property.location}
              </span>
            ) : null}
            <span className="assistant-property-card__details">
              {propertyRooms ? <span>{t('roomCount', { count: propertyRooms })}</span> : null}
              {propertyArea ? <span>{propertyArea} {t('squareMeters')}</span> : null}
            </span>
            <span className="assistant-property-card__footer">
              <b>{propertyPrice}</b>
              <span>{t('chatOpenListing')} <FiArrowRight aria-hidden /></span>
            </span>
          </span>
        </button>
        <button
          type="button"
          className={`assistant-property-card__favorite${liked ? ' assistant-property-card__favorite--active' : ''}`}
          onClick={() => toggleFavorite(property, category)}
          aria-label={liked ? t('assistantRemoveFavorite') : t('assistantAddFavorite')}
          aria-pressed={liked}
        >
          <FiHeart aria-hidden fill={liked ? 'currentColor' : 'none'} />
        </button>
      </article>
    )
  }

  const attachmentErrorKey = {
    UNSUPPORTED_FILE: 'assistantUnsupportedFile',
    FILE_TOO_LARGE: 'assistantFileTooLarge',
    FILES_TOO_LARGE: 'assistantFilesTooLarge',
    FILE_READ_FAILED: 'assistantFileReadFailed',
  }[chat.attachmentError]

  return (
    <div
      className={`chat-widget ${
        inDrawer
          ? 'chat-widget--sheet-drawer chat-widget--manager-drawer chat-widget--ai-drawer'
          : 'chat-widget--manager-dock chat-widget--ai-dock'
      }${hasStarted ? ' chat-widget--started' : ' chat-widget--welcome'}`}
      role={inDrawer ? undefined : 'dialog'}
      aria-labelledby={inDrawer ? undefined : titleId}
    >
      <div className="chat-widget__header">
        <div className="chat-widget__header-info">
          <div className="chat-widget__avatar chat-widget__avatar--ai" aria-hidden>AI</div>
          <div className="chat-widget__header-text">
            <h3 id={titleId} className="chat-widget__title">{t('chatTitle')}</h3>
            <span className="chat-widget__status">{t('chatOnline')}</span>
          </div>
        </div>
        <div className="chat-widget__header-actions">
          {hasStarted ? (
            <button
              type="button"
              className="chat-widget__close"
              onClick={chat.clearChatHistory}
              aria-label={t('clearChat')}
              title={t('clearChat')}
              disabled={chat.isLoadingAI}
            >
              <FiTrash2 size={18} />
            </button>
          ) : null}
          {!inDrawer ? (
            <button type="button" className="chat-widget__close" onClick={onClose} aria-label={t('closeChat')}>
              <FiX size={20} />
            </button>
          ) : null}
        </div>
      </div>

      {!hasStarted ? (
        <section className="assistant-welcome" aria-labelledby="assistant-welcome-title">
          <div className="assistant-welcome__intro">
            <p>{chat.userDisplayName ? t('assistantGreetingName', { name: chat.userDisplayName }) : t('assistantGreeting')}</p>
            <h2 id="assistant-welcome-title">{t('assistantStartTitle')}</h2>
          </div>
          <div className="assistant-welcome__grid">
            {STARTERS.map(({ id, Icon }) => (
              <button
                key={id}
                type="button"
                className={`assistant-starter assistant-starter--${id}`}
                onClick={() => chat.handleButtonClick(t(`assistantStarter_${id}Prompt`))}
                disabled={chat.isLoadingAI}
              >
                <span className="assistant-starter__topline">
                  <span className="assistant-starter__icon"><Icon aria-hidden /></span>
                  <span className="assistant-starter__arrow"><FiArrowRight aria-hidden /></span>
                </span>
                <strong>{t(`assistantStarter_${id}Title`)}</strong>
                <span>{t(`assistantStarter_${id}Description`)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="chat-widget__messages" ref={chat.chatMessagesRef} aria-live="polite">
          {chat.chatMessages.map((message, idx) => (
            <div
              key={message.id}
              ref={idx === chat.chatMessages.length - 1 ? chat.lastMessageRef : null}
              className={`chat-widget__message ${
                message.sender === 'user' ? 'chat-widget__message--user' : 'chat-widget__message--bot'
              }${message.navigation?.length || message.actions?.length || message.sources?.length || message.languageSuggestion ? ' chat-widget__message--rich' : ''}`}
            >
              <div className="chat-widget__message-content">
                {message.text}
                {message.attachments?.length ? (
                  <div className="assistant-message-files">
                    {message.attachments.map((file) => (
                      <span key={`${file.name}-${file.size}`}><FiFileText aria-hidden />{file.name}</span>
                    ))}
                  </div>
                ) : null}
                {message.yieldEstimate ? (
                  <div className="chat-widget__yield">
                    <div className="chat-widget__yield-title">{t('chatYieldTitle')}</div>
                    <div className="chat-widget__yield-grid">
                      <div><span>{t('chatYieldPrice')}</span><strong>{formatEuro(message.yieldEstimate.price)}</strong></div>
                      <div><span>{t('chatYieldAnnual')}</span><strong>{formatEuro(message.yieldEstimate.annualRent)}</strong></div>
                      <div><span>{t('chatYieldMonthly')}</span><strong>{formatEuro(message.yieldEstimate.monthlyIncome)}</strong></div>
                      <div><span>{t('chatYieldRate')}</span><strong>{message.yieldEstimate.yieldPercent}%</strong></div>
                    </div>
                    {message.yieldEstimate.note ? <p className="chat-widget__yield-note">{message.yieldEstimate.note}</p> : null}
                    <button type="button" className="chat-widget__yield-cta" onClick={() => openNavigationPath('/calculator')}>
                      {t('chatYieldInvestorCta')} <FiArrowRight aria-hidden />
                    </button>
                  </div>
                ) : null}
                {message.navigation?.length ? (
                  <div className="chat-widget__navigation">
                    <div className="chat-widget__navigation-title">{t('chatNavigationTitle')}</div>
                    <div className="chat-widget__navigation-list">
                      {message.navigation.map((nav) => {
                        const { Icon, tone } = navigationPresentation(nav.path)
                        return (
                          <button
                            key={nav.path}
                            type="button"
                            className="chat-widget__navigation-link"
                            data-tone={tone}
                            onClick={() => openNavigationPath(nav.path)}
                          >
                            <span className="chat-widget__navigation-icon"><Icon aria-hidden /></span>
                            <span className="chat-widget__navigation-label">{nav.label}</span>
                            <span className="chat-widget__navigation-arrow"><FiArrowRight aria-hidden /></span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
                {message.sources?.length ? (
                  <div className="assistant-legal-sources" aria-label="Official sources">
                    {message.sources.map((source) => (
                      <a
                        key={`${source.id}-${source.url}`}
                        className="assistant-legal-source"
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <span className="assistant-legal-source__mark"><FiShield aria-hidden /></span>
                        <span className="assistant-legal-source__copy">
                          <strong>{source.label}</strong>
                          <small>{source.title}</small>
                        </span>
                        <FiExternalLink className="assistant-legal-source__open" aria-hidden />
                      </a>
                    ))}
                  </div>
                ) : null}
                {message.recommendations?.length ? (
                  <div className="chat-widget__recommendations">
                    <div className="chat-widget__recommendations-title">{t('chatRecommendationsTitle')}</div>
                    {message.recommendations.map((recId) => {
                      const property = findRecommendation(recId)
                      return property ? renderPropertyCard(property, recId) : null
                    })}
                  </div>
                ) : null}
                {message.actions?.length ? (
                  <div className="assistant-service-actions">
                    <span className="assistant-service-actions__eyebrow">{t('assistantUsefulNext')}</span>
                    {message.actions.map((action) => {
                      const Icon = ACTION_ICONS[action.id] || FiArrowRight
                      return (
                        <button key={`${action.id}-${action.path}`} type="button" className="assistant-service-action" data-action={action.id} onClick={() => openNavigationPath(action.path, action.gate)}>
                          <span className="assistant-service-action__icon"><Icon aria-hidden /></span>
                          <span><strong>{t(`assistantAction_${action.id}Title`)}</strong><small>{t(`assistantAction_${action.id}Description`)}</small></span>
                          <FiArrowRight className="assistant-service-action__arrow" aria-hidden />
                        </button>
                      )
                    })}
                  </div>
                ) : null}
                {message.languageSuggestion ? (
                  <button type="button" className="assistant-language-suggestion" onClick={() => openLanguageDrawer(message.languageSuggestion.suggestedLanguage)}>
                    <span className="assistant-language-suggestion__icon"><FiGlobe aria-hidden /></span>
                    <span>{t('assistantLanguageSuggestion')}</span>
                    <strong>{t('assistantChangeLanguage')}</strong>
                    <span className="assistant-language-suggestion__arrow"><FiArrowRight aria-hidden /></span>
                  </button>
                ) : null}
              </div>
              {visibleAssistantButtons(message.buttons).length > 0 ? (
                <div className="chat-widget__buttons chat-widget__buttons--contact">
                  {visibleAssistantButtons(message.buttons).map((button, index) => {
                    if (typeof button === 'object' && button?.type === 'contact_pref') {
                      const IconCmp = button.value === 'phone' ? FiPhone : button.value === 'email' ? FiMail : button.value === 'whatsapp' ? WhatsAppIcon : button.value === 'telegram' ? TelegramIcon : FiMessageCircle
                      return (
                        <button key={index} type="button" className="chat-widget__button chat-widget__button--contact" onClick={() => !chat.isLoadingAI && chat.handleButtonClick(null, { contactPref: button.value })} disabled={chat.isLoadingAI}>
                          <span className="chat-widget__button-icon"><IconCmp size={18} aria-hidden /></span>
                          <span>{button.label}</span>
                          <FiArrowRight className="chat-widget__button-arrow" aria-hidden />
                        </button>
                      )
                    }
                    return <button key={index} type="button" className="chat-widget__button" onClick={() => !chat.isLoadingAI && chat.handleButtonClick(button)} disabled={chat.isLoadingAI}>{button}</button>
                  })}
                </div>
              ) : null}
              <div className="chat-widget__message-time">
                {message.timestamp.toLocaleTimeString(currentLocale, { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {chat.isLoadingAI ? (
            <div className="chat-widget__message chat-widget__message--bot">
              <div className="chat-widget__message-content">
                <div className="chat-widget__typing" aria-hidden><span /><span /><span /></div>
                {chat.isSlowAIResponse ? <div className="chat-widget__slow-hint">{t('chatSlowHint')}</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <form className="chat-widget__input-form" onSubmit={chat.handleChatSubmit}>
        {chat.pendingAttachments.length ? (
          <div className="assistant-composer-files">
            {chat.pendingAttachments.map((file) => (
              <span key={file.id} className="assistant-composer-file">
                <FiFileText aria-hidden />
                <span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span>
                <button type="button" onClick={() => chat.removePendingAttachment(file.id)} aria-label={`${t('assistantRemoveAttachment')}: ${file.name}`}><FiX aria-hidden /></button>
              </span>
            ))}
          </div>
        ) : null}
        {attachmentErrorKey ? <p className="assistant-composer-error" role="alert">{t(attachmentErrorKey)}</p> : null}
        <div className="assistant-composer-row">
          <input
            ref={fileInputRef}
            className="assistant-file-input"
            type="file"
            multiple
            accept="image/*,.pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json,.xml,.html,.yaml,.yml"
            onChange={(event) => {
              void chat.handleFilesSelected(event.target.files)
              event.target.value = ''
            }}
          />
          <button type="button" className="chat-widget__attach" onClick={() => fileInputRef.current?.click()} aria-label={t('assistantAttachFile')} disabled={chat.isLoadingAI || chat.pendingAttachments.length >= 2}>
            <FiPlus aria-hidden />
          </button>
          <input type="text" className="chat-widget__input" placeholder={chat.isLoadingAI ? t('aiThinking') : t('chatPlaceholder')} value={chat.chatInput} onChange={chat.handleChatInputChange} disabled={chat.isLoadingAI} />
          <button type="submit" className="chat-widget__send" aria-label={t('sendMessage')} disabled={chat.isLoadingAI || (!chat.chatInput.trim() && !chat.pendingAttachments.length)}>
            {chat.isLoadingAI ? <span className="assistant-send-loader" aria-hidden /> : <FiSend size={18} />}
          </button>
        </div>
        {!hasStarted ? <p className="assistant-composer-hint"><FiCheck aria-hidden />{t('assistantComposerHint')}</p> : null}
      </form>
    </div>
  )
}
