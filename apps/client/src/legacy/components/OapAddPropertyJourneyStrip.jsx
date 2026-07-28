import { useEffect } from 'react'
import { OAP_JOURNEY_IMAGES, OAP_JOURNEY_STEP_COUNT } from '../pages/oapJourneyImages'
import { preloadOapWizardImages } from '../pages/oapWizardImages'
import './OapAddPropertyJourneyStrip.css'

export { OAP_JOURNEY_STEP_COUNT }

export default function OapAddPropertyJourneyStrip({ activeIndex = 0 }) {
  const safeIndex = Math.max(0, Math.min(activeIndex, OAP_JOURNEY_STEP_COUNT - 1))

  useEffect(() => {
    preloadOapWizardImages()
  }, [])

  return (
    <div className="oap-journey-strip" aria-hidden="true">
      {OAP_JOURNEY_IMAGES.map((src, index) => (
        <img
          key={src}
          className={`oap-journey-strip__image${
            index === safeIndex ? ' oap-journey-strip__image--active' : ''
          }`}
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          loading={index <= 1 ? 'eager' : 'lazy'}
          fetchPriority={index === safeIndex ? 'high' : 'low'}
        />
      ))}
    </div>
  )
}
