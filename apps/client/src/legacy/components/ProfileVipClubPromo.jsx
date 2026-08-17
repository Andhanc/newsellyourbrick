import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight } from 'react-icons/fi'
import ProfileVipClubPromoArt from './ProfileVipClubPromoArt'
import './ProfileVipClubPromo.css'

/** Рекламный баннер закрытого VIP-клуба (тиффани, как промо-полоса). */
export default function ProfileVipClubPromo({ className = '', titleId = 'profile-vip-club-promo-title' }) {
  const { t } = useTranslation()

  const rootClass = ['profile-vip-club-promo', className].filter(Boolean).join(' ')

  return (
    <Link to="/private-club" className={rootClass} aria-labelledby={titleId}>
      <div className="profile-vip-club-promo__inner">
        <div className="profile-vip-club-promo__copy">
          <h2 id={titleId} className="profile-vip-club-promo__title">
            {t('profileVipClubPromoTitle')}
          </h2>
          <p className="profile-vip-club-promo__desc">{t('profileVipClubPromoLead')}</p>
          <span className="profile-vip-club-promo__cta">
            <span>{t('privateClubJoinCta')}</span>
            <FiArrowRight size={17} aria-hidden />
          </span>
        </div>
        <ProfileVipClubPromoArt className="profile-vip-club-promo__art" />
      </div>
    </Link>
  )
}
