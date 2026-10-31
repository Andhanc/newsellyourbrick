import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpRight,
  CreditCard,
  Globe2,
  LoaderCircle,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import AuctionBidDrawer from '../../components/AuctionBidDrawer'
import { publicAsset } from '../../utils/publicAsset'
import { flagEmojiForStoredCountry } from '../../utils/countryFlagFromStored'
import { requestOpenLoginModal } from '../../utils/requestOpenLoginModal'
import { invalidateUserDepositCache } from '../../utils/depositApi'
import { getApiBaseUrlSync } from '../../utils/apiConfig'
import { getUserData } from '../../services/authService'
import useDealSession from './useDealSession'
import { useDealFormat } from './DevelopmentFields'
import { dealApi } from './api'
import {
  investmentPayment,
  investmentShare,
  parseInvestmentAmount,
  toCents,
} from './investmentMath'
import { CABINET_HISTORY_UPDATED_EVENT } from '../../constants/cabinetEvents'
import './DevelopmentInvestmentDrawer.css'

export default function DevelopmentInvestmentDrawer({
  project,
  isOpen,
  onClose,
  canInvest,
  onChange,
  onInvested,
}) {
  const { t, i18n } = useTranslation()
  const fmt = useDealFormat(project.currency)
  const euro = useDealFormat('EUR')
  const session = useDealSession()
  const [tab, setTab] = useState('collection')
  const [amount, setAmount] = useState('')
  const [useDeposit, setUseDeposit] = useState(false)
  const [wallet, setWallet] = useState(null)
  const [investors, setInvestors] = useState(null)
  const [listError, setListError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const requestId = useRef(null)
  const returnStarted = useRef(false)
  const capital = Number(project.terms.requiredCapital)
  const funded = Number(project.funded || 0)
  const remaining = Math.max(0, toCents(capital) - toCents(funded)) / 100
  const value = parseInvestmentAmount(amount)
  const percent = (n) =>
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(n)
  const share = investmentShare(value || 0, capital)
  const progress = Math.max(0, Math.min(100, investmentShare(funded, capital)))
  const payment = investmentPayment(
    value || 0,
    wallet?.balanceEur,
    useDeposit,
    wallet?.eurRate || 1,
  )
  const currencySymbol = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: project.currency,
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value

  useEffect(() => {
    if (!isOpen) return
    setTab(canInvest ? 'collection' : 'investors')
    setError('')
    setAmount('')
    setUseDeposit(false)
    requestId.current = null
  }, [isOpen, project.id])
  useEffect(() => {
    if (!isOpen) return
    let active = true
    setInvestors(null)
    setListError('')
    dealApi(`/projects/${project.id}/investors`)
      .then((rows) => {
        if (active) setInvestors(rows)
      })
      .catch((e) => {
        if (active) setListError(e.message)
      })
    return () => {
      active = false
    }
  }, [isOpen, project.id, retry, funded])
  useEffect(() => {
    if (!isOpen) return
    let active = true
    setWallet(null)
    setUseDeposit(false)
    if (session)
      dealApi(`/projects/${project.id}/investment-wallet`)
        .then((data) => {
          if (active) setWallet(data)
        })
        .catch(() => {})
    return () => {
      active = false
    }
  }, [isOpen, project.id, session, funded])

  const completed = async (paymentResult) => {
    const updated = await dealApi(`/projects/${project.id}`)
    onChange(updated)
    const user = getUserData()
    invalidateUserDepositCache(getApiBaseUrlSync(), user?.id || user?.userId)
    setAmount('')
    setUseDeposit(false)
    setTab('collection')
    window.dispatchEvent(
      new CustomEvent(CABINET_HISTORY_UPDATED_EVENT, {
        detail: { userId: user?.id || user?.userId },
      }),
    )
    onInvested({ ...paymentResult, project: updated })
    requestId.current = null
    setRetry((n) => n + 1)
  }
  useEffect(() => {
    if (!isOpen || !session || returnStarted.current) return
    const params = new URLSearchParams(window.location.search)
    const result = params.get('development_payment')
    const sessionId = params.get('session_id')
    if (!result || !sessionId) return
    returnStarted.current = true
    setBusy(true)
    dealApi(`/projects/${project.id}/investment-confirm`, {
      method: 'POST',
      body: { sessionId, cancel: result === 'cancel' },
    })
      .then(async (data) => {
        if (data.status === 'paid') await completed(data)
        else
          setError(
            data.status === 'cancelled'
              ? 'investmentCancelled'
              : 'paymentPending',
          )
        if (data.status === 'pending') return
        params.delete('development_payment')
        params.delete('session_id')
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`,
        )
      })
      .catch((e) => {
        setError(e.message)
        returnStarted.current = false
      })
      .finally(() => setBusy(false))
  }, [isOpen, session, project.id, retry])

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    if (!session) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    if (!value || value > remaining) {
      setError('investmentAmountError')
      return
    }
    setBusy(true)
    setError('')
    requestId.current ||= crypto.randomUUID()
    try {
      const result = await dealApi(`/projects/${project.id}/invest`, {
        method: 'POST',
        body: {
          amount: value,
          useDeposit,
          requestId: requestId.current,
          expectedPayment: payment,
        },
      })
      if (result.status === 'paid') await completed(result)
      else {
        const url = new URL(result.url)
        if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com')
          throw new Error('paymentUnavailable')
        window.location.assign(url.href)
      }
    } catch (e) {
      setError(e.message)
      if (session)
        dealApi(`/projects/${project.id}/investment-wallet`)
          .then(setWallet)
          .catch(() => {})
    } finally {
      setBusy(false)
    }
  }
  const changeAmount = (next) => {
    setAmount(next)
    setError('')
    requestId.current = null
  }
  const errorBlock = (key) =>
    key && (
      <p className="dev-invest__error" role="alert">
        {t(`develop.${key}`, { defaultValue: t('develop.serverError') })}
      </p>
    )
  return (
    <AuctionBidDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('develop.investNow')}
    >
      <div className="dev-invest">
        <div className="dev-invest__heading" aria-hidden="true" />
        <section
          className="dev-invest__hero"
          aria-label={t('develop.fundraisingProgress')}
        >
          <div className="dev-invest__hero-copy">
            <span className="dev-invest__eyebrow">
              {t('develop.yourNextInvestment')}
            </span>
            <h3>{project.title}</h3>
            <strong className="dev-invest__percent">
              {percent(progress)}
              <span>%</span>
            </strong>
          </div>
          <img
            className="dev-invest__villa"
            src={publicAsset(
              'images/development/investment-villa-tiffany-v1.webp',
            )}
            alt=""
          />
          <div
            className="dev-invest__progress"
            role="progressbar"
            aria-label={t('develop.fundraisingProgress')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <dl className="dev-invest__totals">
            <div>
              <dt>{t('develop.collected')}</dt>
              <dd>{fmt(funded)}</dd>
            </div>
            <div>
              <dt>{t('develop.fundingGoal')}</dt>
              <dd>{fmt(capital)}</dd>
            </div>
          </dl>
        </section>
        <section className="dev-invest__sheet">
          <div
            className="dev-invest__tabs"
            role="tablist"
            aria-label={t('develop.investmentTabs')}
          >
            {['collection', 'investors'].map((key, index) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`dev-invest-tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`dev-invest-panel-${key}`}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={(event) => {
                  if (
                    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                      event.key,
                    )
                  )
                    return
                  event.preventDefault()
                  const next =
                    event.key === 'Home'
                      ? 'collection'
                      : event.key === 'End'
                        ? 'investors'
                        : ['collection', 'investors'][1 - index]
                  setTab(next)
                  document.getElementById(`dev-invest-tab-${next}`)?.focus()
                }}
              >
                {t(
                  `develop.${key === 'collection' ? 'collectionTab' : 'investorsTab'}`,
                )}
                {key === 'investors' && investors?.length > 0 && (
                  <span>{investors.length}</span>
                )}
              </button>
            ))}
          </div>
          <div
            key={tab}
            className="dev-invest__content"
            role="tabpanel"
            id={`dev-invest-panel-${tab}`}
            aria-labelledby={`dev-invest-tab-${tab}`}
            tabIndex={0}
          >
            {tab === 'collection' ? (
              <form onSubmit={submit}>
                <div className="dev-invest__intro">
                  <h3>{t('develop.becomePartOfProject')}</h3>
                  <p>{t('develop.chooseInvestmentAmount')}</p>
                </div>
                <label
                  className="dev-invest__amount-label"
                  htmlFor="development-investment-amount"
                >
                  {t('develop.investmentAmount')}
                </label>
                <div
                  className={`dev-invest__amount${error === 'investmentAmountError' ? ' dev-invest__amount--error' : ''}`}
                >
                  <span aria-hidden="true">{currencySymbol}</span>
                  <input
                    id="development-investment-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={amount}
                    disabled={busy || !canInvest}
                    onChange={(event) => changeAmount(event.target.value)}
                    aria-describedby="dev-invest-amount-help"
                    aria-invalid={error === 'investmentAmountError'}
                  />
                </div>
                <div id="dev-invest-amount-help" className="dev-invest__share">
                  <span>{t('develop.yourOwnership')}</span>
                  <strong>{percent(share)}%</strong>
                </div>
                <p className="dev-invest__remaining">
                  {t('develop.availableToInvest', { amount: fmt(remaining) })}
                </p>
                {session && (
                  <label
                    className={`dev-invest__wallet${useDeposit ? ' is-checked' : ''}`}
                  >
                    <Wallet size={22} />
                    <span>
                      <strong>{t('develop.useInvestmentDeposit')}</strong>
                      <small>
                        {wallet
                          ? t('develop.depositAvailable', {
                              amount: euro(wallet.balanceEur),
                            })
                          : t('develop.loadingDeposit')}
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label={t('develop.useInvestmentDeposit')}
                      checked={useDeposit}
                      disabled={busy || !wallet || !(wallet.balanceEur > 0)}
                      onChange={(event) => {
                        setUseDeposit(event.target.checked)
                        requestId.current = null
                      }}
                    />
                    <span className="dev-invest__switch" aria-hidden="true" />
                  </label>
                )}
                {value && (
                  <dl className="dev-invest__payment">
                    <div>
                      <dt>{t('develop.investmentTotal')}</dt>
                      <dd>{fmt(value)}</dd>
                    </div>
                    {useDeposit && (
                      <div>
                        <dt>{t('develop.fromInvestmentDeposit')}</dt>
                        <dd>−{euro(payment.walletEur)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>
                        <CreditCard size={15} />
                        {t('develop.byCard')}
                      </dt>
                      <dd>{fmt(payment.cardAmount)}</dd>
                    </div>
                  </dl>
                )}
                {errorBlock(error)}
                {!canInvest && (
                  <p className="dev-invest__remaining">
                    {t('develop.fundraisingClosed')}
                  </p>
                )}
                {error === 'paymentPending' && (
                  <button
                    type="button"
                    className="dev-invest__retry"
                    onClick={() => {
                      returnStarted.current = false
                      setRetry((n) => n + 1)
                    }}
                  >
                    {t('develop.retryInvestors')}
                  </button>
                )}
                <div className="dev-invest__submit-area">
                  <button
                    type="submit"
                    className="dev-invest__button btn-tiffany-shine"
                    disabled={
                      busy ||
                      !canInvest ||
                      (session && (!value || value > remaining))
                    }
                  >
                    {busy ? (
                      <LoaderCircle size={20} className="dev-invest__spinner" />
                    ) : null}
                    {t(
                      busy
                        ? 'develop.processingInvestment'
                        : !session
                          ? 'develop.loginToInvest'
                          : 'develop.investNow',
                    )}
                    {!busy && <ArrowUpRight size={20} />}
                  </button>
                  <p className="dev-invest__payment-note">
                    {t('develop.investmentPaymentNote')}
                  </p>
                </div>
              </form>
            ) : (
              <>
                <div className="dev-invest__intro">
                  <h3>{t('develop.projectInvestors')}</h3>
                  <p>{t('develop.investorsPrivacyNote')}</p>
                </div>
                {listError ? (
                  <>
                    {errorBlock(listError)}
                    <button
                      type="button"
                      className="dev-invest__retry"
                      onClick={() => setRetry((n) => n + 1)}
                    >
                      {t('develop.retryInvestors')}
                    </button>
                  </>
                ) : investors === null ? (
                  <div className="dev-invest__empty" role="status">
                    <LoaderCircle className="dev-invest__spinner" size={28} />
                    <p>{t('develop.loading')}</p>
                  </div>
                ) : investors.length ? (
                  <>
                    <div className="dev-invest__list-head">
                      <span>{t('develop.investorLabel')}</span>
                      <span>{t('develop.ownershipLabel')}</span>
                    </div>
                    <ul className="dev-invest__list">
                      {investors.map((investor) => (
                        <li key={investor.id}>
                          <span
                            className="dev-invest__flag"
                            aria-label={
                              investor.country || t('develop.unknown')
                            }
                          >
                            {flagEmojiForStoredCountry(investor.country) || (
                              <Globe2 size={23} />
                            )}
                          </span>
                          <span className="dev-invest__identity">
                            <strong>ID {investor.id}</strong>
                            <small>{fmt(investor.amount)}</small>
                          </span>
                          <strong className="dev-invest__ownership">
                            {percent(investor.share)}
                            <span>%</span>
                          </strong>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="dev-invest__empty">
                    <img
                      src={publicAsset(
                        'images/development/investment-community-tiffany-v1.webp',
                      )}
                      alt=""
                    />
                    <h4>{t('develop.noInvestorsYet')}</h4>
                    <p>{t('develop.beFirstInvestor')}</p>
                    {canInvest && (
                      <button
                        type="button"
                        className="dev-invest__button btn-tiffany-shine"
                        onClick={() => setTab('collection')}
                      >
                        {t('develop.investNow')}
                        <ArrowUpRight size={20} />
                      </button>
                    )}
                  </div>
                )}
                <Link
                  className="dev-invest__wallet-link"
                  to="/wallet"
                  tabIndex={0}
                >
                  {t('develop.openInvestmentWallet')}
                  <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </AuctionBidDrawer>
  )
}
