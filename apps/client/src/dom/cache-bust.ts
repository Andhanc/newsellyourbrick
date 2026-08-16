export function createDomCacheBustScript(appVersion: string) {
  const version = JSON.stringify(String(appVersion || '0.0.0'))
  return `
    (function () {
      try {
        var version = ${version};
        var url = new URL(window.location.href);
        if (url.searchParams.get('__sybAppVersion') !== version) {
          url.searchParams.set('__sybAppVersion', version);
          window.location.replace(url.toString());
        }
      } catch (_) {}
    })();
    true;
  `
}
