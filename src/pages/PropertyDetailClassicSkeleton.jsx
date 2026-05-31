import './PropertyDetailClassic.css'
import './PropertyDetailClassicSkeleton.css'

function SkelLine({ w = '100%', h = 12, r = 8, className = '', style }) {
  return (
    <div
      className={`pds-line ${className}`.trim()}
      style={{ width: w, height: h, borderRadius: r, ...style }}
      aria-hidden
    />
  )
}

function SkelBlock({ h = 16, r = 12, className = '', style }) {
  return (
    <div
      className={`pds-block ${className}`.trim()}
      style={{ height: h, borderRadius: r, ...style }}
      aria-hidden
    />
  )
}

export default function PropertyDetailClassicSkeleton() {
  return (
    <div
      className="property-detail-page-new property-detail-page-new--auction-mobile-v2 property-detail-page-new--auction property-detail-mobile-tab-about pds-root"
      aria-busy="true"
      aria-label="Loading property"
    >
      {/* —— Mobile: fixed header —— */}
      <header className="property-detail-auction-mobile-header property-detail-auction-mobile-only pds-mobile-header">
        <div className="property-detail-auction-mobile-header__toolbar">
          <SkelBlock h={40} r={999} className="pds-mobile-header__btn" style={{ width: 40 }} />
          <div className="property-detail-auction-mobile-header__actions pds-mobile-header__actions">
            <SkelBlock h={40} r={999} style={{ width: 40 }} />
            <SkelBlock h={40} r={999} style={{ width: 40 }} />
            <SkelBlock h={40} r={999} style={{ width: 40 }} />
          </div>
        </div>
      </header>

      {/* —— Desktop header —— */}
      <div className="property-detail-header property-detail-header--auction-desktop pds-desktop-only">
        <div className="property-detail-header__container">
          <SkelBlock h={36} r={10} style={{ width: 100 }} />
        </div>
      </div>

      <div className="property-detail-main">
        <div className="property-detail-main__container">
          <div className="property-detail-left-column property-detail-auction-left-column">
            {/* Mobile hero gallery */}
            <div className="property-detail-gallery property-detail-auction-mobile-gallery pds-mobile-gallery">
              <div className="property-detail-gallery__main pds-mobile-gallery__main">
                <div className="pds-gallery-shimmer" aria-hidden />
              </div>
            </div>

            {/* Desktop hero + head */}
            <div className="pds-desktop-only pds-desktop-hero-wrap">
              <SkelBlock h={420} r={20} className="pds-desktop-hero" />
              <SkelLine w="62%" h={28} r={12} style={{ marginTop: 24 }} />
              <SkelLine w="38%" h={16} r={10} style={{ marginTop: 12 }} />
              <div className="pds-desktop-tabs">
                <SkelBlock h={36} r={10} style={{ width: 88 }} />
                <SkelBlock h={36} r={10} style={{ width: 88 }} />
                <SkelBlock h={36} r={10} style={{ width: 120 }} />
              </div>
            </div>

            <div className="property-detail-info-section property-detail-info-section--auction-sheet pds-desktop-only">
              <div className="property-detail-info-block">
                <SkelLine w="42%" h={18} r={10} style={{ marginBottom: 14 }} />
                <div className="pds-kv-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="pds-kv">
                      <SkelLine w="46%" h={12} />
                      <SkelLine w="30%" h={12} style={{ marginTop: 10 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="property-detail-map-mobile property-detail-map-mobile--auction-sheet pds-mobile-only">
              <SkelLine w="44%" h={16} r={10} style={{ marginBottom: 12 }} />
              <div className="pds-map pds-map--mobile-section" />
            </div>
          </div>

          {/* Sidebar / mobile sheet */}
          <div className="property-detail-sidebar property-detail-sidebar--auction-mobile">
            <div className="property-detail-sidebar__content property-detail-mobile-sheet">
              <div className="pds-desktop-only">
                <SkelLine w="78%" h={26} r={12} />
                <SkelLine w="52%" h={14} r={10} style={{ marginTop: 12 }} />
              </div>

              <div className="property-detail-mobile-sheet__head pds-mobile-only">
                <div className="property-detail-mobile-sheet__badge-row">
                  <SkelBlock h={28} r={8} style={{ width: 72 }} />
                  <SkelBlock h={28} r={8} style={{ width: 96 }} />
                </div>
                <SkelLine w="88%" h={26} r={12} />
                <SkelLine w="64%" h={14} r={10} style={{ marginTop: 10 }} />
                <div className="property-detail-mobile-tabs pds-mobile-tabs">
                  <SkelBlock h={14} r={6} style={{ width: 72 }} />
                  <SkelBlock h={14} r={6} style={{ width: 64 }} />
                  <SkelBlock h={14} r={6} style={{ width: 96 }} />
                </div>
              </div>

              <div className="pds-mobile-sheet-body pds-mobile-only">
                <SkelBlock h={72} r={16} className="pds-timer" />
                <div className="pds-bid-summary">
                  <SkelLine w="40%" h={12} />
                  <SkelLine w="52%" h={24} r={10} style={{ marginTop: 8 }} />
                </div>
                <SkelBlock h={48} r={999} style={{ marginTop: 16 }} />
                <SkelLine w="96%" h={12} style={{ marginTop: 18 }} />
                <SkelLine w="92%" h={12} style={{ marginTop: 10 }} />
                <SkelLine w="78%" h={12} style={{ marginTop: 10 }} />
              </div>

              <div className="pds-auction-card pds-desktop-only" aria-hidden>
                <SkelLine w="48%" h={14} />
                <SkelBlock h={44} r={12} style={{ marginTop: 14 }} />
                <div className="pds-btn-row">
                  <SkelBlock h={36} r={12} style={{ width: '31%' }} />
                  <SkelBlock h={36} r={12} style={{ width: '31%' }} />
                  <SkelBlock h={36} r={12} style={{ width: '31%' }} />
                </div>
                <SkelBlock h={40} r={12} style={{ marginTop: 14 }} />
                <SkelBlock h={44} r={14} style={{ marginTop: 14 }} />
              </div>

              <div className="property-detail-sidebar__description pds-desktop-only" aria-hidden>
                <SkelLine w="88%" h={12} />
                <SkelLine w="94%" h={12} style={{ marginTop: 10 }} />
                <SkelLine w="80%" h={12} style={{ marginTop: 10 }} />
              </div>

              <div className="property-detail-sidebar__map pds-desktop-only">
                <SkelLine w="40%" h={16} r={10} style={{ marginBottom: 12 }} />
                <div className="pds-map" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="property-detail-mobile-bottom-bar pds-mobile-bottom-bar pds-mobile-only" aria-hidden>
        <div className="property-detail-mobile-bottom-bar__price">
          <SkelLine w={64} h={10} />
          <SkelLine w={88} h={18} r={8} style={{ marginTop: 6 }} />
        </div>
        <SkelBlock h={48} r={999} style={{ width: 148, flexShrink: 0 }} />
      </div>
    </div>
  )
}
