import { isCatalogCountrySegment } from '../src/utils/catalogGeoUrl.js';
import {
  matchCountryKey,
  getCountryLabel,
  getCanonicalRegionLabel,
} from '../src/utils/propertySearchLocation.js';
import {
  isAuctionRoute,
  parseAuctionFilterPath,
} from '../src/utils/auctionFilterUrl.js';
import { resolveStaticPageSeo } from './seoStaticResolve.js';

const CO_INVESTMENT_PATH = '/co-investment';
const TEST_DRIVE_PATH = '/test-drive';

const AUCTION_CATEGORY_SEO_KEYS = {
  apartments: 'propertyTypeApartment',
  flats: 'propertyTypeFlat',
  villas: 'propertyTypeVilla',
  houses: 'propertyTypeHouse',
  commercial: 'propertyTypeCommercial',
  land: 'propertyTypeLand',
};

const CATALOG_TYPE_I18N = {
  apartments: 'oap_propertyTypeApartments',
  villas: 'propertyTypeVilla',
  houses: 'propertyTypeHouse',
  commercial: 'propertyTypeCommercial',
};

function normalizePathname(pathname) {
  if (!pathname || pathname === '/main') return '/auction';
  return pathname;
}

/**
 * @param {string} pathname
 * @param {(key: string, opts?: object) => string} t
 */
export function resolvePageSeo(pathname, t) {
  const path = normalizePathname(pathname);

  const staticHit = resolveStaticPageSeo(path, t);
  if (staticHit) return staticHit;

  if (isAuctionRoute(path)) {
    const parsed = parseAuctionFilterPath(path);
    const saleSeo = {
      buy_now: { titleKey: 'pageSeoAuctionBuyNowTitle', descKey: 'pageSeoAuctionBuyNowDescription' },
      auction: { titleKey: 'pageSeoAuctionBiddingTitle', descKey: 'pageSeoAuctionBiddingDescription' },
      ended: { titleKey: 'pageSeoAuctionEndedTitle', descKey: 'pageSeoAuctionEndedDescription' },
      pre_auction: { titleKey: 'pageSeoAuctionPreAuctionTitle', descKey: 'pageSeoAuctionPreAuctionDescription' },
    }[parsed.saleFilter || ''];

    if (saleSeo) {
      return {
        title: t(saleSeo.titleKey),
        description: t(saleSeo.descKey),
        canonicalPath: parsed.canonicalPath,
      };
    }

    if (parsed.categorySlug) {
      const categoryLabel = t(AUCTION_CATEGORY_SEO_KEYS[parsed.categorySlug] || 'propertyTypeAll');
      return {
        title: t('pageSeoAuctionCategoryTitle', { category: categoryLabel }),
        description: t('pageSeoAuctionCategoryDescription', { category: categoryLabel }),
        canonicalPath: parsed.canonicalPath,
      };
    }

    return {
      title: t('pageSeoAuctionTitle'),
      description: t('pageSeoAuctionDescription'),
      canonicalPath: parsed.canonicalPath,
    };
  }

  if (path.startsWith(`${CO_INVESTMENT_PATH}/`)) {
    return {
      title: t('pageSeoCoInvestmentDetailTitle'),
      description: t('pageSeoCoInvestmentDetailDescription'),
      canonicalPath: path,
    };
  }

  if (/^\/property\/[^/]+\/test-drive$/.test(path)) {
    return {
      title: t('pageSeoPropertyTestDriveTitle'),
      description: t('pageSeoPropertyTestDriveDescription'),
      canonicalPath: path,
    };
  }

  if (path.startsWith('/property/')) {
    return {
      title: t('pageSeoPropertyDetailTitle'),
      description: t('pageSeoPropertyDetailDescription'),
      canonicalPath: path.split('?')[0],
    };
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2 && isCatalogCountrySegment(segments[0])) {
    const country = segments[0];
    const city = segments[1];
    const typePlural = segments[2] || null;
    const countryKey = matchCountryKey(country) || country;
    const countryLabel = getCountryLabel(countryKey, country);
    const cityLabel = getCanonicalRegionLabel(city, city);
    const typeLabel =
      typePlural && CATALOG_TYPE_I18N[typePlural] ? t(CATALOG_TYPE_I18N[typePlural]) : '';
    const typePart = typeLabel ? t('pageSeoCatalogTypePart', { type: typeLabel }) : '';
    return {
      title: t('pageSeoCatalogCityTitle', { city: cityLabel, country: countryLabel, typePart }),
      description: t('pageSeoCatalogCityDescription', {
        city: cityLabel,
        country: countryLabel,
        typePart,
      }),
      canonicalPath: path.split('?')[0],
    };
  }

  return {
    title: t('pageSeoDefaultTitle'),
    description: t('pageSeoDefaultDescription'),
    canonicalPath: path.split('?')[0],
  };
}
