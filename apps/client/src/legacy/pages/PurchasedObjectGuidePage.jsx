import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Home,
  Sparkles,
  Tag,
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ImageWithSkeleton from '../components/ImageWithSkeleton'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { navigateToSellPurchasedProperty } from '../utils/navigateToSellPurchasedProperty'
import {
  buildPurchasedPropertySnapshot,
  fetchPropertySnapshot,
} from '../utils/purchasedPropertyListingPrefill'
import { useRoleSwitchFlow } from '../hooks/useRoleSwitchFlow'
import { RoleSwitchModals } from '../components/RoleSwitchBottomCta'
import './PurchasedObjectGuidePage.css'

const STEPS = [
  { id: 'owned', icon: CheckCircle2 },
  { id: 'docs', icon: FileText },
  { id: 'sell', icon: Tag },
  { id: 'publish', icon: Sparkles },
]

export default function PurchasedObjectGuidePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { propertyId } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sellerPromptOpen, setSellerPromptOpen] = useState(false)
  const [sellerPromptMode, setSellerPromptMode] = useState('register')
  const roleSwitchFlow = useRoleSwitchFlow('seller')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const data = await fetchPropertySnapshot(propertyId, i18n.language || 'ru')
        if (!cancelled) setProperty(data)
      } catch {
        if (!cancelled) setError(t('purchasedGuide_loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [propertyId, i18n.language, t])

  const snapshot = useMemo(
    () => (property ? buildPurchasedPropertySnapshot(property) : null),
    [property],
  )

  const imageProps = useMemo(() => {
    const src = snapshot?.image || property?.images?.[0] || property?.image
    if (!src) return null
    return buildResponsiveImageProps(src, {
      widths: [480, 720, 960],
      sizes: '(max-width: 768px) 100vw, 560px',
      fit: 'cover',
      quality: 76,
      format: 'webp',
    })
  }, [property, snapshot?.image])

  const handleSell = useCallback(() => {
    if (!snapshot?.id) return
    void navigateToSellPurchasedProperty({
      propertyId: snapshot.id,
      propertySnapshot: snapshot,
      navigate,
      onPromptSellerAction: ({ mode }) => {
        setSellerPromptMode(mode === 'switch' ? 'switch' : 'register')
        setSellerPromptOpen(true)
      },
    })
  }, [navigate, snapshot])

  const handleSellerPromptConfirm = useCallback(() => {
    setSellerPromptOpen(false)
    void roleSwitchFlow.openSellCabinetFlow(sellerPromptMode)
  }, [roleSwitchFlow, sellerPromptMode])

  const title = property?.title || property?.name || t('purchasedGuide_defaultTitle')

  return (
    <div className="purchased-guide-page">
      <Header />
      <main className="purchased-guide">
        <div className="purchased-guide__container">
          {loading ? (
            <div className="purchased-guide__loading">{t('purchasedGuide_loading')}</div>
          ) : error ? (
            <div className="purchased-guide__error">
              <p>{error}</p>
              <Link to="/profile" className="purchased-guide__link-back">
                {t('purchasedGuide_backProfile')}
              </Link>
            </div>
          ) : (
            <>
              <section className="purchased-guide__hero">
                <div className="purchased-guide__hero-copy">
                  <p className="purchased-guide__eyebrow">{t('purchasedGuide_eyebrow')}</p>
                  <h1>{t('purchasedGuide_title')}</h1>
                  <p className="purchased-guide__lead">{t('purchasedGuide_lead')}</p>
                </div>
                <article className="purchased-guide__property-card">
                  {imageProps ? (
                    <div className="purchased-guide__property-image">
                      <ImageWithSkeleton imgProps={imageProps} alt="" />
                    </div>
                  ) : (
                    <div className="purchased-guide__property-image purchased-guide__property-image--placeholder">
                      <Home size={32} aria-hidden />
                    </div>
                  )}
                  <div className="purchased-guide__property-body">
                    <h2>{title}</h2>
                    {property?.location ? <p>{property.location}</p> : null}
                    <Link
                      to={getPropertyDetailPath(property)}
                      className="purchased-guide__view-link"
                    >
                      {t('purchasedGuide_viewProperty')}
                    </Link>
                  </div>
                </article>
              </section>

              <section className="purchased-guide__steps" aria-labelledby="purchased-guide-steps-title">
                <h2 id="purchased-guide-steps-title">{t('purchasedGuide_stepsTitle')}</h2>
                <ol className="purchased-guide__steps-list">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon
                    return (
                      <li key={step.id} className="purchased-guide__step">
                        <span className="purchased-guide__step-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="purchased-guide__step-icon" aria-hidden>
                          <Icon size={20} strokeWidth={2} />
                        </span>
                        <div>
                          <h3>{t(`purchasedGuide_step_${step.id}_title`)}</h3>
                          <p>{t(`purchasedGuide_step_${step.id}_text`)}</p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>

              <section className="purchased-guide__cta">
                <div className="purchased-guide__cta-copy">
                  <h2>{t('purchasedGuide_sellTitle')}</h2>
                  <p>{t('purchasedGuide_sellText')}</p>
                </div>
                <button type="button" className="purchased-guide__cta-btn" onClick={handleSell}>
                  {t('purchasedGuide_sellCta')}
                  <ArrowRight size={18} aria-hidden />
                </button>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />

      {sellerPromptOpen ? (
        <div className="purchased-guide-seller-prompt" role="dialog" aria-modal="true">
          <div className="purchased-guide-seller-prompt__backdrop" onClick={() => setSellerPromptOpen(false)} />
          <div className="purchased-guide-seller-prompt__panel">
            <h3>
              {sellerPromptMode === 'switch'
                ? t('purchasedGuide_switchPromptTitle')
                : t('purchasedGuide_sellerPromptTitle')}
            </h3>
            <p>
              {sellerPromptMode === 'switch'
                ? t('purchasedGuide_switchPromptText')
                : t('purchasedGuide_sellerPromptText')}
            </p>
            <div className="purchased-guide-seller-prompt__actions">
              <button type="button" className="purchased-guide-seller-prompt__ghost" onClick={() => setSellerPromptOpen(false)}>
                {t('purchasedGuide_sellerPromptCancel')}
              </button>
              <button type="button" className="purchased-guide-seller-prompt__primary" onClick={handleSellerPromptConfirm}>
                {t('purchasedGuide_sellerPromptConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <RoleSwitchModals flow={roleSwitchFlow} />
    </div>
  )
}
