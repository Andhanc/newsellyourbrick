import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Карточка направления (Доли / Аукцион / Долги и т.д.). Внешний вид — модификаторы
 * `test-direction-card--shares|auction|debts|bonuses` в TestPage.css.
 */
const DirectionSummaryCard = forwardRef(function DirectionSummaryCard(
  {
    variant = 'shares',
    areaLabel,
    headline,
    subCardTitle,
    subCardSubtitle,
    thumbnails = [],
    moreCount = 0,
    to,
    className,
  },
  ref,
) {
  return (
    <Link
      ref={ref}
      to={to}
      className={cn(
        'test-direction-card',
        `test-direction-card--${variant}`,
        'group flex min-h-0 w-full min-w-0 flex-col no-underline outline-none',
        className,
      )}
    >
      <div className="test-direction-card__head">
        <div className="test-direction-card__top">
          <div className="test-direction-card__text">
            <p className="test-direction-card__eyebrow">{areaLabel}</p>
            <p className="test-direction-card__title">{headline}</p>
            <p className="test-direction-card__subtitle">{subCardTitle}</p>
            <p className="test-direction-card__desc">{subCardSubtitle}</p>
          </div>

          <div className="test-direction-card__arrow-wrap">
            <span className="test-direction-card__arrow" aria-hidden>
              <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>

      <div className="test-direction-card__foot">
        <div className="test-direction-card__thumbs">
          {thumbnails.map((img, index) => (
            <img
              key={`${img.src}-${index}`}
              src={img.src}
              alt={img.alt}
              className="test-direction-card__thumb"
              style={{ marginLeft: index > 0 ? '-10px' : 0 }}
              loading="lazy"
            />
          ))}
          {moreCount > 0 ? (
            <div
              className="test-direction-card__badge"
              style={{ marginLeft: thumbnails.length > 0 ? '-10px' : 0 }}
            >
              +{moreCount}
            </div>
          ) : null}
        </div>
        <div className="test-direction-card__bottom-line" aria-hidden />
      </div>
    </Link>
  )
})

DirectionSummaryCard.displayName = 'DirectionSummaryCard'

export default DirectionSummaryCard
export { DirectionSummaryCard }
