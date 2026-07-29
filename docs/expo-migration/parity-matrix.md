# Expo public UI parity matrix

Updated: 2026-07-28

The Vite reference and Android release screenshots use the same 390×844 viewport.
Paired evidence is stored in `docs/expo-migration/visual-comparison`.

| Route | Vite source reused | Android cold launch | Expected heading | Visible assets | Visual comparison |
|---|---:|---:|---:|---:|---:|
| `/` | yes | pass | pass | pass | pass |
| `/auction` | yes | pass | pass | pass | pass |
| `/co-investment` | yes | pass | pass | pass | pass |
| `/debts` | yes | pass | pass | pass | pass |
| `/test-drive` | yes | pass | pass | pass | pass |
| `/about` | yes | pass | pass | pass | pass |
| `/buyer` | yes | pass | pass | pass | pass |
| `/seller` | yes | pass | pass | pass | pass |

## Shared implementation

- Expo Router owns native and web entry routes.
- One Expo DOM shell renders the original Vite page components.
- Original CSS, translations, fonts, icons and public images are packaged with
  the Expo build.
- Android file-scheme public assets are resolved from the embedded
  `android_asset/www.bundle` directory.
- Android WebView receives an in-memory guest storage fallback when file-scheme
  `localStorage` is unavailable.
- The Vite global reset states needed by the standalone DOM bundle are reproduced
  in `apps/client/src/dom/legacy-public-shell.css`.

## Acceptance gates

- [x] Expo routes exist for all eight required pages.
- [x] Expo Web export succeeds.
- [x] Android Gradle release APK builds.
- [x] APK installs and launches on the headless emulator.
- [x] Eight route headings and full-height roots pass semantic QA.
- [x] Eight Vite/Android paired screenshots reviewed at identical viewport.
- [x] Header menu opens and exposes the public route tree.
- [x] Release WebView debugging removed.
