import '../styles/owner-cabinet-skeleton.css'

export default function OwnerTestDriveSplitSkeleton() {
  return (
    <div className="otd-split owner-cab-skel-testdrive" aria-busy="true">
      <section className="otd-split__left" aria-hidden="true">
        <div className="owner-cab-skel-row" style={{ marginBottom: 16 }}>
          <span className="owner-cab-skel-line owner-cab-skel-line--title" />
          <span className="owner-cab-skel-line owner-cab-skel-line--xs" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={`prop-${i}`} className="owner-cab-skel-card owner-cab-skel-testdrive__card">
            <div className="owner-cab-skel-row">
              <span className="owner-cab-skel-block owner-cab-skel-thumb" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="owner-cab-skel-line owner-cab-skel-line--md" />
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
              </div>
            </div>
          </div>
        ))}
      </section>
      <section className="otd-split__right owner-cab-skel-testdrive__detail" aria-hidden="true">
        <span className="owner-cab-skel-block owner-cab-skel-testdrive__detail-cover" />
        <span className="owner-cab-skel-line owner-cab-skel-line--lg" />
        <span className="owner-cab-skel-line owner-cab-skel-line--md" />
        {Array.from({ length: 3 }, (_, i) => (
          <span key={`line-${i}`} className="owner-cab-skel-block owner-cab-skel-testdrive__detail-row" />
        ))}
      </section>
    </div>
  )
}
