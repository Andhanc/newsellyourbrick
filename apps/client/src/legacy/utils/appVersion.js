/** App version from package.json, injected by Vite at build/dev time. */
export let APP_VERSION = import.meta.env?.VITE_APP_VERSION || '0.0.0'

export function setAppVersion(version) {
  const normalized = String(version || '').trim()
  if (normalized) APP_VERSION = normalized
}
