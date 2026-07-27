function normalizeRawImageValue(value) {
  if (!value) return '';
  if (typeof value === 'object') {
    const maybeUrl =
      value.url ||
      value.path ||
      value.image ||
      value.src ||
      value.photo_url ||
      value.image_url ||
      value.secure_url ||
      value.file_url ||
      value.filename ||
      value.name ||
      '';
    return typeof maybeUrl === 'string' ? maybeUrl : '';
  }
  return typeof value === 'string' ? value : '';
}

function extractUploadsPath(pathname) {
  if (typeof pathname !== 'string' || !pathname) return '';
  if (pathname.startsWith('/uploads/')) return pathname;
  if (pathname.startsWith('/api/uploads/')) return pathname.replace(/^\/api/, '');
  return '';
}

export function parsePropertyImageList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw == null) return [];
  if (typeof raw !== 'string') return [];
  const t = raw.trim();
  if (!t) return [];
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.photos)) return parsed.photos;
      if (Array.isArray(parsed.images)) return parsed.images;
      const one = normalizeRawImageValue(parsed);
      return one ? [one] : [];
    }
    return typeof parsed === 'string' && parsed.trim() ? [parsed] : [];
  } catch {
    // legacy formats below
  }
  if (t.startsWith('{') && t.endsWith('}')) {
    const inner = t.slice(1, -1);
    if (inner.trim()) {
      return inner
        .split(',')
        .map((part) => part.trim().replace(/^"+|"+$/g, ''))
        .filter(Boolean);
    }
  }
  if (t.includes(',') || t.includes(';')) {
    return t
      .split(/[;,]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [t];
}

function normalizeImageUrl(raw, baseOrigin) {
  const value = normalizeRawImageValue(raw)
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\\/g, '/');
  if (!value) return '';
  if (value.startsWith('blob:')) return '';
  const normalizedBase = String(baseOrigin || '').replace(/\/$/, '');

  if (
    value.startsWith('data:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }

  const uploadsPath = extractUploadsPath(value);
  if (uploadsPath) {
    return `${normalizedBase}${uploadsPath}`;
  }

  if (value.startsWith('uploads/')) {
    return `${normalizedBase}/${value}`;
  }

  if (value.startsWith('api/uploads/')) {
    return `${normalizedBase}/${value}`;
  }

  return `${normalizedBase}/uploads/${value.replace(/^\/+/, '')}`;
}

/**
 * @param {object} property
 * @param {string} baseOrigin
 */
export function resolvePropertyImageUrl(property, baseOrigin) {
  if (!property) return '';
  const thumbCandidates = [
    property.thumbnail,
    property.preview,
    property.thumb,
    property.small_image,
    property.smallImage,
  ];
  for (const candidate of thumbCandidates) {
    const normalized = normalizeImageUrl(candidate, baseOrigin);
    if (normalized) return normalized;
  }

  const imagesList = parsePropertyImageList(property.images);
  const photosList = parsePropertyImageList(property.photos);
  const list = imagesList.length > 0 ? imagesList : photosList;
  const normalizedList = list.map((entry) => normalizeImageUrl(entry, baseOrigin)).filter(Boolean);

  let primary = property.image;
  if (primary && typeof primary === 'object') {
    primary = primary.url || primary.path || primary.src || '';
  }
  const primaryNorm = primary ? normalizeImageUrl(primary, baseOrigin) : '';
  if (primaryNorm) return primaryNorm;
  if (normalizedList[0]) return normalizedList[0];

  const extras = [
    property.image_url,
    property.imageUrl,
    property.photo_url,
    property.photo,
    property.cover_photo,
    property.main_photo,
    property.main_image,
    property.avatar,
  ];
  for (const candidate of extras) {
    const normalized = normalizeImageUrl(candidate, baseOrigin);
    if (normalized) return normalized;
  }
  return '';
}
