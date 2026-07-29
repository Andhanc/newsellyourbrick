# Expo migration status

Updated: 2026-07-28

## Required public UI scope

The complete Vite frontend source is mirrored under `apps/client/src/legacy` and is
bundled by Expo as a DOM component. This lets Android, iOS and Expo Web render the
same React DOM, CSS, fonts and image assets instead of maintaining a reduced native
copy of the public pages.

Verified guest routes:

- `/`
- `/auction`
- `/co-investment`
- `/debts`
- `/test-drive`
- `/about`
- `/buyer`
- `/seller`

Each route has an Expo Router entry and renders the corresponding original Vite
page. Guest Clerk behavior is provided by the Expo-only shim; file-based Android
WebView storage and public asset paths are normalized without changing Vite
browser behavior.

## Visual QA

- Reference: Vite at 390×844.
- Target: Android release APK in a headless API 36 emulator at the same 390×844
  CSS viewport.
- All eight routes were launched from cold deep links.
- Every route rendered a non-zero 390×844 DOM root and its expected heading.
- All visible hero images loaded.
- Header menu interaction was tested through ADB; the complete public drawer
  opened and contained the expected sections.
- Paired reference/Android screenshots are in
  `docs/expo-migration/visual-comparison`.
- Final smoke screenshot is
  `docs/expo-migration/android-release/01-home-final.png`.

## Build verification

```bash
cd apps/client
npm run typecheck
npm run export:web

export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
cd android
./gradlew app:assembleRelease
```

Verified results:

- TypeScript check: passed.
- Expo Web export: passed (`apps/client/dist-web`).
- Android Gradle `app:assembleRelease`: passed.
- Final APK installed and cold-launched in the headless Android emulator.
- No fatal Android/React Native errors were present after launch.
- Release WebView debugging is disabled.

Final APK:

`apps/client/android/app/build/outputs/apk/release/app-release.apk`

- Size: 285,453,864 bytes.
- SHA-256:
  `bf2674117f1b65184a3ec7eed9f98b5d76a5bb6e45b183f73cb3f79f97d633ed`

The local Expo Android template currently signs the release variant with its
development keystore. Installation/testing is valid; Google Play publication
still requires the project's production upload keystore.

## Scope note

The no-account public UI acceptance listed above is complete. Authenticated
cabinet, payments, KYC, maps and admin/marketer workflows remain separate
functional QA scopes and were not part of this visual acceptance run.
