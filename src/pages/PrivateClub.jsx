import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { FiArrowRight } from 'react-icons/fi'
import Header from '../components/Header'
import PageBreadcrumbs from '../components/PageBreadcrumbs'
import PrivateClubVipGate from '../components/PrivateClubVipGate'
import PrivateClubVipCelebrationModal from '../components/PrivateClubVipCelebrationModal'
import { getUserData } from '../services/authService'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import './PrivateClub.css'

const IMG_CART = '/images/external/private-club-cart.svg'
const IMG_DOCUMENTS = '/images/external/private-club-documents.svg'
const IMG_MANAGER = '/images/external/private-club-manager.svg'
const IMG_NETWORK = '/images/external/private-club-network.svg'

const CLUB_CTA = '/subscriptions#subscriptions-pricing-section'
const WHATSAPP_SUPPORT_HREF = 'https://wa.me/447700183959'

function ClubCardLink({ to, compact = false }) {
  const { t } = useTranslation()
  return (
    <Link
      to={to}
      className={`private-club-card__link${compact ? ' private-club-card__link--compact' : ''}`}
    >
      <span className="private-club-card__link-text">{t('privateClubLearnMore')}</span>
      <span className="private-club-card__link-icon" aria-hidden>
        <FiArrowRight size={compact ? 12 : 14} strokeWidth={2.5} />
      </span>
    </Link>
  )
}

export default function PrivateClub() {
  const { t } = useTranslation()
  const { user, isLoaded: clerkLoaded } = useUser()
  const [vipGateOpen, setVipGateOpen] = useState(false)
  const [vipCelebrationOpen, setVipCelebrationOpen] = useState(false)
  const [numericUserId, setNumericUserId] = useState(() => {
    const raw = getUserData()?.id ?? localStorage.getItem('userId')
    return raw && /^\d+$/.test(String(raw)) ? parseInt(String(raw), 10) : null
  })

  useEffect(() => {
    const raw = getUserData()?.id ?? localStorage.getItem('userId')
    if (raw && /^\d+$/.test(String(raw))) {
      setNumericUserId(parseInt(String(raw), 10))
    } else {
      setNumericUserId(null)
    }
  }, [user, clerkLoaded])

  const openJoinGate = () => {
    if (!isSiteUserSignedIn(user, clerkLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setVipGateOpen(true)
  }

  return (
    <div className="private-club-page">
      <Header />
      <PrivateClubVipGate
        open={vipGateOpen}
        onClose={() => setVipGateOpen(false)}
        userId={numericUserId}
        onPrivateClubActivated={() => {
          setVipGateOpen(false)
          setVipCelebrationOpen(true)
        }}
      />
      <PrivateClubVipCelebrationModal open={vipCelebrationOpen} onClose={() => setVipCelebrationOpen(false)} />
      <main className="private-club-main">
        <div className="page-context-heading page-context-heading--private-club">
          <h1 className="page-context-heading__title page-context-heading__title--private-club">
            {t('privateClubPageTitle')}
          </h1>
          <div className="page-context-heading__breadcrumbs page-context-heading__breadcrumbs--private-club">
            <PageBreadcrumbs separator=">" className="page-breadcrumbs--flat-club" />
          </div>
          <p className="private-club-intro">{t('privateClubIntro')}</p>
        </div>

        <div className="private-club-grid">
          <article className="private-club-card private-club-card--hero">
            <div className="private-club-card__body private-club-card__body--hero">
              <h2 className="private-club-card__title">{t('privateClubExclusiveTitle')}</h2>
              <p className="private-club-card__text">{t('privateClubExclusiveDesc')}</p>
              <ClubCardLink to={CLUB_CTA} />
            </div>
            <div className="private-club-card__visual private-club-card__visual--hero">
              <img
                src={IMG_CART}
                alt=""
                className="private-club-card__img private-club-card__img--tiffany-tint"
                decoding="async"
              />
            </div>
          </article>

          <div className="private-club-row">
            <article className="private-club-card private-club-card--stack">
              <div className="private-club-card__stack-top">
                <h2 className="private-club-card__title">{t('privateClubManagerTitle')}</h2>
                <p className="private-club-card__text">{t('privateClubManagerDesc')}</p>
              </div>
              <div className="private-club-card__visual private-club-card__visual--bottom">
                <img
                  src={IMG_MANAGER}
                  alt=""
                  className="private-club-card__img private-club-card__img--tiffany-tint"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="private-club-card__stack-foot">
                <ClubCardLink to={CLUB_CTA} compact />
              </div>
            </article>

            <article className="private-club-card private-club-card--stack">
              <div className="private-club-card__stack-top">
                <h2 className="private-club-card__title">{t('privateClubPapersTitle')}</h2>
                <p className="private-club-card__text">{t('privateClubPapersDesc')}</p>
              </div>
              <div className="private-club-card__visual private-club-card__visual--bottom">
                <img
                  src={IMG_DOCUMENTS}
                  alt=""
                  className="private-club-card__img private-club-card__img--tiffany-tint"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="private-club-card__stack-foot">
                <ClubCardLink to={CLUB_CTA} compact />
              </div>
            </article>

            <article className="private-club-card private-club-card--stack">
              <div className="private-club-card__stack-top">
                <h2 className="private-club-card__title">{t('privateClubNetworkingTitle')}</h2>
                <p className="private-club-card__text">{t('privateClubNetworkingDesc')}</p>
              </div>
              <div className="private-club-card__visual private-club-card__visual--bottom">
                <img src={IMG_NETWORK} alt="" className="private-club-card__img" loading="lazy" decoding="async" />
              </div>
              <div className="private-club-card__stack-foot">
                <ClubCardLink to={CLUB_CTA} compact />
              </div>
            </article>
          </div>
        </div>

        <section className="private-club-cta" aria-label={t('privateClubJoinCtaAria')}>
          <button type="button" className="private-club-cta__btn" onClick={openJoinGate}>
            <span className="private-club-cta__btn-label">{t('privateClubJoinCta')}</span>
          </button>
        </section>

        <section className="private-club-action-strip" aria-labelledby="private-club-action-strip-heading">
          <div className="private-club-action-strip__inner">
            <h2 id="private-club-action-strip-heading" className="private-club-action-strip__heading">
              {t('privateClubActionStripHeading')}
            </h2>
            <div className="private-club-action-strip__cards">
              <Link to="/profile" className="private-club-action-strip__card">
                <div className="private-club-action-strip__card-text">
                  <span className="private-club-action-strip__card-title">{t('privateClubActionProfileTitle')}</span>
                  <span className="private-club-action-strip__card-sub">{t('privateClubActionProfileSubtitle')}</span>
                </div>
                <span className="private-club-action-strip__card-go" aria-hidden>
                  <FiArrowRight size={20} strokeWidth={2} />
                </span>
              </Link>
              <a
                href={WHATSAPP_SUPPORT_HREF}
                className="private-club-action-strip__card"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="private-club-action-strip__card-text">
                  <span className="private-club-action-strip__card-title">{t('privateClubActionWhatsTitle')}</span>
                  <span className="private-club-action-strip__card-sub">{t('privateClubActionWhatsSubtitle')}</span>
                </div>
                <span className="private-club-action-strip__card-go" aria-hidden>
                  <FiArrowRight size={20} strokeWidth={2} />
                </span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
