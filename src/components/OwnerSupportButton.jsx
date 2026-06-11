import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, HelpCircle, MessageCircle } from 'lucide-react'
import './OwnerSupportButton.css'

export default function OwnerSupportButton({ className = '', iconSize = 20 }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        close()
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, close])

  return (
    <div className="otsb" ref={rootRef}>
      <button
        type="button"
        className={className}
        aria-label={t('ownerTest_supportAria')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <HelpCircle size={iconSize} strokeWidth={2} />
      </button>

      {open ? (
        <div className="otsb__menu" role="menu" aria-label={t('ownerTest_supportAria')}>
          <p className="otsb__menu-title">{t('ownerTest_supportTitle')}</p>
          <Link
            to="/chat?manager=1"
            className="otsb__menu-item"
            role="menuitem"
            onClick={close}
          >
            <span className="otsb__menu-icon otsb__menu-icon--chat" aria-hidden>
              <MessageCircle size={18} strokeWidth={2} />
            </span>
            <span className="otsb__menu-copy">
              <span className="otsb__menu-label">{t('ownerTest_supportChat')}</span>
              <span className="otsb__menu-desc">{t('ownerTest_supportChatDesc')}</span>
            </span>
          </Link>
          <Link to="/chat" className="otsb__menu-item" role="menuitem" onClick={close}>
            <span className="otsb__menu-icon otsb__menu-icon--ai" aria-hidden>
              <Bot size={18} strokeWidth={2} />
            </span>
            <span className="otsb__menu-copy">
              <span className="otsb__menu-label">{t('ownerTest_supportAi')}</span>
              <span className="otsb__menu-desc">{t('ownerTest_supportAiDesc')}</span>
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  )
}
