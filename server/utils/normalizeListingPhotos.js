/**
 * Приводим ссылки на файлы загрузок к виду `/uploads/…`, чтобы картинки открывались
 * у любого клиента с текущего хоста сайта (HTTPS, другой браузер, другое устройство),
 * а не с localhost или старого домена разработки.
 */

export const DEFAULT_LISTING_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';

export function coercePhotosArray(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch {
      return [value];
    }
  }
  return [];
}

function unwrapPhotoEntry(entry) {
  if (entry == null) return '';
  if (typeof entry === 'string') {
    let s = entry.trim().replace(/^['"]+|['"]+$/g, '');
    s = s.replace(/\\/g, '/');
    return s.trim();
  }
  if (typeof entry === 'object') {
    const v =
      entry.url ??
      entry.path ??
      entry.src ??
      entry.photo_url ??
      entry.image_url ??
      entry.image ??
      '';
    return typeof v === 'string' ? unwrapPhotoEntry(v) : '';
  }
  return '';
}

/**
 * @param {unknown} raw
 * @returns {string} одна строка URL для фронта или пустая строка
 */
export function normalizeSingleListingPhoto(raw) {
  const sIn = unwrapPhotoEntry(raw);
  if (!sIn) return '';

  const colon = sIn.indexOf(':');
  const protoLower = colon > 0 ? sIn.slice(0, colon).toLowerCase() : '';
  if (protoLower === 'blob') return '';
  // Большие data URL в списках не поддерживаются как публичные медиа
  if (protoLower === 'data') return '';

  try {
    if (/^https?:\/\//i.test(sIn)) {
      const u = new URL(sIn);
      const pathname = u.pathname.replace(/\\/g, '/');
      const upIdx = pathname.indexOf('/uploads/');
      if (upIdx !== -1) {
        const base = pathname.slice(upIdx).split('#')[0].split('?')[0];
        return base.startsWith('/uploads/') ? base : '';
      }
      return u.toString();
    }
  } catch {
    /* fall through для относительных путей */
  }

  let s = sIn.replace(/\\/g, '/').trim();
  s = s.split('#')[0].split('?')[0];

  const idx = s.indexOf('/uploads/');
  if (idx !== -1) {
    const tail = '/' + s.slice(idx).replace(/^\/+/, '');
    return tail.startsWith('/uploads/') ? tail : '';
  }

  let tail = s.replace(/^\/+/, '');
  if (tail.startsWith('uploads/')) return '/' + tail;
  if (tail.startsWith('api/uploads/')) return '/' + tail.replace(/^api\//i, '');

  if (/^photo-\d+-\d+-/i.test(tail)) return `/uploads/${tail}`;
  return '';
}

export function normalizePhotosListInput(raw) {
  const arr = coercePhotosArray(raw);
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const n = normalizeSingleListingPhoto(item);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

/**
 * После того как formatted.photos уже массив (или строка JSON — coerce внутри),
 * задаёт photo/images/image для обратной совместимости с фронтом.
 */
export function applyListingPhotosToFormatted(formatted, fallbackImg = DEFAULT_LISTING_IMAGE_FALLBACK) {
  if (!formatted || typeof formatted !== 'object') return;
  formatted.photos = normalizePhotosListInput(formatted.photos);
  formatted.images = formatted.photos;
  formatted.image = formatted.photos[0] || fallbackImg;
}
