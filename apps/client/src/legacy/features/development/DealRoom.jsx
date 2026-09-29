import { requestOpenLoginModal } from '../../utils/requestOpenLoginModal'
import useDealSession from './useDealSession'
import Header from '../../components/Header'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DEAL_MODELS, calculateInvestment } from '../../utils/developmentFinance'
import { getUserData } from '../../services/authService'
import { dealApi, recordDealView } from './api'
import { SellerGoalSelector, useDealFormat } from './DevelopmentFields'
import './development.css'
const NUMBERS = [
  'marketPrice',
  'dealPrice',
  'renovation',
  'taxes',
  'annualRent',
  'annualCosts',
  'resale',
  'saleCosts',
  'termMonths',
  'targetRoi',
]
const DILIGENCE = ['legalRisks', 'titleStatus', 'occupancy', 'zoning', 'comparables']
function ErrorMessage({ error }) {
  const { t } = useTranslation()
  return (
    error && (
      <div className="dev-error" role="alert">
        <p>{t(`develop.${error}`, { defaultValue: t('develop.serverError') })}</p>
        {error === 'loginRequired' && (
          <button className="dev-button" onClick={() => requestOpenLoginModal()}>
            {t('login')}
          </button>
        )}
      </div>
    )
  )
}
export function DealAnalytics({ assetKey, currency = 'EUR' }) {
  const { t } = useTranslation(),
    euro = useDealFormat('EUR'),
    [data, setData] = useState(null),
    [error, setError] = useState('')
  const fmt = useDealFormat(data?.currency || currency)
  useEffect(() => {
    let live = true,
      timer
    const load = async () => {
      try {
        const d = await dealApi(`/analytics/${encodeURIComponent(assetKey)}`)
        if (live) {
          setData(d)
          setError('')
        }
      } catch (e) {
        if (live) setError(e.message)
      } finally {
        if (live) timer = setTimeout(load, 10000)
      }
    }
    load()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [assetKey])
  return (
    <section className="dev-feature dev-panel">
      <h2>{t('develop.liveAnalytics')}</h2>
      <p className="dev-muted">
        {t('develop.liveNote')}
        {data && ` · ${new Date(data.asOf).toLocaleTimeString()}`}
      </p>
      <ErrorMessage error={error} />
      {data && (
        <>
          <dl className="dev-metrics">
            {['views', 'uniqueVisitors', 'verifiedBuyers', 'bidders', 'offers', 'interests'].map(
              (k) => (
                <div key={k}>
                  <dt>{t(`develop.${k}`)}</dt>
                  <dd>{data[k]}</dd>
                </div>
              ),
            )}
            <div>
              <dt>{t('develop.average')}</dt>
              <dd>{fmt(data.average)}</dd>
            </div>
            <div>
              <dt>{t('develop.maximum')}</dt>
              <dd>{fmt(data.maximum)}</dd>
            </div>
            <div>
              <dt>{t('develop.conversion')}</dt>
              <dd>{data.conversion.toFixed(1)}%</dd>
            </div>
          </dl>
          <h3>{t('develop.geography')}</h3>
          <p>
            {Object.entries(data.geography)
              .map(([k, v]) => `${k === 'unknown' ? t('develop.unknown') : k}: ${v}`)
              .join(' · ') || t('develop.emptyData')}
          </p>
          <h3>{t('develop.forecast')}</h3>
          <p>
            {data.forecast
              ? `${fmt(data.forecast.low)} – ${fmt(data.forecast.high)} (${data.forecast.sample})`
              : t('develop.insufficientData')}
          </p>
          <p className="dev-muted">{t('develop.forecastMethod')}</p>
          <h3>{t('develop.offers')}</h3>
          {data.offersList?.map((o) => (
            <p key={o.id}>
              {o.name || t('develop.unknown')} · {fmt(o.amount)} · {new Date(o.at).toLocaleString()}
            </p>
          ))}
          <h3>Buyer Passport</h3>
          {!data.buyers.length && <p>{t('develop.noSharedPassports')}</p>}
          <div className="dev-card-grid">
            {data.buyers.map((b) => (
              <article key={b.user_id} className="dev-buyer">
                <h4>{b.name}</h4>
                <p>
                  {b.country || t('develop.unknown')} · {t(`develop.option_${b.investor_type}`)}
                </p>
                <p>
                  {t(b.identityVerified ? 'develop.identityVerified' : 'develop.identityPending')}
                </p>
                <p>
                  {t('develop.verifiedCapital')}: <strong>{euro(b.verifiedCapital)}</strong>
                </p>
                <p>
                  {t('develop.declared_capital')}: {euro(b.declared_capital)}
                </p>
                <p>
                  {t('develop.average_ticket')}: {euro(b.average_ticket)} ·{' '}
                  {t('develop.past_deals')}: {b.past_deals}
                </p>
                <p>
                  {t('develop.interestAmount')}: {fmt(b.proposedInvestment)}
                </p>
                <p>
                  {t('develop.maximum')}: {fmt(b.highestBid)}
                </p>
                <p>
                  {t('develop.offerAmount')}: {fmt(b.latestOffer)}
                </p>
                <p>
                  {t(`develop.option_${b.payment_method}`)} · {t(`develop.option_${b.readiness}`)}
                </p>
              </article>
            ))}
          </div>
          {data.truncated && <p>{t('develop.truncated')}</p>}
        </>
      )}
    </section>
  )
}
export function InvestmentDecision({ property, onOpenAi }) {
  const table =
    property.source_table ||
    property.property_table ||
    (['house', 'villa'].includes(property.property_type || property.propertyType)
      ? 'properties_houses'
      : 'properties_apartments')
  if (!Number.isInteger(Number(property.id)) || Number(property.id) <= 0) return null
  return <AssetDecision table={table} id={property.id} property={property} onOpenAi={onOpenAi} />
}
function AssetDecision({ table, id, property = {}, editable = false, onOpenAi }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    [offer, setOffer] = useState(''),
    [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({
    seller_goal: 'maximum',
    current_model: 'auction',
    decision: {},
    exits: {},
    reason: '',
  })
  const fmt = useDealFormat(data?.currency || property.currency || 'EUR')
  const session = useDealSession()
  const assetKey = `${table}:${id}`
  useEffect(() => {
    let live = true
    setData(null)
    setError('')
    dealApi(`/assets/${table}/${id}`)
      .then((d) => {
        if (live) {
          setData(d)
          setDraft({
            seller_goal: 'maximum',
            current_model: 'auction',
            decision: {},
            exits: {},
            reason: '',
            ...d.profile,
          })
        }
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
    if (!editable) recordDealView(assetKey).catch(() => {})
    return () => {
      live = false
    }
  }, [table, id, editable, session])
  const localUser = getUserData(),
    owner = data && Number(localUser?.id || localUser?.userId) === data.owner_id
  const decision = editable ? draft.decision : data?.profile?.decision || {}
  const calc = calculateInvestment(decision)
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const profile = await dealApi(`/assets/${table}/${id}`, { method: 'PUT', body: draft })
      setData((d) => ({ ...d, profile }))
      setSaved(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="dev-feature dev-panel">
      <h2>{t('develop.investmentDecision')}</h2>
      <p className="dev-muted">{t('develop.decisionNote')}</p>
      <ErrorMessage error={error} />
      <dl className="dev-metrics">
        {[
          'marketPrice',
          'dealPrice',
          'renovation',
          'taxes',
          'annualRent',
          'annualCosts',
          'resale',
        ].map((k) => (
          <div key={k}>
            <dt>{t(`develop.${k}`)}</dt>
            <dd>{fmt(decision[k])}</dd>
          </div>
        ))}
        {['discount', 'netYield', 'roi', 'irr', 'maxBid'].map((k) => (
          <div key={k}>
            <dt>{t(`develop.${k}`)}</dt>
            <dd>
              {calc[k] == null ? '—' : k === 'maxBid' ? fmt(calc[k]) : `${calc[k].toFixed(2)}%`}
            </dd>
          </div>
        ))}
      </dl>
      <p className="dev-muted">{t('develop.decisionFormula')}</p>
      <dl className="dev-diligence">
        {DILIGENCE.map((k) => (
          <div key={k}>
            <dt>{t(`develop.${k}`)}</dt>
            <dd>{decision[k] || t('develop.unknown')}</dd>
          </div>
        ))}
      </dl>
      <p>
        {t('develop.aiAssessment')}: {t('develop.aiNote')}
      </p>
      {onOpenAi && (
        <button className="dev-button dev-button--secondary" onClick={onOpenAi}>
          {t('develop.aiAssessment')}
        </button>
      )}
      <h3>{t('develop.exitOptions')}</h3>
      <p className="dev-muted">{t('develop.exitNote')}</p>
      <div className="dev-exits">
        {DEAL_MODELS.filter((k) => k !== 'distressed').map((k) => (
          <div key={k}>
            <span>{t(`develop.model_${k}`)}</span>
            <strong>{fmt((editable ? draft.exits : data?.profile?.exits)?.[k])}</strong>
          </div>
        ))}
      </div>
      {data?.development && (
        <Link className="dev-button" to={`/development/${data.development.slug}`}>
          {t('develop.openProject')}
        </Link>
      )}
      {owner && !editable && (
        <Link className="dev-button" to={`/deal-room/${table}/${id}`}>
          {t('develop.manageAsset')}
        </Link>
      )}
      {editable && owner && (
        <form onSubmit={save}>
          <SellerGoalSelector
            value={draft.seller_goal}
            onChange={(v) => setDraft({ ...draft, seller_goal: v })}
          />
          <label>
            {t('develop.currentModel')}
            <select
              value={draft.current_model}
              onChange={(e) => setDraft({ ...draft, current_model: e.target.value })}
            >
              {DEAL_MODELS.map((k) => (
                <option key={k} value={k}>
                  {t(`develop.model_${k}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="dev-muted">{t('develop.modelNote')}</p>
          <label>
            {t('develop.evidence')}
            <textarea
              required={!data?.profile?.id || draft.current_model !== data?.profile.current_model}
              value={draft.reason || ''}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            />
          </label>
          <div className="dev-form-grid">
            {NUMBERS.map((k) => (
              <label key={k}>
                {t(`develop.${k}`)}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={draft.decision[k] ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, decision: { ...draft.decision, [k]: e.target.value } })
                  }
                />
              </label>
            ))}
          </div>
          {DILIGENCE.map((k) => (
            <label key={k}>
              {t(`develop.${k}`)}
              <textarea
                value={draft.decision[k] || ''}
                onChange={(e) =>
                  setDraft({ ...draft, decision: { ...draft.decision, [k]: e.target.value } })
                }
              />
            </label>
          ))}
          <h3>{t('develop.exitOptions')}</h3>
          <div className="dev-form-grid">
            {DEAL_MODELS.filter((k) => k !== 'distressed').map((k) => (
              <label key={k}>
                {t(`develop.model_${k}`)}
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.exits[k] ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, exits: { ...draft.exits, [k]: e.target.value } })
                  }
                />
              </label>
            ))}
          </div>
          <button className="dev-button" disabled={busy}>
            {t('develop.save')}
          </button>
          <Link
            className="dev-button dev-button--secondary"
            to={`/owner-test/add-property?model=development&source_table=${table}&source_id=${id}`}
          >
            {t('develop.createLinkedProject')}
          </Link>
        </form>
      )}
      {!owner && !editable && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            try {
              await dealApi(`/events/${encodeURIComponent(assetKey)}`, {
                method: 'POST',
                body: { kind: 'offer', amount: offer },
              })
              setSaved(true)
            } catch (e) {
              setError(e.message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <label>
            {t('develop.offerAmount')}
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />
          </label>
          <button className="dev-button" disabled={busy}>
            {t('develop.sendOffer')}
          </button>
          <p className="dev-muted">{t('develop.offerNote')}</p>
        </form>
      )}
      {saved && <p role="status">{t('develop.saved')}</p>}
      <h3>{t('develop.history')}</h3>
      {data?.profile?.history?.map((h, i) => (
        <p key={i}>
          {new Date(h.at).toLocaleDateString()} · {t(`develop.model_${h.model}`)} — {h.reason}
        </p>
      ))}
    </section>
  )
}
export default function DealRoom() {
  const { table, id } = useParams()
  const { t } = useTranslation()
  return (
    <>
      <Header />
      <main className="dev-feature dev-page">
        <Link to="/owner-test/properties">← {t('develop.myAssets')}</Link>
        <AssetDecision table={table} id={id} editable />
        <DealAnalytics assetKey={`${table}:${id}`} />
      </main>
    </>
  )
}
