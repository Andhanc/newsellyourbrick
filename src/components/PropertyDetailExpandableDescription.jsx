import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import './PropertyDetailExpandableDescription.css'

const COLLAPSED_LINES = 4

export default function PropertyDetailExpandableDescription({ text, textClassName = '' }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [canToggle, setCanToggle] = useState(false)
  const textRef = useRef(null)
  const descriptionText = text ? String(text).trim() : ''

  useLayoutEffect(() => {
    setExpanded(false)
    setCanToggle(false)
  }, [descriptionText])

  useLayoutEffect(() => {
    if (expanded) return

    const el = textRef.current
    if (!el) return

    const measure = () => {
      setCanToggle(el.scrollHeight > el.clientHeight + 1)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [descriptionText, expanded])

  if (!descriptionText) return null

  return (
    <div className="property-detail-expandable-description">
      <p
        ref={textRef}
        className={`property-detail-expandable-description__text${
          expanded ? '' : ' property-detail-expandable-description__text--clamped'
        }${textClassName ? ` ${textClassName}` : ''}`}
        style={{ '--pd-description-lines': COLLAPSED_LINES }}
      >
        {descriptionText}
      </p>
      {canToggle ? (
        <button
          type="button"
          className="property-detail-expandable-description__toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <span>
            {expanded ? t('buyerCabinet_collapse') : t('privateClubLearnMore')}
          </span>
          <ChevronDown
            className={`property-detail-expandable-description__chevron${
              expanded ? ' property-detail-expandable-description__chevron--up' : ''
            }`}
            size={16}
            strokeWidth={2.25}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  )
}
