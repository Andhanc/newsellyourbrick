import { FiArrowLeft } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './PageBackButton.css'

/**
 * Единая кнопка «Назад» (как на странице объекта).
 */
export default function PageBackButton({
  onClick,
  className = '',
  label,
  iconSize = 20,
  type = 'button',
  ...rest
}) {
  const { t } = useTranslation()
  const text = label ?? t('back')

  return (
    <button
      type={type}
      className={`page-back-button${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-label={text}
      {...rest}
    >
      <FiArrowLeft size={iconSize} aria-hidden />
      <span>{text}</span>
    </button>
  )
}
