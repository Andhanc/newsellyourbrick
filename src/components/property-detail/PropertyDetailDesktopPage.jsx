import './PropertyDetailDesktopPage.css'

/**
 * Десктопная страница объекта — единая логичная структура (≥961px).
 *
 * @param {{
 *   topBar?: import('react').ReactNode
 *   gallery?: import('react').ReactNode
 *   badges?: import('react').ReactNode
 *   title: string
 *   location?: string | null
 *   meta?: import('react').ReactNode
 *   highlights?: import('react').ReactNode
 *   sidebar: import('react').ReactNode
 *   sections?: Array<{ id: string, title: string, kicker?: string, content: import('react').ReactNode }>
 *   promos?: import('react').ReactNode
 *   afterSections?: import('react').ReactNode
 *   geoLinks?: import('react').ReactNode
 * }} props
 */
export default function PropertyDetailDesktopPage({
  topBar,
  gallery,
  badges,
  title,
  location,
  meta,
  highlights,
  sidebar,
  sections = [],
  promos,
  afterSections,
  geoLinks,
}) {
  return (
    <div className="pdd-page property-detail-desktop-v4-root">
      {topBar ? <div className="pdd-page__topbar">{topBar}</div> : null}

      <div className="pdd-page__hero">{gallery}</div>

      <div className="pdd-page__shell">
        <main className="pdd-page__main">
          <header className="pdd-page__intro">
            {badges ? <div className="pdd-page__badges">{badges}</div> : null}
            <h1 className="pdd-page__title">{title}</h1>
            {location ? <p className="pdd-page__location">{location}</p> : null}
            {meta ? <div className="pdd-page__meta">{meta}</div> : null}
            {highlights ? <div className="pdd-page__highlights">{highlights}</div> : null}
            {geoLinks ? <div className="pdd-page__geo">{geoLinks}</div> : null}
          </header>

          <div className="pdd-page__sections">
            {sections.map((section) =>
              section.content ? (
                <section key={section.id} id={section.id} className="pdd-section">
                  {section.kicker ? (
                    <p className="pdd-section__kicker">{section.kicker}</p>
                  ) : null}
                  <h2 className="pdd-section__title">{section.title}</h2>
                  <div className="pdd-section__body">{section.content}</div>
                </section>
              ) : null,
            )}
          </div>

          {promos ? <div className="pdd-page__promos">{promos}</div> : null}
          {afterSections ? <div className="pdd-page__after">{afterSections}</div> : null}
        </main>

        <aside className="pdd-page__aside">{sidebar}</aside>
      </div>
    </div>
  )
}
