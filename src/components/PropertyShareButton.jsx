import { FiShare2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { sharePropertyListing } from '../utils/shareProperty'
import { showNotification } from '../utils/toastHelper'
import './PropertyShareButton.css'

export default function PropertyShareButton({
  property,
  className = '',
  variant = 'default',
  iconSize = 18,
  stopPropagation = true,
}) {
  const { t } = useTranslation()

  const handleClick = async (e) => {
    if (stopPropagation) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!property) return

    const result = await sharePropertyListing(property)
    if (result === 'clipboard') {
      showNotification(t('shareLinkCopied'), 'success')
    } else if (result === 'failed') {
      showNotification(t('shareLinkFailed'), 'error')
    }
  }

  const variantClass = variant !== 'default' ? ` property-share-btn--${variant}` : ''

  return (
    <button
      type="button"
      className={`property-share-btn${variantClass}${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      aria-label={t('share')}
    >
      <FiShare2 size={iconSize} aria-hidden />
    </button>
  )
}
