import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import Header from '../components/Header'
import './ShareDetailPage.css'
import './ShareDetailPageSkeleton.css'

export default function ShareDetailPageSkeleton() {
  const navigate = useNavigate()

  return (
    <div className="share-detail-page share-detail-page--skeleton" aria-busy="true">
      <Header />
      <div className="share-detail-page__bg" />
      <div className="share-detail-page__container">
        <button type="button" className="share-detail-page__back" onClick={() => navigate('/shares')}>
          <FiArrowLeft size={20} /> Назад к долевым объектам
        </button>

        <div className="share-detail__layout">
          <div className="share-detail__info">
            <div className="share-detail__hero">
              <div className="share-detail__image-wrap">
                <div className="share-skel-block share-skel-hero" />
              </div>
            </div>
            <div className="share-skel-lines share-skel-lines--pad-title">
              <div className="share-skel-line share-skel-line--title" />
              <div className="share-skel-line share-skel-line--location" />
            </div>
            <div className="share-skel-lines share-skel-lines--pad-text">
              <div className="share-skel-line" />
              <div className="share-skel-line share-skel-line--90" />
              <div className="share-skel-line share-skel-line--70" />
              <div className="share-skel-line share-skel-line--specs" />
            </div>
            <div className="share-detail__prices-block share-skel-prices-block" aria-hidden>
              <div className="share-skel-line share-skel-line--price-row" />
              <div className="share-skel-line share-skel-line--price-row" />
              <div className="share-skel-line share-skel-line--price-row-short" />
            </div>
          </div>

          <div className="share-detail__sidebar">
            <div className="share-detail__chart-section">
              <div className="share-skel-line share-skel-line--chart-title" />
              <div className="share-detail__chart-wrap share-skel-chart-wrap-static">
                <div className="share-skel-pie" />
              </div>
              <div className="share-skel-legend">
                <div className="share-skel-line share-skel-line--legend" />
                <div className="share-skel-line share-skel-line--legend" />
                <div className="share-skel-line share-skel-line--legend-short" />
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
              <div className="share-skel-line share-skel-line--hint" />
              <div className="share-skel-cta" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
