import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buildBreadcrumbTrail } from '../utils/breadcrumbTrail'
import './PageBreadcrumbs.css'

/**
 * Хлебные крошки по текущему URL или явному массиву `trail`.
 * @param {{ to: string | null, label: string }[]} [trail] — полная цепочка (если задана, URL не используется)
 * @param {string} [currentLabel] — переопределить только текст последнего пункта
 */
export default function PageBreadcrumbs({
  trail: trailProp,
  currentLabel,
  homeTo = '/',
  variant,
  className,
  separator = '>',
}) {
  const { t, i18n } = useTranslation()
  const location = useLocation()

  const items = useMemo(() => {
    let list
    if (trailProp?.length) {
      list = trailProp.map((c) => ({ ...c }))
    } else {
      list = buildBreadcrumbTrail(location, homeTo, t)
    }
    if (currentLabel && list.length > 0) {
      const copy = [...list]
      copy[copy.length - 1] = { ...copy[copy.length - 1], label: currentLabel }
      return copy
    }
    return list
  }, [trailProp, location.pathname, location.search, homeTo, currentLabel, t, i18n.language])

  const navClass = [
    variant === 'tiffany' ? 'page-breadcrumbs page-breadcrumbs--tiffany' : 'page-breadcrumbs',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const elements = []
  items.forEach((item, index) => {
    if (index > 0) {
      elements.push(
        <li key={`sep-${index}`} className="page-breadcrumbs__sep" aria-hidden="true">
          {separator}
        </li>
      )
    }
    const isCurrent = item.to == null
    elements.push(
      <li
        key={`item-${index}`}
        className={`page-breadcrumbs__item${isCurrent ? ' page-breadcrumbs__item--current' : ''}`}
        aria-current={isCurrent ? 'page' : undefined}
      >
        {isCurrent ? (
          <span className="page-breadcrumbs__current">{item.label}</span>
        ) : (
          <Link to={item.to} className="page-breadcrumbs__link">
            {item.label}
          </Link>
        )}
      </li>
    )
  })

  return (
    <nav className={navClass} aria-label={t('breadcrumbAria')}>
      <ol className="page-breadcrumbs__list">{elements}</ol>
    </nav>
  )
}
