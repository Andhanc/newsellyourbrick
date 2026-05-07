import { AuctionShowcaseSkeletonStrip } from './AuctionShowcaseSkeletonStrip'
import './MainPageSuspenseFallback.css'

/**
 * Пока грузится нижняя часть главной: ленты карточек как у витрины аукциона.
 * belowHero — сразу под блоком «Подборка недвижимости» (компактные отступы).
 */
export function MainPageSuspenseFallback({ belowHero = false }) {
  const shellStyle = belowHero
    ? {
        background: 'transparent',
        minHeight: 0,
        paddingTop: 'clamp(8px, 1.5vw, 20px)',
        paddingBottom: 36,
      }
    : {
        background: '#fafafa',
        minHeight: '50vh',
        paddingBottom: 48,
      }

  return (
    <div className="main-page-suspense-fallback" style={shellStyle}>
      <section className="section section--recommended" style={{ paddingTop: belowHero ? 0 : 24 }}>
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
