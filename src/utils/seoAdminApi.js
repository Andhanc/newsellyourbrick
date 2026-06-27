import { getApiBaseUrlSync } from './apiConfig';

const API_BASE_URL = getApiBaseUrlSync();

function adminContextHeader() {
  try {
    const permissions = JSON.parse(localStorage.getItem('adminPermissions') || '{}');
    const username = localStorage.getItem('adminUsername') || permissions.username || 'admin';
    return {
      'Content-Type': 'application/json',
      'x-admin-context': JSON.stringify({ ...permissions, username }),
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

function apiPath(suffix) {
  const path = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${API_BASE_URL}/admin/seo${path}`;
}

export async function fetchSeoMeta() {
  const r = await fetch(apiPath('/meta'), { headers: adminContextHeader() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка загрузки');
  return j.data;
}

export async function fetchSeoPages(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(apiPath(`/pages?${qs}`), { headers: adminContextHeader() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка загрузки страниц');
  return j;
}

export async function fetchSeoPage(path) {
  const clean = String(path || '').replace(/^\//, '');
  const r = await fetch(apiPath(`/pages/${clean}`), { headers: adminContextHeader() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Страница не найдена');
  return j.data;
}

export async function saveSeoPage(path, payload) {
  const clean = String(path || '').replace(/^\//, '');
  const r = await fetch(apiPath(`/pages/${clean}`), {
    method: 'PUT',
    headers: adminContextHeader(),
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка сохранения');
  return j.data;
}

export async function fetchSeoChecks() {
  const r = await fetch(apiPath('/checks'), { headers: adminContextHeader() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка проверок');
  return j.data;
}

export async function fetchSeoTemplates() {
  const r = await fetch(apiPath('/templates'), { headers: adminContextHeader() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка шаблонов');
  return j.data;
}

export async function saveSeoTemplate(pageType, payload) {
  const r = await fetch(apiPath(`/templates/${pageType}`), {
    method: 'PUT',
    headers: adminContextHeader(),
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка сохранения шаблона');
  return j.data;
}

export async function fetchSeoRedirects() {
  const r = await fetch(apiPath('/redirects'), { headers: adminContextHeader() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка редиректов');
  return j.data;
}

export async function createSeoRedirect(payload) {
  const r = await fetch(apiPath('/redirects'), {
    method: 'POST',
    headers: adminContextHeader(),
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка создания');
  return j.data;
}

export async function deleteSeoRedirect(id) {
  const r = await fetch(apiPath(`/redirects/${id}`), {
    method: 'DELETE',
    headers: adminContextHeader(),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка удаления');
}

export async function fetchSeoHistory(path) {
  const clean = String(path || '').replace(/^\//, '');
  const r = await fetch(apiPath(`/history/${clean}`), { headers: adminContextHeader() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка истории');
  return j.data;
}

export async function rollbackSeoHistory(id) {
  const r = await fetch(apiPath(`/history/${id}/rollback`), {
    method: 'POST',
    headers: adminContextHeader(),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка отката');
  return j.data;
}

export async function exportSeoCsv() {
  const r = await fetch(apiPath('/export'), { headers: adminContextHeader() });
  return r.text();
}

export async function importSeoCsv(csv) {
  const r = await fetch(apiPath('/import'), {
    method: 'POST',
    headers: adminContextHeader(),
    body: JSON.stringify({ csv }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка импорта');
  return j.data;
}

export async function refreshSitemap() {
  const r = await fetch(apiPath('/sitemap/refresh'), {
    method: 'POST',
    headers: adminContextHeader(),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Ошибка');
  return j;
}
