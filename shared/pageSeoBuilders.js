import { formatPropertyPrice } from '../src/utils/currency.js';
import { resolvePropertyGeoFields } from '../src/utils/catalogGeoUrl.js';
import {
  getCanonicalRegionLabel,
  matchCountryKey,
  getCountryLabel,
} from '../src/utils/propertySearchLocation.js';

const PROPERTY_TYPE_I18N = {
  apartment: 'propertyTypeFlat',
  flat: 'propertyTypeFlat',
  apartments: 'oap_propertyTypeApartments',
  villa: 'propertyTypeVilla',
  house: 'propertyTypeHouse',
  townhouse: 'propertyTypeHouse',
  commercial: 'propertyTypeCommercial',
};

const CATALOG_TYPE_I18N = {
  apartments: 'oap_propertyTypeApartments',
  villas: 'propertyTypeVilla',
  houses: 'propertyTypeHouse',
  commercial: 'propertyTypeCommercial',
};

function seoLocale(lang) {
  const base = String(lang || 'ru').split('-')[0];
  return base === 'ru'
    ? 'ru-RU'
    : base === 'de'
      ? 'de-DE'
      : base === 'fr'
        ? 'fr-FR'
        : base === 'es'
          ? 'es-ES'
          : base === 'sv'
            ? 'sv-SE'
            : 'en-US';
}

function propertyTypeLabel(property, t) {
  const pt = String(property?.property_type || property?.propertyType || '').toLowerCase();
  const key = PROPERTY_TYPE_I18N[pt];
  return key ? t(key) : t('pageSeoPropertyTypeDefault');
}

function resolveCityLabel(property) {
  const { city } = resolvePropertyGeoFields(property);
  if (!city) return '';
  return getCanonicalRegionLabel(city, city);
}

function resolvePropertyArea(property) {
  const area = property?.area ?? property?.sqft;
  const num = Number(area);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}

function resolvePropertyPriceAmount(property) {
  const currentBid = Number(property?.current_bid ?? property?.currentBid);
  if (Number.isFinite(currentBid) && currentBid > 0) return currentBid;

  const isAuction =
    property?.is_auction === true ||
    property?.is_auction === 1 ||
    property?.isAuction === true;

  if (isAuction) {
    const starting = Number(property?.auction_starting_price ?? property?.auctionStartingPrice);
    if (Number.isFinite(starting) && starting > 0) return starting;
  }

  const shareTotal = Number(property?.totalPrice);
  if (Number.isFinite(shareTotal) && shareTotal > 0) return shareTotal;

  const price = Number(property?.price);
  if (Number.isFinite(price) && price > 0) return price;

  return null;
}

function formatSeoPrice(property, lang) {
  const amount = resolvePropertyPriceAmount(property);
  if (amount == null) return '—';
  const currency = property?.currency || 'EUR';
  return formatPropertyPrice(amount, currency, { locale: seoLocale(lang) });
}

/**
 * @param {object} property
 * @param {(key: string, opts?: object) => string} t
 * @param {string} [lang]
 */
export function buildPropertyPageSeo(property, t, lang = 'ru') {
  if (!property) return null;

  const type = propertyTypeLabel(property, t);
  const city = resolveCityLabel(property);
  const area = resolvePropertyArea(property);
  const price = formatSeoPrice(property, lang);
  const name = String(property.title || property.name || '').trim();

  let title;
  if (city && area && price !== '—') {
    title = t('pageSeoPropertyTitle', { type, city, area, price });
  } else if (name) {
    title = t('pageSeoPropertyTitleFallback', { name });
  } else {
    title = t('pageSeoPropertyDetailTitle');
  }

  const description = t('pageSeoPropertyDescription', {
    type,
    city: city || name || '—',
    area: area ?? '—',
    price,
    name: name || type,
  });

  return { title, description };
}

/**
 * @param {object} property
 * @param {(key: string, opts?: object) => string} t
 * @param {string} [lang]
 * @param {{ canonicalPath: string, origin: string, apiOrigin: string }} ctx
 */
export function buildPropertySeoBundle(property, t, lang = 'ru', ctx) {
  if (!property) return null;

  const seo = buildPropertyPageSeo(property, t, lang);
  if (!seo) return null;

  const type = propertyTypeLabel(property, t);
  const city = resolveCityLabel(property);
  const price = formatSeoPrice(property, lang);
  const h1 = String(property.title || property.name || '').trim() || type;
  const priceAmount = resolvePropertyPriceAmount(property);
  const currency = property?.currency || 'EUR';

  return {
    ...seo,
    h1,
    type,
    city,
    price,
    priceAmount,
    currency,
    canonicalPath: ctx.canonicalPath,
    canonicalUrl: `${ctx.origin}${ctx.canonicalPath}`,
    ogType: 'product',
  };
}

/**
 * @param {{ title?: string, lead?: string, excerpt?: string }} article
 * @param {(key: string, opts?: object) => string} t
 */
export function buildNewsArticlePageSeo(article, t) {
  if (!article?.title) return null;

  const excerpt = String(article.excerpt || article.lead || '').trim();
  const description = excerpt || t('pageSeoNewsArticleDescriptionFallback', { title: article.title });

  return {
    title: t('pageSeoNewsArticleTitle', { title: article.title }),
    description,
  };
}

/**
 * @param {{
 *   country: string,
 *   city: string,
 *   typePlural?: string | null,
 *   sale?: string,
 *   cityLabel?: string,
 * }} params
 * @param {(key: string, opts?: object) => string} t
 */
export function buildCatalogPageSeo(params, t) {
  const country = String(params.country || '').toLowerCase();
  const countryKey = matchCountryKey(country) || country;
  const countryLabel = getCountryLabel(countryKey, country);
  const cityLabel = params.cityLabel || getCanonicalRegionLabel(params.city, params.city);
  const typePlural = params.typePlural ? String(params.typePlural).toLowerCase() : null;
  const sale = String(params.sale || 'all').toLowerCase();

  const typeLabel = typePlural && CATALOG_TYPE_I18N[typePlural] ? t(CATALOG_TYPE_I18N[typePlural]) : '';
  const typePart = typeLabel ? t('pageSeoCatalogTypePart', { type: typeLabel }) : '';

  if (countryKey === 'spain' && typePlural === 'apartments' && sale === 'all') {
    return {
      title: t('pageSeoCatalogApartmentsSpainTitle'),
      description: t('pageSeoCatalogApartmentsSpainDescription'),
    };
  }

  if ((typePlural === 'houses' || typePlural === 'villas') && sale === 'all') {
    const cityPart = cityLabel ? t('pageSeoCatalogHousesSeaCityPart', { city: cityLabel }) : '';
    return {
      title: t('pageSeoCatalogHousesSeaTitle'),
      description: t('pageSeoCatalogHousesSeaDescription', { cityPart }),
    };
  }

  if (sale === 'debts') {
    return {
      title: t('pageSeoCatalogDebtsTitle', { city: cityLabel, country: countryLabel }),
      description: t('pageSeoCatalogDebtsDescription', { city: cityLabel, country: countryLabel, typePart }),
    };
  }

  if (sale === 'co-investment') {
    return {
      title: t('pageSeoCatalogCoInvestmentTitle', { city: cityLabel, country: countryLabel }),
      description: t('pageSeoCatalogCoInvestmentDescription', { city: cityLabel, country: countryLabel, typePart }),
    };
  }

  return {
    title: t('pageSeoCatalogCityTitle', { city: cityLabel, country: countryLabel, typePart }),
    description: t('pageSeoCatalogCityDescription', { city: cityLabel, country: countryLabel, typePart }),
  };
}
