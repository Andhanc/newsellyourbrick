/** @typedef {'editor' | 'marketer' | 'admin'} SeoRole */

export const SEO_ROLES = [
  { id: 'editor', label: 'Редактор' },
  { id: 'marketer', label: 'Маркетолог' },
  { id: 'admin', label: 'Админ SEO' },
];

/**
 * @param {{ is_super_admin?: number|boolean, can_access_seo?: number|boolean, seo_role?: string|null }} admin
 * @returns {SeoRole|null}
 */
export function resolveSeoRole(admin) {
  if (!admin) return null;
  if (admin.is_super_admin) return 'admin';
  if (!admin.can_access_seo) return null;
  const role = String(admin.seo_role || 'editor').toLowerCase();
  if (role === 'marketer' || role === 'admin') return role;
  return 'editor';
}

/**
 * @param {{ is_super_admin?: number|boolean, can_access_seo?: number|boolean }} admin
 */
export function canAccessSeoPanel(admin) {
  return Boolean(admin?.is_super_admin || admin?.can_access_seo);
}

/** @param {SeoRole|null} role */
export function seoCanEditPages(role) {
  return role === 'editor' || role === 'marketer' || role === 'admin';
}

/** @param {SeoRole|null} role */
export function seoCanEditSocial(role) {
  return role === 'marketer' || role === 'admin';
}

/** @param {SeoRole|null} role */
export function seoCanEditTemplates(role) {
  return role === 'marketer' || role === 'admin';
}

/** @param {SeoRole|null} role */
export function seoCanManageRedirects(role) {
  return role === 'admin';
}

/** @param {SeoRole|null} role */
export function seoCanManageSitemap(role) {
  return role === 'admin';
}

/** @param {SeoRole|null} role */
export function seoCanRollbackHistory(role) {
  return role === 'admin';
}

/** @param {SeoRole|null} role */
export function seoCanBulkEdit(role) {
  return role === 'editor' || role === 'marketer' || role === 'admin';
}
