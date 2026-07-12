import { ChevronDown } from 'lucide-react'

export default function FilterCollapsibleSection({
  title,
  open,
  onToggle,
  children,
  classPrefix = 'auction-desktop-filters',
}) {
  return (
    <section className={`${classPrefix}__section${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`${classPrefix}__section-toggle`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown size={18} className={`${classPrefix}__chevron`} aria-hidden />
      </button>
      {open ? <div className={`${classPrefix}__section-body`}>{children}</div> : null}
    </section>
  )
}
