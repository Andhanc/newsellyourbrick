import './PropertyDetailDesktopPage.css'

/**
 * Desktop property page — clean layout, no legacy chrome.
 */
export default function PropertyDetailDesktopPage({
  header,
  gallery,
  title,
  subtitle,
  stats,
  toolbar,
  sidebar,
  children,
  belowGrid,
  footer,
}) {
  return (
    <div className="pdx-page property-detail-desktop-v4-root">
      <div className="pdx-page__container">
        {(header || toolbar) ? (
          <header className="pdx-page__topline">
            <div className="pdx-page__topline-main">{header}</div>
            {toolbar ? <div className="pdx-page__toolbar">{toolbar}</div> : null}
          </header>
        ) : null}

        <div className="pdx-page__grid">
          <div className="pdx-page__main">
            <div className="pdx-page__gallery">{gallery}</div>

            <div className="pdx-page__head">
              <div className="pdx-page__head-copy">
                {subtitle ? <p className="pdx-page__subtitle">{subtitle}</p> : null}
                <h1 className="pdx-page__title">{title}</h1>
                {stats ? <div className="pdx-page__stats">{stats}</div> : null}
              </div>
            </div>

            <div className="pdx-page__content">{children}</div>
            {footer ? <footer className="pdx-page__footer">{footer}</footer> : null}
          </div>

          <aside className="pdx-page__aside">{sidebar}</aside>
        </div>

        {belowGrid ? <div className="pdx-page__below-grid">{belowGrid}</div> : null}
      </div>
    </div>
  )
}
