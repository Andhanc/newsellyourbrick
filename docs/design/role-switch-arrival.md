# Role switch arrival

After a successful password check, the role-switch flow opens `/profile` for buyers or `/owner-test/profile` for sellers. A branded full-screen loader stays visible through authentication, document navigation, application boot and destination profile loading. Only after the profile reports readiness does the loader give way to a single confirmation modal using the Investment Compass modal's visual styles. Its generated illustration is shared between roles; the title and description identify the destination role.

## Session handoff

Switching cabinets does not call Clerk `signOut()`: the provider's `afterSignOutUrl="/"` could interrupt the handoff and send the user to the homepage. The underlying Clerk identity remains signed in while the application selects the cabinet through its own verified session.

Password authentication is staged with `persist: false`. `GET /api/auth/mobile/session` resolves the opaque token on the server and confirms the exact account, role and email before any local credentials change. Missing, expired, deleted or blocked sessions are rejected. The endpoint exposes only ID, role and email, uses no-store and fails closed on database errors.

The handoff takes a snapshot of account fields and the current token, verifies that the source identity has not changed, then commits the selected account. A failed write or navigation restores the snapshot. Credentials and tokens are never stored in the transition marker. Source profile fields are cleared so the previous account's photo or country cannot leak into the selected profile. Purchased-property handoffs remain intact and are restored on failure.

The operation has a 20-second AbortController deadline and a shared lock against duplicate submissions from different switch controls. The preloader blocks interaction with the previous page. Password errors, network failures and verification failures preserve the source cabinet and allow retry in the same form. A reload during authentication cancels the pending operation and keeps the source session; a committed handoff survives reload. The destination host corrects late redirects until the selected profile is ready. A 45-second expiry prevents abandoned boot overlays from remaining indefinitely.

Clerk synchronization and session validation defer during the handoff. A late 404 response for the old account cannot clear the new session. A full document navigation isolates account-specific React contexts, caches and requests. The boot script paints the same preloader before the application bundle loads.

The arrival marker is stored in sessionStorage only after authentication and role validation, is tied to the destination user ID and role, and expires after two minutes. It is consumed when the destination modal mounts, including under React Strict Mode. Incorrect passwords do not create an arrival. Refreshing the destination does not replay it.

Buyer and seller welcome onboarding resumes after dismissal. The purchased-property seller arrival drawer is also deferred until dismissal. Existing profile-completion gates and purchased-property listing handoffs remain in place.

The portal supports Escape, a keyboard focus trap, an initially focused Continue button, backdrop dismissal, scroll locking/restoration and reduced motion. Short landscape viewports can scroll the dialog. Web and legacy code, artwork and all seven locale dictionaries are mirrored.

## Artwork

- Tool: built-in `image_gen`; transparent output.
- Web asset: `public/images/role-switch/cabinet-arrival-v1.webp`.
- Legacy asset: `apps/client/public/images/role-switch/cabinet-arrival-v1.webp`.
- Delivery: 768 × 768 WebP, alpha preserved, approximately 77 KB.

Final prompt:

> Use case: stylized-concept. Asset type: premium transparent 3D illustration for a real estate app's successful switch between buyer and seller accounts. Subject: one elegant sculptural open doorway in thick frosted Tiffany aqua glass (#63CDD4), with a small rounded white porcelain house nestled within the doorway and one beautiful oversized brushed-silver key floating diagonally in front. A subtle small circular Tiffany glass check medallion near the base suggests successful arrival. Unified compact composition, not a scene of disconnected icons. Three-quarter isometric view, refined tactile clay and frosted glass, polished silver accents, soft studio illumination, gentle realistic ambient shadows, welcoming premium feel. Centered square composition with generous transparent margins, complete unclipped objects. High legibility at 240px. Actual transparent background. No text, no lettering, no numbers, no watermark, no people, no colored backdrop.

## Validation

- Role-switch unit tests cover both password transitions, rejected passwords, mismatched roles/tokens, blocked/deleted accounts, user isolation, expiry, malformed markers, unavailable storage, partial commits, rollback, duplicate submissions and stale validation responses.
- Parity checks cover changed client code, seven locale dictionaries and the image's alpha channel.
- Isolated modal browser checks cover both roles, mobile and desktop layout, image loading, keyboard focus cycling, Escape/Continue dismissal, scroll restoration, marker consumption, no replay and every translated UI.
- Real browser checks with the local API verify seller → buyer and buyer → seller, both server-token identities, no homepage redirect, slow requests, failed passwords, unavailable session verification, retries, refresh, a 20-second timeout, reload during authentication and a delayed application bundle. No payments or messages are sent by these tests.
- `npm run test:i18n`, `npm run check:i18n`, `npm run build`, `git diff --check`.
- Full `npm test` has 31 existing failures. The same 31 failures were reproduced in a detached worktree at the starting commit with the same dependencies; this change introduces no additional failures. One existing test imports the unavailable `vitest` package. Other failures include outdated copy assertions across property, profile, wallet, stories, test-drive and AI presentation tests.
