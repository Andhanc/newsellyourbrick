import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Bot, MessageCircle } from 'lucide-react'
import { openOwnerAiChat, openOwnerManagerChat } from '../utils/ownerCabinetChat'
import './OwnerSupportButton.css'

const MENU_GAP = 10
const MENU_ESTIMATED_HEIGHT = 196

function ChatGlyph({ size = 20 }) {
  return (
    <svg
      className="otsb__glyph"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g transform="translate(12 12) scale(1.26) translate(-12 -12)">
        <path
          d="M12 3.7c4.7 0 8.35 3.15 8.35 7.05 0 3.9-3.65 7.05-8.35 7.05-.78 0-1.53-.08-2.24-.22-1.05.78-2.48 1.36-4.22 1.58 1.02-1.12 1.42-2.42 1.5-3.32-1.9-1.18-3.14-3.02-3.14-5.09C4.65 6.85 7.3 3.7 12 3.7Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <circle cx="8.75" cy="10.75" r="1.12" fill="currentColor" />
        <circle cx="12" cy="10.75" r="1.12" fill="currentColor" />
        <circle cx="15.25" cy="10.75" r="1.12" fill="currentColor" />
      </g>
    </svg>
  )
}

function computeMenuStyle(buttonEl, menuEl) {
  if (!buttonEl) return null

  const rect = buttonEl.getBoundingClientRect()
  const menuHeight = menuEl?.offsetHeight || MENU_ESTIMATED_HEIGHT
  const menuWidth = menuEl?.offsetWidth || 280
  const viewportPadding = 12

  let top = rect.bottom + MENU_GAP
  if (top + menuHeight > window.innerHeight - viewportPadding) {
    top = Math.max(viewportPadding, rect.top - menuHeight - MENU_GAP)
  }

  let left = rect.right - menuWidth
  left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding))

  return { top: `${top}px`, left: `${left}px` }
}

export default function OwnerSupportButton({ className = '', iconSize = 20 }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])

  const updateMenuPosition = useCallback(() => {
    setMenuStyle(computeMenuStyle(buttonRef.current, menuRef.current))
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null)
      return undefined
    }

    updateMenuPosition()

    const handleReposition = () => updateMenuPosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      const target = event.target
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      close()
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

  const menu =
    open && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        className="otsb__menu"
        role="menu"
        aria-label={t('ownerTest_supportAria')}
        style={{
          ...(menuStyle || { top: '-9999px', left: '-9999px' }),
          visibility: menuStyle ? 'visible' : 'hidden',
        }}
      >
        <p className="otsb__menu-title">{t('ownerTest_supportMenuTitle')}</p>
        <button
          type="button"
          className="otsb__menu-item"
          role="menuitem"
          onClick={() => {
            close()
            openOwnerManagerChat()
          }}
        >
          <span className="otsb__menu-icon otsb__menu-icon--chat" aria-hidden>
            <MessageCircle size={18} strokeWidth={2} />
          </span>
          <span className="otsb__menu-copy">
            <span className="otsb__menu-label">{t('ownerTest_supportChat')}</span>
            <span className="otsb__menu-desc">{t('ownerTest_supportChatDesc')}</span>
          </span>
        </button>
        <button
          type="button"
          className="otsb__menu-item"
          role="menuitem"
          onClick={() => {
            close()
            openOwnerAiChat()
          }}
        >
          <span className="otsb__menu-icon otsb__menu-icon--ai" aria-hidden>
            <Bot size={18} strokeWidth={2} />
          </span>
          <span className="otsb__menu-copy">
            <span className="otsb__menu-label">{t('ownerTest_supportAi')}</span>
            <span className="otsb__menu-desc">{t('ownerTest_supportAiDesc')}</span>
          </span>
        </button>
      </div>
    ) : null

  return (
    <div className="otsb" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-label={t('ownerTest_supportAria')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChatGlyph size={iconSize} />
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
