import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './PageBreadcrumbs.css'

/**
 * Хлебные крошки: Главная → текущий раздел (последний пункт — текст, без ссылки).
 */
export default function PageBreadcrumbs({ currentLabel, homeTo = '/', variant, className, separator = '>' }) {
  const { t } = useTranslation()

  const navClass = [
    variant === 'tiffany' ? 'page-breadcrumbs page-breadcrumbs--tiffany' : 'page-breadcrumbs',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <nav className={navClass} aria-label={t('breadcrumbAria')}>
      <ol className="page-breadcrumbs__list">
        <li className="page-breadcrumbs__item">
          <Link to={homeTo} className="page-breadcrumbs__link">
            {t('home')}
          </Link>
        </li>
        <li className="page-breadcrumbs__sep" aria-hidden="true">
          {separator}
        </li>
        <li className="page-breadcrumbs__item page-breadcrumbs__item--current" aria-current="page">
          <span className="page-breadcrumbs__current">{currentLabel}</span>
        </li>
      </ol>
    </nav>
  )
}
