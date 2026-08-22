/**
 * Google Drive image pick helpers (GIS OAuth + Drive API v3).
 * Needs only a browser OAuth client id — no Picker developer key.
 */

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'

let gsiLoadPromise = null

function loadScriptOnce(src) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Document is unavailable'))
  }
  const existing = document.querySelector(`script[src="${src}"]`)
  if (existing && window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }
  if (gsiLoadPromise) return gsiLoadPromise

  gsiLoadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.google?.accounts?.oauth2) resolve()
      else reject(new Error('Google Identity Services failed to load'))
    }
    if (existing) {
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), {
        once: true,
      })
      if (window.google?.accounts?.oauth2) finish()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = finish
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  }).catch((error) => {
    gsiLoadPromise = null
    throw error
  })

  return gsiLoadPromise
}

export async function requestGoogleDriveAccessToken(clientId) {
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID_MISSING')
  }
  await loadScriptOnce(GSI_SCRIPT_SRC)

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response?.error) {
            reject(new Error(response.error))
            return
          }
          if (!response?.access_token) {
            reject(new Error('GOOGLE_TOKEN_MISSING'))
            return
          }
          resolve(response.access_token)
        },
        error_callback: (error) => {
          const message =
            typeof error === 'string'
              ? error
              : error?.type || error?.message || 'GOOGLE_AUTH_CANCELLED'
          reject(new Error(message))
        },
      })
      client.requestAccessToken({ prompt: '' })
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

export async function listGoogleDriveImages(accessToken, { pageToken = '', pageSize = 30 } = {}) {
  if (!accessToken) throw new Error('GOOGLE_TOKEN_MISSING')

  const params = new URLSearchParams({
    pageSize: String(pageSize),
    fields: 'nextPageToken,files(id,name,mimeType,thumbnailLink,iconLink,modifiedTime,size)',
    q: "trashed = false and mimeType contains 'image/'",
    orderBy: 'modifiedTime desc',
    spaces: 'drive',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })
  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`${DRIVE_FILES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || `Drive list failed (${response.status})`
    throw new Error(message)
  }

  return {
    files: Array.isArray(payload.files) ? payload.files : [],
    nextPageToken: payload.nextPageToken || null,
  }
}

export async function downloadGoogleDriveFileAsImage(accessToken, fileMeta) {
  if (!accessToken) throw new Error('GOOGLE_TOKEN_MISSING')
  if (!fileMeta?.id) throw new Error('GOOGLE_FILE_MISSING')

  const response = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(fileMeta.id)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw new Error(`Drive download failed (${response.status})`)
  }

  const blob = await response.blob()
  const mimeType = blob.type || fileMeta.mimeType || 'image/jpeg'
  const safeName =
    typeof fileMeta.name === 'string' && fileMeta.name.trim()
      ? fileMeta.name.trim()
      : `passport-${fileMeta.id}.jpg`

  return new File([blob], safeName, { type: mimeType })
}

export function driveThumbnailUrl(file, accessToken) {
  if (!file) return ''
  if (file.thumbnailLink) {
    const base = file.thumbnailLink.replace(/=s\d+$/, '=s220')
    if (accessToken && !base.includes('access_token=')) {
      return `${base}${base.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(accessToken)}`
    }
    return base
  }
  return file.iconLink || ''
}
