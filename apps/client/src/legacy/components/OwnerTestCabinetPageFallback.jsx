import '../styles/owner-cabinet-skeleton.css'
import './OwnerTestCabinetPageFallback.css'

/** Instant shell while /owner-test lazy chunk loads — matches cabinet background, not blank white */
export default function OwnerTestCabinetPageFallback() {
  return (
    <div className="owner-cab-fallback" role="status" aria-live="polite">
      <span className="owner-cab-fallback__sr">Загрузка кабинета</span>
      <aside className="owner-cab-fallback__sidebar owner-cab-fallback__desktop-only" aria-hidden="true">
        <span className="owner-cab-skel-line owner-cab-skel-line--lg" />
        <div className="owner-cab-fallback__nav">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={`nav-${i}`} className="owner-cab-skel-line owner-cab-skel-line--md" />
          ))}
        </div>
      </aside>
      <div className="owner-cab-fallback__stage">
        <div className="owner-cab-fallback__mobbar owner-cab-fallback__mobile-only" aria-hidden="true">
          <span className="owner-cab-skel-line owner-cab-skel-line--md" />
        </div>
        <div className="owner-cab-fallback__hero owner-cab-skel-block" aria-hidden="true" />
        <div className="owner-cab-fallback__metrics" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={`metric-${i}`} className="owner-cab-skel-card owner-cab-fallback__metric">
              <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
              <span className="owner-cab-skel-line owner-cab-skel-line--xl" />
              <span className="owner-cab-skel-block owner-cab-skel-spark" />
            </div>
          ))}
        </div>
        <div className="owner-cab-skel-block owner-cab-fallback__chart" aria-hidden="true" />
      </div>
    </div>
  )
}
