import { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import './OapSelect.css'

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
  const rootRef = useRef(null)
  const listId = useId()
  const selected = options.find((opt) => opt.value === value)

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

  const classNames = ['oap-select', open ? 'oap-select--open' : '', className].filter(Boolean).join(' ')

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
        <ul id={listId} className="oap-select__menu" role="listbox">
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
