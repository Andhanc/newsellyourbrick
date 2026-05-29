import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import Header from '../components/Header'
import './ShareDetailPage.css'
import './ShareDetailPageSkeleton.css'
import './PropertyDetailClassic.css'

export default function ShareDetailPageSkeleton() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="share-detail-page share-detail-page--skeleton" aria-busy="true">
      <Header />
      <div className="share-detail-page__bg" />
      <div className="share-detail-page__container">
        <button type="button" className="share-detail-page__back" onClick={() => navigate('/shares')}>
          <FiArrowLeft size={20} /> {t('shareDetailBackToShares')}
        </button>

        <div className="share-detail__layout">
          <div className="share-detail__left-column">
            <div className="share-detail__gallery-wrap">
              <div className="share-skel-block share-skel-gallery-main" />
              <div className="share-skel-thumbs">
                <div className="share-skel-thumb" />
                <div className="share-skel-thumb" />
                <div className="share-skel-thumb" />
              </div>
            </div>
            <div className="share-skel-info-block" />
            <div className="share-skel-info-block share-skel-info-block--amenities" />
            <div className="share-skel-info-block share-skel-info-block--short" />
          </div>

          <div className="share-detail__sidebar">
            <div className="share-detail__meta-card share-detail__meta-card--sidebar">
              <div className="share-skel-lines">
                <div className="share-skel-line share-skel-line--title" />
                <div className="share-skel-line" />
                <div className="share-skel-line share-skel-line--90" />
              </div>
            </div>
            <div className="share-detail__chart-section">
              <div className="share-skel-line share-skel-line--chart-title" />
              <div className="share-detail__chart-wrap share-skel-chart-wrap-static">
                <div className="share-skel-pie" />
              </div>
              <div className="share-skel-legend">
                <div className="share-skel-line share-skel-line--legend" />
                <div className="share-skel-line share-skel-line--legend" />
              </div>
            </div>
            <div className="share-detail__buy-block share-skel-buy">
              <div className="share-skel-buy-row">
                <div className="share-skel-line share-skel-line--label" />
                <div className="share-skel-steppers">
                  <div className="share-skel-mini" />
                  <div className="share-skel-line share-skel-line--count" />
                  <div className="share-skel-mini" />
                </div>
              </div>
              <div className="share-skel-cta" />
            </div>
            <div className="share-detail__map-card">
              <div className="share-skel-line share-skel-line--map-title" />
              <div className="share-skel-block share-skel-map" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
