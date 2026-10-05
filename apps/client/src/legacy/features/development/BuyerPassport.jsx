import useDealSession from './useDealSession'
import Header from '../../components/Header'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { dealApi } from './api'
import { DealError } from './DevelopmentPages'
import { useDealFormat } from './DevelopmentFields'
import './development.css'
export default function BuyerPassport() {
  const session = useDealSession()
  const { t } = useTranslation(),
    fmt = useDealFormat('EUR')
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    setData(null)
    setError('')
    dealApi('/passport')
      .then((d) => {
        if (live)
          setData({
            investor_type: 'individual',
            payment_method: 'bank',
            readiness: 'exploring',
            declared_capital: 0,
            average_ticket: 0,
            past_deals: 0,
            share_with_sellers: false,
            ...d,
          })
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
    return () => {
      live = false
    }
  }, [session])
  const update = (key, value) => {
    setData((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setData(await dealApi('/passport', { method: 'PUT', body: data }))
      setSaved(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Header />
      <main className="dev-feature dev-page">
        <Link to="/development">← DEVELOP</Link>
        <header className="dev-hero">
          <span className="dev-eyebrow">SELL YOUR BRICK</span>
          <h1>Buyer Passport</h1>
          <p>{t('develop.passportIntro')}</p>
        </header>
        <DealError error={error} />
        {data && (
          <form onSubmit={save} className="dev-panel">
            <h2>{data.name}</h2>
            <p>
              {data.country || t('develop.unknown')} ·{' '}
              {t(data.identityVerified ? 'develop.identityVerified' : 'develop.identityPending')}
            </p>
            <p>
              {t('develop.verifiedCapital')}: <strong>{fmt(data.verifiedCapital)}</strong>
            </p>
            <p className="dev-muted">{t('develop.capitalSource')}</p>
            <div className="dev-form-grid">
              {[
                ['investor_type', ['individual', 'professional', 'fund', 'developer']],
                ['payment_method', ['bank', 'mortgage', 'mixed']],
                ['readiness', ['exploring', 'ready', 'reserved']],
              ].map(([key, values]) => (
                <label key={key}>
                  {t(`develop.${key}`)}
                  <select value={data[key]} onChange={(e) => update(key, e.target.value)}>
                    {values.map((v) => (
                      <option key={v} value={v}>
                        {t(`develop.option_${v}`)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {['declared_capital', 'average_ticket', 'past_deals'].map((k) => (
                <label key={k}>
                  {t(`develop.${k}`)}
                  {k === 'past_deals' ? '' : ' (EUR)'}
                  <input
                    type="number"
                    min="0"
                    max={k === 'past_deals' ? 100000 : 1e10}
                    step={k === 'past_deals' ? 1 : 0.01}
                    required
                    value={data[k]}
                    onChange={(e) => update(k, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <p className="dev-muted">{t('develop.selfDeclared')}</p>
            <label className="dev-check">
              <input
                type="checkbox"
                checked={data.share_with_sellers}
                onChange={(e) => update('share_with_sellers', e.target.checked)}
              />
              {t('develop.shareConsent')}
            </label>
            <button className="dev-button" disabled={busy}>
              {t('develop.save')}
            </button>
            {saved && <p role="status">{t('develop.saved')}</p>}
          </form>
        )}
      </main>
    </>
  )
}
