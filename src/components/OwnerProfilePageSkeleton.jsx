import '../styles/owner-cabinet-skeleton.css'

export default function OwnerProfilePageSkeleton() {
  return (
    <div className="opr-body owner-cab-skel-profile" aria-busy="true">
      <header className="opr-header opr-desktop-only" aria-hidden="true">
        <span className="owner-cab-skel-line owner-cab-skel-line--title" />
      </header>
      <div className="opr-workspace">
        <div className="opr-content">
          <div className="owner-cab-skel-profile__hero owner-cab-skel-card" aria-hidden="true">
            <span className="owner-cab-skel-block owner-cab-skel-profile__avatar" />
            <div className="owner-cab-skel-profile__hero-copy">
              <span className="owner-cab-skel-line owner-cab-skel-line--lg" />
              <span className="owner-cab-skel-line owner-cab-skel-line--md" />
              <div className="owner-cab-skel-row" style={{ marginTop: 12 }}>
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
              </div>
            </div>
          </div>
          <div className="owner-cab-skel-profile__tabs" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={`tab-${i}`} className="owner-cab-skel-line owner-cab-skel-line--md" />
            ))}
          </div>
          <div className="owner-cab-skel-profile__grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={`stat-${i}`} className="owner-cab-skel-card owner-cab-skel-profile__stat">
                <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
                <span className="owner-cab-skel-line owner-cab-skel-line--xl" />
              </div>
            ))}
          </div>
          <div className="owner-cab-skel-card owner-cab-skel-profile__panel" aria-hidden="true">
            <span className="owner-cab-skel-line owner-cab-skel-line--title" />
            <span className="owner-cab-skel-line owner-cab-skel-line--subtitle" />
            {Array.from({ length: 4 }, (_, i) => (
              <span key={`field-${i}`} className="owner-cab-skel-block owner-cab-skel-profile__field" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
