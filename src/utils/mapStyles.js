/**
 * Высокие уровни зума: Esri World Imagery не везде отдаёт тайлы → серая сетка «нет данных».
 * Ограничиваем и карту, и источник (см. MapLibre raster source.maxzoom).
 */
export const SATELLITE_MAP_MAX_ZOOM = 17

export const STREET_MAP_MAX_ZOOM = 19

export const SATELLITE_MAP_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '© Esri',
      maxzoom: SATELLITE_MAP_MAX_ZOOM
    }
  },
  layers: [
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite'
    }
  ]
}

export const STREET_MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
      maxzoom: STREET_MAP_MAX_ZOOM,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
}

/** Светлая карта для декоративных фонов (лендинги, hero-блоки). */
export const LIGHT_MAP_STYLE = {
  version: 8,
  sources: {
    light: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap',
      maxzoom: STREET_MAP_MAX_ZOOM,
    },
  },
  layers: [
    {
      id: 'light',
      type: 'raster',
      source: 'light',
    },
  ],
}

/** Минималистичная карта для hero-блока покупателя. */
export const BUYER_HERO_MAP_STYLE = {
  version: 8,
  sources: {
    voyager: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap',
      maxzoom: STREET_MAP_MAX_ZOOM,
    },
  },
  layers: [
    {
      id: 'voyager',
      type: 'raster',
      source: 'voyager',
    },
  ],
}
