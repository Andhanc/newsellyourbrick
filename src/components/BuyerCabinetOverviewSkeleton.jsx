/**
 * Плейсхолдеры блоков личного кабинета покупателя на /profile — шапка страницы и фон уже видны.
 */
export function BuyerCabinetHeroSkeleton({ sectionsLabel, homeLink = null }) {
  return (
    <>
      <div className="test-hero-pro__identity">
        <div className="buyer-cab-skel-avatar" aria-hidden="true">
          <span className="buyer-cab-skel-shimmer buyer-cab-skel-shimmer--circle" />
        </div>
        {homeLink}
        <div className="buyer-cab-skel-who" aria-hidden="true">
          <span className="buyer-cab-skel-line buyer-cab-skel-line--name" />
          <span className="buyer-cab-skel-line buyer-cab-skel-line--email" />
          <div className="buyer-cab-skel-chips">
            <span className="buyer-cab-skel-chip" />
            <span className="buyer-cab-skel-chip" />
            <span className="buyer-cab-skel-chip buyer-cab-skel-chip--lg" />
          </div>
        </div>
      </div>

      <nav className="test-hero-pro__shortcuts buyer-cab-skel-shortcuts" aria-hidden="true">
        <p className="test-hero-pro__shortcuts-label buyer-cab-skel-shortcuts-label">{sectionsLabel}</p>
        <div className="test-hero-icon-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`cab-tile-skel-${i}`} className="buyer-cab-skel-tile">
              <span className="buyer-cab-skel-tile__icon" />
              <span className="buyer-cab-skel-tile__label" />
            </div>
          ))}
        </div>
      </nav>
    </>
  )
}

export function BuyerCabinetBelowSkeleton({ directionsTitle, directionsSubtitle, docsTitle }) {
  return (
    <>
      <section className="test-direction-summaries" aria-hidden="true">
        <div className="test-direction-summaries__grid">
          <div className="buyer-cab-skel-dir-card buyer-cab-skel-dir-card--shares">
            <div className="buyer-cab-skel-dir-card__head">
              <span className="buyer-cab-skel-line buyer-cab-skel-line--eyebrow" />
              <span className="buyer-cab-skel-line buyer-cab-skel-line--dir-title" />
              <span className="buyer-cab-skel-line buyer-cab-skel-line--dir-sub" />
              <span className="buyer-cab-skel-dir-arrow" />
            </div>
            <div className="buyer-cab-skel-dir-card__foot">
              <div className="buyer-cab-skel-dir-thumbs">
                <span className="buyer-cab-skel-thumb" />
                <span className="buyer-cab-skel-thumb" />
                <span className="buyer-cab-skel-thumb" />
              </div>
              <span className="buyer-cab-skel-pill-count" />
            </div>
          </div>
          <div className="buyer-cab-skel-dir-card buyer-cab-skel-dir-card--auction">
            <div className="buyer-cab-skel-dir-card__head">
              <span className="buyer-cab-skel-line buyer-cab-skel-line--eyebrow" />
              <span className="buyer-cab-skel-line buyer-cab-skel-line--dir-title" />
              <span className="buyer-cab-skel-line buyer-cab-skel-line--dir-sub" />
              <span className="buyer-cab-skel-dir-arrow" />
            </div>
            <div className="buyer-cab-skel-dir-card__foot">
              <div className="buyer-cab-skel-dir-thumbs">
                <span className="buyer-cab-skel-thumb" />
                <span className="buyer-cab-skel-thumb" />
                <span className="buyer-cab-skel-thumb" />
              </div>
              <span className="buyer-cab-skel-pill-count" />
            </div>
          </div>
          <div className="buyer-cab-skel-dir-card buyer-cab-skel-dir-card--debts">
            <div className="buyer-cab-skel-dir-card__head">
              <span className="buyer-cab-skel-line buyer-cab-skel-line--eyebrow" />
              <span className="buyer-cab-skel-line buyer-cab-skel-line--dir-title" />
              <span className="buyer-cab-skel-line buyer-cab-skel-line--dir-sub" />
              <span className="buyer-cab-skel-dir-arrow" />
            </div>
            <div className="buyer-cab-skel-dir-card__foot">
              <div className="buyer-cab-skel-dir-thumbs">
                <span className="buyer-cab-skel-thumb" />
                <span className="buyer-cab-skel-thumb" />
                <span className="buyer-cab-skel-thumb" />
              </div>
              <span className="buyer-cab-skel-pill-count" />
            </div>
          </div>
        </div>
      </section>

      <div className="test-bento buyer-cab-skel-bento">
        <div className="test-bento__main">
          <section className="test-panel test-panel--compact buyer-cab-skel-panel" aria-busy="true">
            <div className="test-panel__head">
              <h2 className="test-panel__title">{directionsTitle}</h2>
              <p className="test-panel__subtitle">{directionsSubtitle}</p>
            </div>
            <div className="test-quick-row test-quick-row--primary">
              <div className="buyer-cab-skel-quick-pill">
                <span className="buyer-cab-skel-quick-pill__icon" />
                <span className="buyer-cab-skel-quick-pill__body">
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--pill-title" />
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--pill-sub" />
                </span>
                <span className="buyer-cab-skel-quick-pill__arrow" />
              </div>
              <div className="buyer-cab-skel-quick-pill">
                <span className="buyer-cab-skel-quick-pill__icon" />
                <span className="buyer-cab-skel-quick-pill__body">
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--pill-title" />
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--pill-sub" />
                </span>
                <span className="buyer-cab-skel-quick-pill__arrow" />
              </div>
            </div>
            <div className="test-cabinet-home-discover buyer-cab-skel-discover">
              <div className="buyer-cab-skel-referral">
                <div className="buyer-cab-skel-referral__head">
                  <span className="buyer-cab-skel-referral__icon" />
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--ref-title" />
                </div>
                <span className="buyer-cab-skel-line buyer-cab-skel-line--ref-label" />
                <div className="buyer-cab-skel-referral__row">
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--ref-input" />
                  <span className="buyer-cab-skel-referral__copy" />
                </div>
                <span className="buyer-cab-skel-line buyer-cab-skel-line--ref-hint" />
              </div>
              <div className="buyer-cab-skel-bonus-row">
                <span className="buyer-cab-skel-bonus-row__icon" />
                <span className="buyer-cab-skel-bonus-row__text">
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--bonus-title" />
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--bonus-sub" />
                </span>
                <span className="buyer-cab-skel-bonus-row__arrow" />
              </div>
            </div>
            <div className="test-quick-row test-quick-row--logout-below">
              <div className="buyer-cab-skel-logout">
                <span className="buyer-cab-skel-logout__icon" />
                <span className="buyer-cab-skel-logout__body">
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--logout-title" />
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--logout-sub" />
                </span>
                <span className="buyer-cab-skel-logout__arrow" />
              </div>
            </div>
          </section>
        </div>

        <aside className="test-bento__rail">
          <section className="test-panel test-panel--tight buyer-cab-skel-docs" aria-busy="true">
            <h2 className="test-panel__title test-panel__title--sm">{docsTitle}</h2>
            <div className="buyer-cab-skel-docs-stack">
              <div className="buyer-cab-skel-doc-row">
                <span className="buyer-cab-skel-doc-row__icon" />
                <span className="buyer-cab-skel-doc-row__lines">
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--doc-title" />
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--doc-sub" />
                </span>
                <span className="buyer-cab-skel-doc-row__arrow" />
              </div>
              <div className="buyer-cab-skel-doc-row">
                <span className="buyer-cab-skel-doc-row__icon" />
                <span className="buyer-cab-skel-doc-row__lines">
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--doc-title" />
                  <span className="buyer-cab-skel-line buyer-cab-skel-line--doc-sub" />
                </span>
                <span className="buyer-cab-skel-doc-row__arrow" />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
