/**
 * JSON-LD для публичных страниц.
 */

/**
 * @param {{ origin: string }} params
 */
export function buildWebSiteJsonLd({ origin }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sellyourbrick',
    url: origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/auction?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   canonicalUrl: string,
 *   imageUrl?: string,
 *   h1?: string,
 *   city?: string,
 *   country?: string,
 *   priceAmount?: number | null,
 *   currency?: string,
 *   propertyType?: string,
 * }} params
 */
export function buildRealEstateListingJsonLd({
  title,
  description,
  canonicalUrl,
  imageUrl,
  h1,
  city,
  country,
  priceAmount,
  currency,
  propertyType,
}) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: h1 || title,
    description,
    url: canonicalUrl,
  };

  if (imageUrl) ld.image = imageUrl;
  if (propertyType) ld.category = propertyType;

  const address = {};
  if (city) address.addressLocality = city;
  if (country) address.addressCountry = country;
  if (Object.keys(address).length > 0) {
    ld.address = { '@type': 'PostalAddress', ...address };
  }

  if (priceAmount != null && Number.isFinite(priceAmount) && priceAmount > 0) {
    ld.offers = {
      '@type': 'Offer',
      price: String(Math.round(priceAmount)),
      priceCurrency: currency || 'EUR',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    };
  }

  return ld;
}

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   canonicalUrl: string,
 *   imageUrl?: string,
 *   publishedAt?: string,
 * }} params
 */
export function buildNewsArticleJsonLd({
  title,
  description,
  canonicalUrl,
  imageUrl,
  publishedAt,
}) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description,
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: 'Sellyourbrick',
    },
  };
  if (imageUrl) ld.image = imageUrl;
  if (publishedAt) ld.datePublished = publishedAt;
  return ld;
}

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   canonicalUrl: string,
 * }} params
 */
export function buildCollectionPageJsonLd({ title, description, canonicalUrl }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonicalUrl,
  };
}
