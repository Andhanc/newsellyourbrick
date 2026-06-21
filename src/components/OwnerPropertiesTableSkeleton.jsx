import '../styles/owner-cabinet-skeleton.css'

export default function OwnerPropertiesTableSkeleton({ rowCount = 5 }) {
  return (
    <div className="owner-cab-skel-properties" aria-busy="true">
      <div className="owner-cab-skel-table-head owner-cab-skel-table-row op-desktop-only" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={`head-${i}`} className="owner-cab-skel-line owner-cab-skel-line--sm" />
        ))}
      </div>
      <div className="op-desktop-only" aria-hidden="true">
        {Array.from({ length: rowCount }, (_, i) => (
          <div key={`row-${i}`} className="owner-cab-skel-table-row">
            <div className="owner-cab-skel-row">
              <span className="owner-cab-skel-block owner-cab-skel-thumb" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="owner-cab-skel-line owner-cab-skel-line--lg" />
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
              </div>
            </div>
            <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
            <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
            <span className="owner-cab-skel-line owner-cab-skel-line--md" />
            <span className="owner-cab-skel-line owner-cab-skel-line--xs" />
            <span className="owner-cab-skel-line owner-cab-skel-line--md" />
          </div>
        ))}
      </div>
      <div className="owner-cab-skel-properties__cards op-mobile-only" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={`card-${i}`} className="owner-cab-skel-card owner-cab-skel-properties__card">
            <span className="owner-cab-skel-block owner-cab-skel-properties__cover" />
            <span className="owner-cab-skel-line owner-cab-skel-line--lg" />
            <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
            <div className="owner-cab-skel-row" style={{ marginTop: 8 }}>
              <span className="owner-cab-skel-line owner-cab-skel-line--xs" />
              <span className="owner-cab-skel-line owner-cab-skel-line--xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
