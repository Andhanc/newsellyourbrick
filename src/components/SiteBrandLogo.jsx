import { Link } from 'react-router-dom'
import './SiteBrandLogo.css'

export function SiteBrandIcon({ className = '' }) {
  return (
    <div className={`site-brand__icon ${className}`.trim()} aria-hidden>
      <span className="site-brand__house" />
    </div>
  )
}

export default function SiteBrandLogo({
  className = '',
  iconClassName = '',
  textClassName = '',
  to,
  onClick,
  ariaLabel = 'Sellyourbrick',
}) {
  const inner = (
    <>
      <SiteBrandIcon className={iconClassName} />
      <span className={`site-brand__text ${textClassName}`.trim()}>sellyourbrick</span>
    </>
  )

  const rootClass = `site-brand site-brand--header ${className}`.trim()

  if (to) {
    return (
      <Link to={to} className={rootClass} aria-label={ariaLabel} onClick={onClick}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={rootClass} aria-label={ariaLabel}>
      {inner}
    </div>
  )
}
