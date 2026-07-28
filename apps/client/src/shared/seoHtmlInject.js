export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, '&#39;');
}

/**
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} [params.canonicalUrl]
 * @param {string} [params.ogImage]
 * @param {string} [params.ogType]
 * @param {boolean} [params.noindex]
 * @param {object|object[]} [params.jsonLd]
 * @param {string} [params.lang]
 */
export function buildSeoHeadFragment({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  ogTitle,
  ogDescription,
  twitterCard = 'summary_large_image',
  noindex = false,
  jsonLd,
  lang,
}) {
  const lines = [];
  const resolvedOgTitle = ogTitle || title;
  const resolvedOgDescription = ogDescription || description;

  if (canonicalUrl) {
    lines.push(`<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />`);
  }

  if (noindex) {
    lines.push('<meta name="robots" content="noindex, nofollow" />');
  }

  lines.push(`<meta property="og:site_name" content="Sellyourbrick" />`);
  if (resolvedOgTitle) lines.push(`<meta property="og:title" content="${escapeAttr(resolvedOgTitle)}" />`);
  if (resolvedOgDescription) {
    lines.push(`<meta property="og:description" content="${escapeAttr(resolvedOgDescription)}" />`);
  }
  if (canonicalUrl) lines.push(`<meta property="og:url" content="${escapeAttr(canonicalUrl)}" />`);
  if (ogType) lines.push(`<meta property="og:type" content="${escapeAttr(ogType)}" />`);
  if (ogImage) lines.push(`<meta property="og:image" content="${escapeAttr(ogImage)}" />`);
  if (lang) lines.push(`<meta property="og:locale" content="${escapeAttr(lang)}" />`);

  const card = twitterCard === 'summary' ? 'summary' : 'summary_large_image';
  lines.push(`<meta name="twitter:card" content="${escapeAttr(card)}" />`);
  if (resolvedOgTitle) lines.push(`<meta name="twitter:title" content="${escapeAttr(resolvedOgTitle)}" />`);
  if (resolvedOgDescription) {
    lines.push(`<meta name="twitter:description" content="${escapeAttr(resolvedOgDescription)}" />`);
  }
  if (ogImage) lines.push(`<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`);

  if (jsonLd) {
    const payload = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    for (const item of payload) {
      if (!item) continue;
      lines.push(
        `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, '\\u003c')}</script>`,
      );
    }
  }

  return lines.join('\n    ');
}

/**
 * @param {object} params
 */
export function buildPropertyPrerenderHtml({ h1, type, city, price, imageUrl, imageAlt }) {
  const parts = ['<article id="seo-prerender" data-seo-prerender="1">'];
  parts.push(`<h1>${escapeHtml(h1)}</h1>`);
  if (imageUrl) {
    parts.push(
      `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(imageAlt || h1)}" width="800" height="600" loading="eager" fetchpriority="high" />`,
    );
  }
  if (type) parts.push(`<p class="seo-prerender__type">${escapeHtml(type)}</p>`);
  if (city) parts.push(`<p class="seo-prerender__city">${escapeHtml(city)}</p>`);
  if (price) parts.push(`<p class="seo-prerender__price">${escapeHtml(price)}</p>`);
  parts.push('</article>');
  return parts.join('\n');
}

export function buildCatalogPrerenderHtml({ h1, description }) {
  const parts = ['<article id="seo-prerender" data-seo-prerender="1">'];
  parts.push(`<h1>${escapeHtml(h1)}</h1>`);
  if (description) {
    parts.push(`<p class="seo-prerender__lead">${escapeHtml(description)}</p>`);
  }
  parts.push('</article>');
  return parts.join('\n');
}

export function buildNewsPrerenderHtml({ h1, lead, imageUrl, imageAlt }) {
  const parts = ['<article id="seo-prerender" data-seo-prerender="1">'];
  parts.push(`<h1>${escapeHtml(h1)}</h1>`);
  if (imageUrl) {
    parts.push(
      `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(imageAlt || h1)}" width="800" height="450" loading="eager" />`,
    );
  }
  if (lead) parts.push(`<p class="seo-prerender__lead">${escapeHtml(lead)}</p>`);
  parts.push('</article>');
  return parts.join('\n');
}

/**
 * @param {string} html
 * @param {{
 *   title?: string,
 *   description?: string,
 *   canonicalUrl?: string,
 *   ogImage?: string,
 *   ogType?: string,
 *   noindex?: boolean,
 *   jsonLd?: object|object[],
 *   lang?: string,
 *   prerenderHtml?: string,
 * }} seo
 */
export function injectSeoIntoHtml(html, seo) {
  if (!seo || !html) return html;

  let out = html;
  const ogLocale = seo.lang || 'ru_RU';
  const htmlLang = String(ogLocale).split('_')[0] || 'ru';

  out = out.replace(/<html\s+lang="[^"]*"/i, `<html lang="${htmlLang}"`);

  if (seo.title) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  }

  if (seo.description) {
    const descTag = `<meta name="description" content="${escapeAttr(seo.description)}" />`;
    if (/<meta\s+name="description"/i.test(out)) {
      out = out.replace(/<meta\s+name="description"[^>]*\/?>/i, descTag);
    } else {
      out = out.replace('</head>', `    ${descTag}\n  </head>`);
    }
  }

  const headFragment = buildSeoHeadFragment(seo);
  if (headFragment) {
    out = out.replace('</head>', `    ${headFragment}\n  </head>`);
  }

  if (seo.prerenderHtml) {
    if (/<div id="root">\s*<\/div>/i.test(out)) {
      out = out.replace(
        /<div id="root">\s*<\/div>/i,
        `<div id="root">\n    ${seo.prerenderHtml}\n  </div>`,
      );
    } else if (/<div id="root"[^>]*><\/div>/i.test(out)) {
      out = out.replace(
        /<div id="root"[^>]*><\/div>/i,
        `<div id="root">\n    ${seo.prerenderHtml}\n  </div>`,
      );
    }
  }

  return out;
}
