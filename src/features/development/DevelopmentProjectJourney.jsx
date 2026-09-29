import { useTranslation } from 'react-i18next'
import { publicAsset } from '../../utils/publicAsset'
import DevelopmentStageProgress from './DevelopmentStageProgress'
import './DevelopmentProjectJourney.css'

export default function DevelopmentProjectJourney({ project }) {
  const { t } = useTranslation()
  return (
    <section
      id="development-journey"
      className="dev-project-journey"
      aria-label={t('develop.projectJourney')}
      style={{ '--dev-pool-image': `url("${publicAsset('images/development/pool-flamingo-v1.webp')}")` }}
    >
      <div className="dev-project-journey__license">
        <h2>{t('develop.license')}</h2>
        <p>{project.terms.license || t('develop.unknown')}</p>
      </div>
      <DevelopmentStageProgress stage={project.stage} />
    </section>
  )
}
