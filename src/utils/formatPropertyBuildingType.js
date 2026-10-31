/**
 * Building material / type may be stored as EN keys or legacy localized labels
 * (e.g. «Монолит»). Normalize to a canonical key, then translate via i18n.
 */

export const PROPERTY_BUILDING_TYPE_I18N_KEYS = {
  monolithic: 'addPropertyDetailsBuildingMonolithic',
  brick: 'addPropertyDetailsBuildingBrick',
  panel: 'addPropertyDetailsBuildingPanel',
  block: 'addPropertyDetailsBuildingBlock',
  wood: 'addPropertyDetailsBuildingWood',
  frame: 'addPropertyDetailsBuildingFrame',
  aerated_concrete: 'addPropertyDetailsBuildingAerated',
  foam_concrete: 'addPropertyDetailsBuildingFoam',
  other: 'addPropertyDetailsBuildingOther',
}

/** Compare page uses a parallel key set with the same canonical codes. */
export const COMPARE_BUILDING_TYPE_I18N_KEYS = {
  monolithic: 'comparePage_building_monolithic',
  brick: 'comparePage_building_brick',
  panel: 'comparePage_building_panel',
  block: 'comparePage_building_block',
  wood: 'comparePage_building_wood',
  frame: 'comparePage_building_frame',
  aerated_concrete: 'comparePage_building_aerated_concrete',
  foam_concrete: 'comparePage_building_foam_concrete',
  other: 'comparePage_building_other',
}

const ALIAS_TO_CANONICAL = {
  monolithic: 'monolithic',
  monolith: 'monolithic',
  монолит: 'monolithic',
  монолитный: 'monolithic',
  монолитная: 'monolithic',
  монолитное: 'monolithic',
  monolithe: 'monolithic',
  monolítico: 'monolithic',
  monolitico: 'monolithic',
  monolithisch: 'monolithic',
  monolitowy: 'monolithic',
  monolitisk: 'monolithic',

  brick: 'brick',
  кирпич: 'brick',
  кирпичный: 'brick',
  кирпичная: 'brick',
  brique: 'brick',
  ladrillo: 'brick',
  ziegel: 'brick',
  cegła: 'brick',
  cegla: 'brick',
  tegel: 'brick',

  panel: 'panel',
  панель: 'panel',
  панельный: 'panel',
  панельная: 'panel',
  panneau: 'panel',
  plattenbau: 'panel',
  panelowy: 'panel',

  block: 'block',
  блок: 'block',
  блочный: 'block',
  блочная: 'block',
  bloc: 'block',
  bloque: 'block',
  blockhaus: 'block',
  blokowy: 'block',

  wood: 'wood',
  wooden: 'wood',
  дерево: 'wood',
  деревянный: 'wood',
  деревянная: 'wood',
  bois: 'wood',
  madera: 'wood',
  holz: 'wood',
  drewno: 'wood',
  trä: 'wood',
  tra: 'wood',

  frame: 'frame',
  каркас: 'frame',
  каркасный: 'frame',
  каркасная: 'frame',
  ossature: 'frame',
  estructura: 'frame',
  fachwerk: 'frame',
  szkieletowy: 'frame',
  stomme: 'frame',

  aerated_concrete: 'aerated_concrete',
  'aerated concrete': 'aerated_concrete',
  газобетон: 'aerated_concrete',
  газобетонный: 'aerated_concrete',
  газобетонная: 'aerated_concrete',
  béton_cellulaire: 'aerated_concrete',
  'béton cellulaire': 'aerated_concrete',
  'beton cellulaire': 'aerated_concrete',

  foam_concrete: 'foam_concrete',
  'foam concrete': 'foam_concrete',
  пенобетон: 'foam_concrete',
  пенобетонный: 'foam_concrete',
  пенобетонная: 'foam_concrete',
  'béton mousse': 'foam_concrete',
  'beton mousse': 'foam_concrete',

  other: 'other',
  другое: 'other',
  другой: 'other',
  другая: 'other',
  autre: 'other',
  otro: 'other',
  andere: 'other',
  inny: 'other',
  annat: 'other',
}

function normalizeAlias(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * @param {unknown} raw
 * @returns {keyof typeof PROPERTY_BUILDING_TYPE_I18N_KEYS | null}
 */
export function resolvePropertyBuildingTypeKey(raw) {
  if (raw == null) return null
  const original = String(raw).trim()
  if (!original) return null

  const lowered = normalizeAlias(original)
  const underscored = lowered.replace(/\s+/g, '_')

  if (PROPERTY_BUILDING_TYPE_I18N_KEYS[underscored]) return underscored
  if (ALIAS_TO_CANONICAL[lowered]) return ALIAS_TO_CANONICAL[lowered]
  if (ALIAS_TO_CANONICAL[underscored]) return ALIAS_TO_CANONICAL[underscored]

  // Prefix match for values like «Монолитный дом»
  for (const [alias, canonical] of Object.entries(ALIAS_TO_CANONICAL)) {
    if (alias.length >= 4 && (lowered.startsWith(alias) || underscored.startsWith(alias))) {
      return canonical
    }
  }

  return null
}

/**
 * @param {unknown} raw
 * @param {(key: string, options?: object) => string} t
 * @param {{ keyMap?: Record<string, string>, fallback?: string }} [options]
 */
export function formatPropertyBuildingType(raw, t, options = {}) {
  const keyMap = options.keyMap || PROPERTY_BUILDING_TYPE_I18N_KEYS
  const canonical = resolvePropertyBuildingTypeKey(raw)
  if (canonical && keyMap[canonical]) {
    return t(keyMap[canonical])
  }
  if (options.fallback != null) return options.fallback
  const text = raw == null ? '' : String(raw).trim()
  return text || options.fallback || '—'
}

export const PROPERTY_COMMERCIAL_TYPE_I18N_KEYS = {
  office: 'oap_commercialTypeOffice',
  shop: 'oap_commercialTypeShop',
  warehouse: 'oap_commercialTypeWarehouse',
  other: 'oap_commercialTypeOther',
}

const COMMERCIAL_ALIASES = {
  office: 'office',
  офис: 'office',
  bureau: 'office',
  oficina: 'office',
  büro: 'office',
  biuro: 'office',
  kontor: 'office',
  shop: 'shop',
  магазин: 'shop',
  boutique: 'shop',
  tienda: 'shop',
  laden: 'shop',
  sklep: 'shop',
  butik: 'shop',
  warehouse: 'warehouse',
  склад: 'warehouse',
  entrepôt: 'warehouse',
  entrepot: 'warehouse',
  almacén: 'warehouse',
  almacen: 'warehouse',
  lager: 'warehouse',
  magazyn: 'warehouse',
  other: 'other',
  другое: 'other',
  другой: 'other',
  autre: 'other',
  otro: 'other',
  andere: 'other',
  inny: 'other',
  annat: 'other',
}

export function formatPropertyCommercialType(raw, t, options = {}) {
  if (raw == null || String(raw).trim() === '') {
    return options.fallback != null ? options.fallback : '—'
  }
  const lowered = normalizeAlias(raw)
  const underscored = lowered.replace(/\s+/g, '_')
  const canonical =
    PROPERTY_COMMERCIAL_TYPE_I18N_KEYS[underscored]
      ? underscored
      : COMMERCIAL_ALIASES[lowered] || COMMERCIAL_ALIASES[underscored] || null
  if (canonical && PROPERTY_COMMERCIAL_TYPE_I18N_KEYS[canonical]) {
    return t(PROPERTY_COMMERCIAL_TYPE_I18N_KEYS[canonical])
  }
  return String(raw).trim()
}
