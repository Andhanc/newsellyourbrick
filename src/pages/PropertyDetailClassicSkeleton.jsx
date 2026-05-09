import './PropertyDetailClassic.css'
import './PropertyDetailClassicSkeleton.css'

function SkelLine({ w = '100%', h = 12, r = 8, style }) {
  return (
    <div
      className="pds-line"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        ...style,
      }}
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
    <div className="property-detail-page-new pds-root" aria-busy="true">
      <div className="property-detail-header">
        <div className="property-detail-header__container">
          <div className="pds-header-left">
            <SkelBlock h={34} r={10} style={{ width: 110 }} />
          </div>
          <div className="property-detail-header__info" style={{ minWidth: 0 }}>
            <SkelLine w="38%" h={12} />
            <SkelLine w="62%" h={12} style={{ marginTop: 8 }} />
          </div>
        </div>
      </div>

      <div className="property-detail-main">
        <div className="property-detail-main__container">
          <div className="property-detail-left-column">
            <div className="property-detail-gallery">
              <div className="property-detail-gallery__main">
                <div className="pds-gallery-shimmer" aria-hidden />
                <div
                  className="property-detail-gallery__nav property-detail-gallery__nav--prev pds-nav-skel"
                  aria-hidden
                />
                <div
                  className="property-detail-gallery__nav property-detail-gallery__nav--next pds-nav-skel"
                  aria-hidden
                />
                <div className="property-detail-gallery__counter" aria-hidden>
                  <div className="pds-counter-inner" />
                </div>
                <div className="property-detail-gallery__actions" aria-hidden>
                  <SkelBlock className="pds-action-dot" h={40} r={999} style={{ width: 40, flexShrink: 0 }} />
                  <SkelBlock className="pds-action-dot" h={40} r={999} style={{ width: 40, flexShrink: 0 }} />
                  <SkelBlock className="pds-action-dot" h={40} r={999} style={{ width: 40, flexShrink: 0 }} />
                </div>
              </div>
              <div className="property-detail-gallery__thumbnails-wrapper">
                <div className="property-detail-gallery__thumbnails" aria-hidden>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="pds-thumb" />
                  ))}
                </div>
              </div>
            </div>

            <div className="property-detail-info-section">
              <div className="property-detail-info-block">
                <SkelLine w="42%" h={18} r={10} style={{ marginBottom: 14 }} />
                <div className="pds-kv-grid" aria-hidden>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="pds-kv">
                      <SkelLine w="46%" h={12} />
                      <SkelLine w="30%" h={12} style={{ marginTop: 10 }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="property-detail-info-block" style={{ marginTop: 16 }}>
                <SkelLine w="34%" h={18} r={10} style={{ marginBottom: 14 }} />
                <SkelLine w="96%" h={12} />
                <SkelLine w="92%" h={12} style={{ marginTop: 10 }} />
                <SkelLine w="88%" h={12} style={{ marginTop: 10 }} />
                <SkelLine w="74%" h={12} style={{ marginTop: 10 }} />
              </div>
            </div>

            <div className="property-detail-extra-text-mobile" aria-hidden>
              <SkelLine w="32%" h={16} r={8} style={{ marginBottom: 12 }} />
              <SkelLine w="96%" h={12} />
              <SkelLine w="94%" h={12} style={{ marginTop: 10 }} />
              <SkelLine w="82%" h={12} style={{ marginTop: 10 }} />
            </div>

            <div className="property-detail-map-mobile" aria-hidden>
              <div className="property-detail-sidebar__map">
                <SkelLine w="44%" h={16} r={10} style={{ marginBottom: 12 }} />
                <div className="pds-map pds-map--mobile-section" />
              </div>
            </div>
          </div>

          <div className="property-detail-sidebar">
            <div className="property-detail-sidebar__content">
              <SkelLine w="78%" h={26} r={12} />
              <SkelLine w="52%" h={14} r={10} style={{ marginTop: 12 }} />

              <div className="pds-auction-card" aria-hidden>
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

              <div className="property-detail-sidebar__description" aria-hidden>
                <SkelLine w="88%" h={12} />
                <SkelLine w="94%" h={12} style={{ marginTop: 10 }} />
                <SkelLine w="80%" h={12} style={{ marginTop: 10 }} />
                <SkelLine w="68%" h={12} style={{ marginTop: 10 }} />
              </div>

              <div className="property-detail-sidebar__map" aria-hidden>
                <SkelLine w="40%" h={16} r={10} style={{ marginBottom: 12 }} />
                <div className="pds-map" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

