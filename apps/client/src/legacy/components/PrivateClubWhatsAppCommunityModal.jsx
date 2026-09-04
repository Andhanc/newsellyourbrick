import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { RiLockLine } from 'react-icons/ri'
import {
  openVipClubWhatsAppCommunity,
  VIP_CLUB_WHATSAPP_COMMUNITY_URL,
} from '../utils/whatsappManagerChat'
import './PrivateClubWhatsAppCommunityModal.css'

const WHATSAPP_IMAGE = '/images/vip-club/vip-whatsapp-community.png'

const DEFAULT_AVATARS = [
  '/images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg',
  '/images/external/photo-1494790108377-be9c29b29330-89f0c4a88f.jpg',
  '/images/external/photo-1507003211169-0a1dd7228f2d-94d7ce3808.jpg',
  '/images/external/photo-1525134479668-1bee5c7c6845-966b578ed7.jpg',
]

/**
 * Окно «Закрытое сообщество в WhatsApp» после покупки VIP.
 * Кнопка ведёт на VIP_CLUB_WHATSAPP_COMMUNITY_URL (пока контакт, позже группа).
 */
export default function PrivateClubWhatsAppCommunityModal({
  open,
  onClose,
  avatars = DEFAULT_AVATARS,
}) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const handleGoChat = () => {
    openVipClubWhatsAppCommunity()
    onClose?.()
  }

  return createPortal(
    <div
      className="vip-wa-community"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-wa-community-title"
    >
      <button
        type="button"
        className="vip-wa-community__backdrop"
        aria-label={t('closeAria')}
        onClick={onClose}
      />
      <div className="vip-wa-community__panel">
        <button
          type="button"
          className="vip-wa-community__close"
          onClick={onClose}
          aria-label={t('close')}
        >
          <FiX size={20} />
        </button>
        <div className="vip-wa-community__card">
          <img src={WHATSAPP_IMAGE} alt="" className="vip-wa-community__bg" decoding="async" />
          <div className="vip-wa-community__layout">
            <div className="vip-wa-community__copy">
              <h2 id="vip-wa-community-title">{t('privateClubLanding_whatsappTitle')}</h2>
              <p>{t('privateClubLanding_whatsappLead')}</p>
            </div>
            <div className="vip-wa-community__chat">
              <h3>
                {t('privateClubLanding_chatTitle')} <RiLockLine aria-hidden />
              </h3>
              <p>{t('privateClubLanding_chatOnlyMembers')}</p>
              <div className="vip-wa-community__avatars" aria-hidden>
                {avatars.map((avatar) => (
                  <img key={avatar} src={avatar} alt="" />
                ))}
                <span>+127</span>
              </div>
              <a
                href={VIP_CLUB_WHATSAPP_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="vip-wa-community__cta"
                onClick={(e) => {
                  e.preventDefault()
                  handleGoChat()
                }}
              >
                {t('privateClubLanding_chatGo')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
