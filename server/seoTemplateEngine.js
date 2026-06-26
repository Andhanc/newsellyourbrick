import { seoAdminQueries } from './database/seoAdminPrisma.js';
import { applySeoTemplate } from '../shared/seoOverrides.js';

/** @type {Map<string, object>|null} */
let templateCache = null;
let templateCacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;

async function getTemplateMap() {
  if (templateCache && Date.now() - templateCacheAt < CACHE_MS) return templateCache;
  const rows = await seoAdminQueries.getAllTemplates();
  templateCache = new Map(rows.map((row) => [row.page_type, row]));
  templateCacheAt = Date.now();
  return templateCache;
}

export function invalidateSeoTemplateCache() {
  templateCache = null;
  templateCacheAt = 0;
}

/**
 * @param {string} pageType
 * @param {{ title?: string, description?: string, h1?: string }} seo
 * @param {Record<string, string|number|null|undefined>} vars
 */
export async function applyDbSeoTemplate(pageType, seo, vars = {}) {
  if (!seo) return seo;
  try {
    const map = await getTemplateMap();
    const tpl = map.get(pageType);
    if (!tpl) return seo;
    return {
      ...seo,
      title: tpl.title_template ? applySeoTemplate(tpl.title_template, vars) : seo.title,
      description: tpl.description_template
        ? applySeoTemplate(tpl.description_template, vars)
        : seo.description,
      h1: tpl.h1_template ? applySeoTemplate(tpl.h1_template, vars) : seo.h1,
    };
  } catch {
    return seo;
  }
}
