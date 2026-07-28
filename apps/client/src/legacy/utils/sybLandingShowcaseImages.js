export function buildSybShowcasePadCard(kind, index, t, config) {
  return {
    id: `syb-showcase-pad-${kind}-${index}`,
    property_id: `syb-showcase-pad-${kind}-${index}`,
    _isPadCard: true,
    _sectionHref: config.allHref,
    title: t(config.titleKey),
    location: t(config.subtitleKey),
    price: 0,
  }
}
