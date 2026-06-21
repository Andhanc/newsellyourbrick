import { useState, useRef, useEffect, useLayoutEffect, useId, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import './OapSelect.css'

const MENU_ESTIMATED_HEIGHT = 220

function findScrollParent(element) {
  let node = element?.parentElement
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) {
      return node
    }
    node = node.parentElement
  }
  return null
}

function getVisibleBottomLimit() {
  const footer = document.querySelector('.oap-footer--journey')
  if (footer) return footer.getBoundingClientRect().top - 8
  return window.innerHeight - 8
}

export default function OapSelect({
  value,
  onChange,
  options,
  placeholder = 'Выберите',
  className = '',
  id,
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [menuScrollable, setMenuScrollable] = useState(false)
  const [menuAtBottom, setMenuAtBottom] = useState(true)
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const listId = useId()
  const selected = options.find((opt) => opt.value === value)

  const updateMenuScrollState = useCallback(() => {
    const menu = menuRef.current
    if (!menu) return
    const canScroll = menu.scrollHeight > menu.clientHeight + 2
    setMenuScrollable(canScroll)
    setMenuAtBottom(menu.scrollTop + menu.clientHeight >= menu.scrollHeight - 2)
  }, [])

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setDropUp(false)
      setMenuScrollable(false)
      setMenuAtBottom(true)
      return
    }

    const trigger = rootRef.current.querySelector('.oap-select__trigger')
    if (!trigger) return

    const triggerRect = trigger.getBoundingClientRect()
    const visibleBottom = getVisibleBottomLimit()
    const scrollParent = findScrollParent(rootRef.current)
    const scrollParentTop = scrollParent?.getBoundingClientRect().top ?? 0
    const spaceBelow = visibleBottom - triggerRect.bottom
    const spaceAbove = triggerRect.top - scrollParentTop - 8
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow

    setDropUp(openUp)

    requestAnimationFrame(() => {
      const menu = menuRef.current
      const menuHeight = menu?.offsetHeight ?? MENU_ESTIMATED_HEIGHT
      updateMenuScrollState()

      if (!scrollParent) return

      if (openUp) {
        const overflowTop = scrollParentTop + 12 - (triggerRect.top - menuHeight - 8)
        if (overflowTop > 0) {
          scrollParent.scrollBy({ top: -overflowTop, behavior: 'smooth' })
        }
        return
      }

      const menuBottom = triggerRect.bottom + menuHeight + 8
      if (menuBottom > visibleBottom) {
        scrollParent.scrollBy({ top: menuBottom - visibleBottom, behavior: 'smooth' })
      }
    })
  }, [open, options, updateMenuScrollState])

  useEffect(() => {
    if (!open) return undefined

    const onDocPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('touchstart', onDocPointer, { passive: true })
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('touchstart', onDocPointer)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const classNames = [
    'oap-select',
    open ? 'oap-select--open' : '',
    dropUp ? 'oap-select--drop-up' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const menuClassNames = [
    'oap-select__menu',
    menuScrollable && !menuAtBottom ? 'oap-select__menu--scroll-hint' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={rootRef} className={classNames}>
      <button
        type="button"
        id={id}
        className="oap-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={selected ? 'oap-select__value' : 'oap-select__placeholder'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={18} className="oap-select__chevron" aria-hidden />
      </button>
      {open ? (
        <ul
          id={listId}
          ref={menuRef}
          className={menuClassNames}
          role="listbox"
          onScroll={updateMenuScrollState}
        >
          {options.map((opt) => (
            <li key={opt.value || '__empty'} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                className={`oap-select__option${value === opt.value ? ' oap-select__option--active' : ''}`}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
