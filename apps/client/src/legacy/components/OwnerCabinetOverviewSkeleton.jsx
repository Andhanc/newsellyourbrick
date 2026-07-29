import '../styles/owner-cabinet-skeleton.css'

export function OwnerCabinetEndingSoonSkeleton({ title }) {
  return (
    <section className="mot-ending-strip owner-cab-skel-ending" aria-busy="true" aria-label={title}>
      <h2 className="mot-ending-strip__title">{title}</h2>
      <div className="owner-cab-skel-ending__scroll" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={`ending-skel-${i}`} className="owner-cab-skel-ending__card">
            <span className="owner-cab-skel-block owner-cab-skel-ending__cover" />
            <span className="owner-cab-skel-line owner-cab-skel-line--md" />
            <span className="owner-cab-skel-line owner-cab-skel-line--sm" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function OwnerCabinetChartSkeleton() {
  return (
    <div className="owner-cab-skel-chart" aria-hidden="true">
      <span className="owner-cab-skel-block owner-cab-skel-chart__area" />
    </div>
  )
}
