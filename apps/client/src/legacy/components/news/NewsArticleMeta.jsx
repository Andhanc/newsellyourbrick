import { FiCalendar, FiEye } from 'react-icons/fi'

export default function NewsArticleMeta({ date, views, className = '' }) {
  return (
    <div className={`news-meta ${className}`.trim()}>
      <span className="news-meta__item">
        <FiCalendar size={14} aria-hidden />
        <span>{date}</span>
      </span>
      <span className="news-meta__item">
        <FiEye size={14} aria-hidden />
        <span>{views}</span>
      </span>
    </div>
  )
}
