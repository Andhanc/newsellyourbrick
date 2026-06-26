/**
 * Подставляет переменные в SEO-шаблон.
 * @param {string} template
 * @param {Record<string, string|number|null|undefined>} vars
 */
export function applySeoTemplate(template, vars) {
  if (!template) return '';
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key];
    if (value == null || value === '') return '—';
    return String(value);
  });
}

/**
 * @param {object|null|undefined} base
 * @param {object|null|undefined} override
 * @param {string} origin
 */
export function mergeSeoOverride(base, override, origin = '') {
  if (!base) return null;
  if (!override) return { ...base };

  const out = { ...base };
  const originClean = String(origin || '').replace(/\/$/, '');

  if (override.title) out.title = override.title;
  if (override.meta_description) out.description = override.meta_description;
  if (override.h1) out.h1 = override.h1;

  if (override.canonical_path) {
    out.canonicalPath = override.canonical_path;
    out.canonicalUrl = override.canonical_path.startsWith('http')
      ? override.canonical_path
      : `${originClean}${override.canonical_path.startsWith('/') ? override.canonical_path : `/${override.canonical_path}`}`;
  }

  if (override.robots_index === 0 || override.robots_index === false) {
    out.noindex = true;
  } else if (override.robots_index === 1 || override.robots_index === true) {
    out.noindex = false;
  }

  const ogTitle = override.og_title || out.title;
  const ogDescription = override.og_description || out.description;
  if (override.og_title) out.ogTitle = override.og_title;
  if (override.og_description) out.ogDescription = override.og_description;
  if (override.og_image) out.ogImage = override.og_image;
  if (override.twitter_card) out.twitterCard = override.twitter_card;

  if (override.og_title || override.og_description) {
    out.socialPreview = { title: ogTitle, description: ogDescription, image: out.ogImage };
  }

  if (override.h1 && out.prerenderHtml) {
    out.prerenderHtml = out.prerenderHtml.replace(
      /<h1>[^<]*<\/h1>/i,
      `<h1>${escapePrerender(override.h1)}</h1>`,
    );
  }

  return out;
}

function escapePrerender(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {object} row
 */
export function overrideToSnapshot(row) {
  if (!row) return null;
  return {
    path: row.path,
    page_type: row.page_type,
    title: row.title,
    meta_description: row.meta_description,
    h1: row.h1,
    canonical_path: row.canonical_path,
    robots_index: row.robots_index,
    target_keywords: row.target_keywords,
    seo_notes: row.seo_notes,
    og_title: row.og_title,
    og_description: row.og_description,
    og_image: row.og_image,
    twitter_card: row.twitter_card,
    sitemap_include: row.sitemap_include,
    sitemap_priority: row.sitemap_priority,
    sitemap_changefreq: row.sitemap_changefreq,
    sitemap_lastmod: row.sitemap_lastmod,
  };
}
