import { requestOpenLoginModal } from '../../utils/requestOpenLoginModal'
import useDealSession from './useDealSession'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import SectionInfoDrawer from '../../components/SectionInfoDrawer'
import '../../pages/BuyNow.css'
import '../../components/AuctionPropertyCard.css'
import '../../styles/discoverAuctionCards.css'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpRight,
  ArrowDown,
  Plus,
  Building2,
  MapPin,
} from 'lucide-react'
import { getUserData } from '../../services/authService'
import {
  DEVELOPMENT_STAGES,
  validateDevelopment,
} from '../../utils/developmentFinance'
import {
  dealApi,
  recordDealView,
} from './api'
import DevelopmentFields, {
  useDealFormat,
  Waterfall,
} from './DevelopmentFields'
import { DealAnalytics } from './DealRoom'
import DevelopmentGallery from './DevelopmentGallery'
import AuctionBidDrawer from '../../components/AuctionBidDrawer'
import DevelopmentProjectHeader from './DevelopmentProjectHeader'
import DevelopmentFundingOverview from './DevelopmentFundingOverview'
import DevelopmentProjectResources from './DevelopmentProjectResources'
import DevelopmentProjectJourney from './DevelopmentProjectJourney'
import DevelopmentProgressPromo from './DevelopmentProgressPromo'
import './development.css'
export function DealError({ error }) {
  const { t } = useTranslation()
  return error ? (
    <div className="dev-error" role="alert">
      <p>{t(`develop.${error}`, { defaultValue: t('develop.serverError') })}</p>
      {error === 'loginRequired' && (
        <button className="dev-button" onClick={() => requestOpenLoginModal()}>
          {t('login')}
        </button>
      )}
    </div>
  ) : null
}
export function DevelopmentCard({ project: p }) {
  const { t } = useTranslation(),
    fmt = useDealFormat(p.currency)
  return (
    <article className="auction-card dev-listing-card">
      <Link to={`/development/${p.slug}`} className="auction-card__media dev-listing-card__media" aria-label={p.title}>
        <img className="auction-card__image" src={p.photos?.[0] || '/images/home-sale-formats/summer-2026/sale-format-shares-summer.webp'} alt={p.title} loading="lazy" />
        <span className="dev-listing-card__stage">{t(`develop.stage_${p.stage}`)}</span>
        <div className="dev-listing-card__capital">
          <span>{t('develop.investmentAmount')}</span>
          <strong>{fmt(p.terms.requiredCapital)}</strong>
        </div>
      </Link>
      <div className="auction-card__body">
        <h2 className="auction-card__title"><Link to={`/development/${p.slug}`}>{p.title}</Link></h2>
        <p className="auction-card__location"><MapPin size={12} aria-hidden="true" /><span>{p.location}</span></p>
        <dl className="auction-card__specs dev-listing-card__terms">
          <div className="auction-card__spec"><dt className="auction-card__spec-label">{t('develop.yieldCardLabel')}</dt><dd className="auction-card__spec-value">{p.terms.preferredReturn}%</dd></div>
          <div className="auction-card__spec"><dt className="auction-card__spec-label">{t('develop.termMonths')}</dt><dd className="auction-card__spec-value">{p.terms.termMonths} {t('develop.months')}</dd></div>
        </dl>
        <div className="auction-card__actions auction-card__actions--single">
          <Link className="auction-card__btn auction-card__btn--primary" to={`/development/${p.slug}`}>
            {t('develop.openProject')} <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function DevelopmentHero() {
  const { t } = useTranslation()
  const scrollToCatalog = () =>
    document
      .getElementById('development-catalog')
      ?.scrollIntoView({ behavior: 'smooth' })
  return (
    <section
      className="buy-now-hero dev-catalog-hero"
      aria-labelledby="development-title"
    >
      <img
        className="buy-now-hero__image"
        src="/images/home-sale-formats/summer-2026/sale-format-shares-summer.webp"
        alt=""
      />
      <div className="buy-now-hero__overlay" aria-hidden="true" />
      <div className="buy-now-hero__brand" aria-label="SellYourBrick">
        <span className="buy-now-hero__brand-text">
          <span>Sell</span>
          <span className="buy-now-hero__brand-accent">Your</span>
          <span>Brick</span>
        </span>
      </div>
      <div className="buy-now-hero__content">
        <span className="buy-now-hero__eyebrow">
          <Building2 size={14} /> DEVELOP
        </span>
        <div className="section-info-heading-row">
          <h1 id="development-title">{t('develop.heading')}</h1>
          <SectionInfoDrawer section="development" placement="heading" />
        </div>
        <p>{t('develop.intro')}</p>
        <button
          type="button"
          className="buy-now-hero__cta"
          onClick={scrollToCatalog}
        >
          <span>{t('develop.projects')}</span>
          <span className="buy-now-hero__cta-icon">
            <ArrowDown size={18} />
          </span>
        </button>
      </div>
      <button
        type="button"
        className="buy-now-hero__scroll"
        onClick={scrollToCatalog}
        aria-label={t('develop.projects')}
      >
        <span aria-hidden="true" />
      </button>
    </section>
  )
}

export default function DevelopmentPages({ mine = false }) {
  const session = useDealSession()
  const seller = ['seller', 'owner'].includes(getUserData()?.role)
  const { slug } = useParams(),
    { t } = useTranslation()
  const [data, setData] = useState(null),
    [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setData(null)
    setError('')
    dealApi(
      slug
        ? `/projects/${encodeURIComponent(slug)}`
        : `/projects${mine ? '?mine=1' : ''}`,
    )
      .then((d) => {
        if (live) setData(d)
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
    return () => {
      live = false
    }
  }, [slug, mine, session])
  return (
    <div
      className={`buy-now-page dev-site${slug ? ' dev-site--project property-detail-page-new--auction-desktop-v3' : ''}`}
    >
      {slug ? (
        <DevelopmentProjectHeader
          project={data && !Array.isArray(data) ? data : null}
        />
      ) : (
        <Header />
      )}
      {!slug && !mine && <DevelopmentHero />}
      <main
        id="development-catalog"
        className={`dev-feature dev-page${!slug && !mine ? ' dev-page--catalog' : ''}`}
      >
        <DealError error={error} />
        {!data && !error && <p role="status">{t('develop.loading')}</p>}
        {data &&
          (slug
            ? !Array.isArray(data) &&
              (data.slug === slug || String(data.id) === slug)
            : Array.isArray(data)) &&
          (slug ? (
            <DevelopmentProject
              key={data.id}
              project={data}
              onChange={setData}
            />
          ) : (
            <>
              <header className="dev-catalog-head">
                <div>
                  <span className="dev-eyebrow">DEVELOP</span>
                  {mine ? (
                    <h1>{t('develop.myProjects')}</h1>
                  ) : (
                    <h2>{t('develop.projects')}</h2>
                  )}
                </div>
                {mine && seller && <Link
                  className="dev-button"
                  to="/owner-test/add-property?model=development"
                >
                  <Plus size={18} />
                  {t('develop.addProject')}
                </Link>}
              </header>
              {mine && seller && <nav className="dev-nav">
                <Link
                  to="/development"
                  aria-current={!mine ? 'page' : undefined}
                >
                  {t('develop.projects')}
                </Link>
                <Link
                  to="/development/mine"
                  aria-current={mine ? 'page' : undefined}
                >
                  {t('develop.myProjects')}
                </Link>
              </nav>}
              {!data.length && <p>{t('develop.empty')}</p>}
              <div className="dev-card-grid discover-auction-cards">
                {data.map((p) => (
                  <DevelopmentCard key={p.id} project={p} />
                ))}
              </div>
            </>
          ))}
      </main>
      <Footer />
    </div>
  )
}
function DevelopmentProject({ project: p, onChange }) {
  const { t } = useTranslation(),
    fmt = useDealFormat(p.currency)
  const [reference, setReference] = useState(''),
    [note, setNote] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [interestOpen, setInterestOpen] = useState(false),
    [terms, setTerms] = useState(p.terms)
  const localUser = getUserData(),
    owner = ['seller', 'owner'].includes(localUser?.role) && Number(localUser?.id || localUser?.userId) === p.owner_id
  const canApply = Number(localUser?.id || localUser?.userId) !== p.owner_id && p.stage === 'fundraising' && !p.funded
  const openInterest = (event) => {
    event.currentTarget.focus({ preventScroll: true })
    setError('')
    setMessage('')
    setInterestOpen(true)
  }
  const nextStage = DEVELOPMENT_STAGES[DEVELOPMENT_STAGES.indexOf(p.stage) + 1]
  useEffect(() => {
    recordDealView(`development:${p.id}`).catch(() => {})
  }, [p.id])
  const act = async (path, body, method = 'POST') => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await dealApi(`/projects/${p.id}${path}`, { method, body })
      onChange(await dealApi(`/projects/${p.id}`))
      setMessage(path === '/interest' ? 'interestSaved' : 'saved')
      setEditing(false)
      setReference('')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="dev-project-hero">
        <DevelopmentGallery images={p.photos} title={p.title} stage={p.stage} />
      </div>
      <header className="dev-project-head">
        <div>
          <h1>{p.title}</h1>
          <p>
            <MapPin size={16} /> {p.location}
          </p>
        </div>
      </header>
      <DevelopmentFundingOverview
        project={p}
        canApply={canApply}
        onApply={openInterest}
      />
      <section id="development-project" className="dev-project-about">
        <h2>{t('addPropertyNameLabelDescription')}</h2>
        <p className="dev-preline">{p.description}</p>
        <dl className="dev-metrics">
          {[
            'landArea',
            'builtArea',
            'landCost',
            'constructionCost',
            'otherCosts',
            'expectedSale',
          ].map((k) => (
            <div key={k}>
              <dt>{t(`develop.${k}`)}</dt>
              <dd>
                {k.endsWith('Area') ? `${p.terms[k]} m²` : fmt(p.terms[k])}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {!interestOpen && <DealError error={error} />}
      {!interestOpen && message && (
        <p role="status" className="dev-notice">
          {t(`develop.${message}`)}
        </p>
      )}
      <DevelopmentProjectJourney project={p} />
      <div id="development-economics">
        <Waterfall terms={p.terms} currency={p.currency} />
      </div>
      <DevelopmentProgressPromo onInvest={openInterest} canInvest={canApply} />
      <DevelopmentProjectResources project={p} owner={owner} onChange={onChange} />
      {owner && (
        <>
          <section className="dev-panel">
            <h2>{t('develop.manageProject')}</h2>
            <div className="dev-actions">
              {!p.published && (
                <button
                  className="dev-button"
                  disabled={busy}
                  onClick={() => act('/publish', {})}
                >
                  {t('develop.publish')}
                </button>
              )}
              <button
                className="dev-button dev-button--secondary"
                onClick={() => setEditing(!editing)}
              >
                {t('develop.editTerms')}
              </button>
            </div>
            {editing && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!Object.keys(validateDevelopment(terms)).length)
                    act('', { ...p, terms }, 'PATCH')
                  else setError('invalidTerms')
                }}
              >
                <DevelopmentFields
                  value={terms}
                  onChange={setTerms}
                  currency={p.currency}
                />
                <button className="dev-button" disabled={busy}>
                  {t('develop.save')}
                </button>
              </form>
            )}
            {nextStage && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  act('/stage', { stage: nextStage, note })
                }}
              >
                <label>
                  {t('develop.evidence')}
                  <textarea
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button className="dev-button" disabled={busy}>
                  {t('develop.nextStage')}: {t(`develop.stage_${nextStage}`)}
                </button>
              </form>
            )}
            {p.stage === 'fundraising' && !p.funded && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  act('/funding', { amount: p.terms.requiredCapital, reference })
                }}
              >
                <h3>{t('develop.recordFunding')}</h3>
                <p>{t('develop.fundingNote')}</p>
                <div className="dev-form-grid">
                  <label>
                    {t('develop.amount')} ({p.currency})
                    <input readOnly value={fmt(p.terms.requiredCapital)} />
                  </label>
                  <label>
                    {t('develop.reference')}
                    <input
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </label>
                </div>
                <button className="dev-button" disabled={busy}>
                  {t('develop.save')}
                </button>
              </form>
            )}
          </section>
          <DealAnalytics
            assetKey={`development:${p.id}`}
            currency={p.currency}
          />
        </>
      )}
      {canApply && (
        <>
          <div className="dev-project-action-bar">
            <div>
              <span>{t('develop.preferredReturn')}</span>
              <strong>{p.terms.preferredReturn}%</strong>
            </div>
            <button
              type="button"
              className="dev-button"
              aria-haspopup="dialog"
              onClick={openInterest}
            >
              {t('develop.expressInterest')}
              <ArrowUpRight size={18} />
            </button>
          </div>
          <AuctionBidDrawer
            isOpen={interestOpen}
            onClose={() => setInterestOpen(false)}
            title={t('develop.expressInterest')}
            contextAnchorSelector=".dev-project-hero"
          >
            <div className="dev-feature dev-interest-drawer">
              <div className="dev-interest-drawer__project">
                <strong>{p.title}</strong>
                <span>
                  {p.terms.preferredReturn}% · {p.terms.termMonths}{' '}
                  {t('develop.months')}
                </span>
              </div>
              {message === 'interestSaved' ? (
                <p className="dev-notice" role="status">
                  {t('develop.interestSaved')}
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    act('/interest', { amount: p.terms.requiredCapital })
                  }}
                >
                  <DealError error={error} />
                  <label>
                    {t('develop.interestAmount')} ({p.currency})
                    <input readOnly value={fmt(p.terms.requiredCapital)} />
                  </label>
                  <button className="dev-button" disabled={busy}>
                    {t('develop.expressInterest')}
                  </button>
                  <p className="dev-muted">{t('develop.interestNote')}</p>
                  <Link to="/buyer-passport" tabIndex={0}>
                    {t('develop.completePassport')}
                  </Link>
                </form>
              )}
            </div>
          </AuctionBidDrawer>
        </>
      )}
    </>
  )
}
