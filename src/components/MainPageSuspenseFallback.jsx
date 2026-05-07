import { AuctionShowcaseSkeletonStrip } from './AuctionShowcaseSkeletonStrip'
import './MainPageSuspenseFallback.css'

/**
 * Пока грузится чанк MainPage: лента карточек как у витрины аукциона (.auction-showcase-card).
 */
export function MainPageSuspenseFallback() {
  return (
    <div
      className="main-page-suspense-fallback"
      style={{
        background: '#fafafa',
        minHeight: '50vh',
        paddingBottom: 48,
      }}
    >
      <section className="section section--recommended" style={{ paddingTop: 24 }}>
        <div className="section__header" style={{ padding: '0 16px', maxWidth: 1400, margin: '0 auto' }}>
          <div className="main-page-suspense-fallback__title-skel" aria-hidden />
        </div>
        <div style={{ padding: '0 16px', maxWidth: 1400, margin: '0 auto' }}>
          <AuctionShowcaseSkeletonStrip count={6} />
        </div>
      </section>
      <section className="section section--spaced" style={{ marginTop: 8 }}>
        <div className="section__header" style={{ padding: '0 16px', maxWidth: 1400, margin: '0 auto' }}>
          <div
            className="main-page-suspense-fallback__title-skel main-page-suspense-fallback__title-skel--narrow"
            aria-hidden
          />
        </div>
        <div style={{ padding: '0 16px', maxWidth: 1400, margin: '0 auto' }}>
          <AuctionShowcaseSkeletonStrip count={6} />
        </div>
      </section>
    </div>
  )
}
