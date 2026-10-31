import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Check, MapPin, RefreshCw } from 'lucide-react'
import BuyerSheetShell from '../../components/buyer-mobile/BuyerSheetShell'
import { CABINET_HISTORY_UPDATED_EVENT } from '../../constants/cabinetEvents'
import { DEVELOPMENT_STAGES } from '../../utils/developmentFinance'
import { useDealFormat } from './DevelopmentFields'
import { dealApi } from './api'
import './DevelopmentPortfolio.css'

export default function DevelopmentInvestmentDetailDrawer({
  investment,
  onClose,
}) {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const projectId = investment?.projectId
  const project = data?.projectId === projectId ? data : investment
  const fmt = useDealFormat(project?.currency || 'EUR', 2)
  useEffect(() => {
    if (!projectId) return
    let active = true
    setData(null)
    setError('')
    setLoading(true)
    dealApi(`/portfolio/${projectId}`)
      .then((value) => {
        if (active) setData(value)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId, revision])
  const close = () => {
    window.dispatchEvent(new Event(CABINET_HISTORY_UPDATED_EVENT))
    onClose()
  }
  return (
    <BuyerSheetShell
      isOpen={Boolean(investment)}
      onClose={close}
      titleId="development-portfolio-project-title"
      closeLabel={t('closeAria')}
      className="dev-portfolio-sheet dev-portfolio-detail"
    >
      {project && (
        <>
          <div className="dev-portfolio-detail__cover">
            {project.imageSrc && <img src={project.imageSrc} alt="" />}
            <span>{t('develop.portfolioCategory')}</span>
          </div>
          <div className="dev-portfolio-detail__content">
            <span className="dev-portfolio-eyebrow">
              {t('develop.yourPortfolio')}
            </span>
            <h2 id="development-portfolio-project-title">{project.title}</h2>
            <p className="dev-portfolio-detail__location">
              <MapPin size={14} />
              {project.location}
            </p>
            <dl className="dev-portfolio-detail__investment">
              <div>
                <dt>{t('develop.totalInvested')}</dt>
                <dd>{fmt(project.amount)}</dd>
              </div>
              <div>
                <dt>{t('develop.yourOwnership')}</dt>
                <dd>
                  {new Intl.NumberFormat(i18n.language, {
                    maximumFractionDigits: 2,
                  }).format(project.share)}
                  %
                </dd>
              </div>
            </dl>
            <div className="dev-portfolio-detail__status">
              <span>{t('develop.currentStage')}</span>
              <strong>{t(`develop.stage_${project.stage}`)}</strong>
              <button
                type="button"
                disabled={loading}
                aria-label={t('develop.refreshInvestment')}
                onClick={() => setRevision((v) => v + 1)}
              >
                <RefreshCw
                  size={17}
                  className={loading ? 'dev-portfolio-spin' : ''}
                />
              </button>
            </div>
            {error ? (
              <div className="dev-portfolio-error" role="alert">
                <p>
                  {t(`develop.${error}`, {
                    defaultValue: t('develop.serverError'),
                  })}
                </p>
                <button type="button" onClick={() => setRevision((v) => v + 1)}>
                  {t('develop.retryInvestors')}
                </button>
              </div>
            ) : (
              <>
                <p className="dev-portfolio-detail__stage-note">
                  {t('develop.stageUpdatedByOwner')}
                </p>
                <ol
                  className="dev-portfolio-timeline"
                  aria-label={t('develop.projectJourney')}
                >
                  {DEVELOPMENT_STAGES.map((stage, index) => {
                    const current = DEVELOPMENT_STAGES.indexOf(project.stage)
                    const reached = index < current
                    const entry = project.history?.find(
                      (item) => item.stage === stage,
                    )
                    const date = entry?.at ? new Date(entry.at) : null
                    return (
                      <li
                        key={stage}
                        className={
                          index === current
                            ? 'is-current'
                            : reached
                              ? 'is-complete'
                              : ''
                        }
                        aria-current={index === current ? 'step' : undefined}
                      >
                        <span
                          className="dev-portfolio-timeline__number"
                          aria-hidden="true"
                        >
                          {reached ? (
                            <Check size={16} />
                          ) : (
                            String(index + 1).padStart(2, '0')
                          )}
                        </span>
                        <div>
                          <strong>{t(`develop.stage_${stage}`)}</strong>
                          <small>
                            {t(
                              index === current
                                ? 'develop.currentStage'
                                : reached
                                  ? 'develop.stageCompleted'
                                  : 'develop.stageUpcoming',
                            )}
                            {date && Number.isFinite(date.getTime())
                              ? ` · ${new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(date)}`
                              : ''}
                          </small>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </>
            )}
            {project.published && (
              <Link
                to={`/development/${encodeURIComponent(project.slug)}`}
                className="dev-portfolio-primary btn-tiffany-shine"
                onClick={close}
              >
                {t('develop.openProject')}
                <ArrowUpRight size={20} />
              </Link>
            )}
          </div>
        </>
      )}
    </BuyerSheetShell>
  )
}
