import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { publicAsset } from '@/utils/publicAsset'
import { scrollMainTo } from '@/utils/mainScroll'

const PROMO_BLOCKS = [
  {
    key: 'urban',
    titleKey: 'sybLandingPromoUrbanTitle',
    descKey: 'sybLandingPromoUrbanDesc',
    href: '/auction',
    image: publicAsset('images/sellyourbrick/syb-promo-urban-house.png'),
    imageAltKey: 'sybLandingPromoUrbanImageAlt',
  },
  {
    key: 'coastal',
    titleKey: 'sybLandingPromoCoastalTitle',
    descKey: 'sybLandingPromoCoastalDesc',
    href: '/shares',
    image: publicAsset('images/sellyourbrick/syb-promo-coastal-house.png'),
    imageAltKey: 'sybLandingPromoCoastalImageAlt',
  },
]

export default function SybLandingPromoBlocks() {
  const { t } = useTranslation()

  return (
    <section className="syb-promo" aria-label={t('sybLandingPromoAria')}>
      <div className="syb-promo__grid">
        {PROMO_BLOCKS.map((block) => (
          <Link
            key={block.key}
            to={block.href}
            className={`syb-promo-card syb-promo-card--${block.key}`}
            onClick={() => scrollMainTo(0, 0, 'instant')}
          >
            <div className="syb-promo-card__surface">
              <div className="syb-promo-card__copy">
                <h3 className="syb-promo-card__title">{t(block.titleKey)}</h3>
                <p className="syb-promo-card__desc">{t(block.descKey)}</p>
              </div>
              <div className="syb-promo-card__frame">
                <img src={block.image} alt={t(block.imageAltKey)} loading="lazy" decoding="async" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
