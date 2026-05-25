import {
  FiCalendar,
  FiEye,
  FiMessageCircle,
  FiThumbsUp,
} from 'react-icons/fi'

export default function NewsArticleMeta({ date, views, comments, likes, className = '' }) {
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
      <span className="news-meta__item">
        <FiMessageCircle size={14} aria-hidden />
        <span>{comments}</span>
      </span>
      <span className="news-meta__item">
        <FiThumbsUp size={14} aria-hidden />
        <span>{likes}</span>
      </span>
    </div>
  )
}
