import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import { DEVELOPMENT_STAGES } from '../../utils/developmentFinance'
import './DevelopmentStageProgress.css'

export default function DevelopmentStageProgress({ stage }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const detailsId = useId()
  const index = DEVELOPMENT_STAGES.indexOf(stage)
  if (index < 0) return null
  const next = DEVELOPMENT_STAGES[index + 1]
  const count = DEVELOPMENT_STAGES.length
  return (
    <section className="dev-stage-ticket" aria-label={t('develop.projectJourney')}>
      <div className="dev-stage-ticket__current">
        <h2>{t('develop.currentStage')}</h2>
        <span className="dev-stage-ticket__badge dev-stage-ticket__badge--filled">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          {next ? null : <Check size={16} aria-hidden="true" />}
        </span>
        <p className="dev-stage-ticket__stage">{t(`develop.stage_${stage}`)}</p>
        <div className="dev-stage-ticket__footer">
          <p>{t('develop.stageCount', { current: index + 1, total: count })}</p>
          <button
            className="dev-stage-ticket__toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
          >
            {t(expanded ? 'develop.hideStageDetails' : 'develop.showStageDetails')}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="dev-stage-ticket__next">
        <h2>{t(next ? 'develop.upcomingStage' : 'develop.journeyComplete')}</h2>
        <span className="dev-stage-ticket__badge dev-stage-ticket__badge--outline">
          {t(`develop.stage_${next || stage}`)}
        </span>
        <p className="dev-stage-ticket__description">{t(`develop.journeyHint_${stage}`)}</p>
        <div className="dev-stage-ticket__scale">
          <ol className="dev-stage-ticket__steps" style={{ '--stage-progress': index / (count - 1) }}>
            {DEVELOPMENT_STAGES.map((item, position) => (
              <li
                key={item}
                className={`${position <= index ? 'is-reached' : ''}${position === index ? ' is-current' : ''}`}
                aria-current={position === index ? 'step' : undefined}
                aria-label={t(`develop.stage_${item}`)}
                title={t(`develop.stage_${item}`)}
              >
                <span className="dev-stage-ticket__step-number">{String(position + 1).padStart(2, '0')}</span>
                <span className="dev-stage-ticket__dot" aria-hidden="true" />
              </li>
            ))}
          </ol>
          <div className="dev-stage-ticket__scale-labels" aria-hidden="true">
            <span>{t('develop.stage_land')}</span>
            <ArrowRight size={24} />
            <span>{t('develop.stage_returned')}</span>
          </div>
        </div>
      </div>
      <div id={detailsId} className="dev-stage-ticket__details" hidden={!expanded}>
        <ol className="dev-stage-ticket__detail-list">
          {DEVELOPMENT_STAGES.map((item, position) => (
            <li key={item} className={position === index ? 'is-current' : ''} aria-current={position === index ? 'step' : undefined}>
              <span className="dev-stage-ticket__detail-number" aria-hidden="true">
                {position < index ? <Check size={18} /> : String(position + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="dev-stage-ticket__detail-heading">
                  <h3>{t(`develop.stage_${item}`)}</h3>
                  <span>{t(position < index ? 'develop.stageCompleted' : position === index ? 'develop.currentStage' : 'develop.stageUpcoming')}</span>
                </div>
                <p>{t(`develop.stageDetail_${item}`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
