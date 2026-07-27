import '../styles/owner-cabinet-skeleton.css'

export default function OwnerPropertyAnalyticsSkeleton() {
  return (
    <div className="opa-body owner-cab-skel-analytics" aria-busy="true">
      <header className="opa-header opa-desktop-only" aria-hidden="true">
        <span className="owner-cab-skel-line owner-cab-skel-line--title" />
      </header>
      <div className="opa-workspace">
        <div className="opa-content">
          <div className="owner-cab-skel-analytics__hero owner-cab-skel-card" aria-hidden="true">
            <span className="owner-cab-skel-block owner-cab-skel-analytics__cover" />
            <div className="owner-cab-skel-analytics__hero-copy">
              <span className="owner-cab-skel-line owner-cab-skel-line--lg" />
              <span className="owner-cab-skel-line owner-cab-skel-line--md" />
              <div className="owner-cab-skel-row" style={{ marginTop: 10, gap: 16 }}>
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
              </div>
            </div>
          </div>
          <div className="owner-cab-skel-analytics__kpis" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={`kpi-${i}`} className="owner-cab-skel-card owner-cab-skel-analytics__kpi">
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
                <span className="owner-cab-skel-line owner-cab-skel-line--xl" />
              </div>
            ))}
          </div>
          <div className="owner-cab-skel-card owner-cab-skel-analytics__chart" aria-hidden="true">
            <span className="owner-cab-skel-line owner-cab-skel-line--title" />
            <span className="owner-cab-skel-block owner-cab-skel-analytics__chart-area" />
          </div>
        </div>
      </div>
    </div>
  )
}
