# Design QA — profile strategy stories

## Source visual truth

- Placement and brand reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-70578e94-67a4-4cec-b33f-3c07cf425752.png`.
- Source pixels: `648 × 770`.
- Intended CSS viewport for the implementation check: `393 × 852`, device scale factor `1`.
- Target state: buyer profile, immediately before the existing “Наши направления” section; overlay state starts on the invitation story.

## Implementation evidence

- Target URL: `http://localhost:4173/test`.
- Implementation screenshot path: unavailable. The in-app browser first rendered an empty configuration fallback, then rejected the required localhost refresh under its URL security policy.
- Browser-rendered pixel dimensions: unavailable because the refreshed application frame could not be captured.
- Static implementation paths:
  - `src/components/ProfileStrategyStories.jsx`
  - `src/components/ProfileStrategyStories.css`
  - `apps/client/src/legacy/components/ProfileStrategyStories.jsx`
  - `apps/client/src/legacy/components/ProfileStrategyStories.css`

## Required fidelity surfaces

- Fonts and typography: Montserrat is reused from the product; display titles use the existing heavy optical range, balanced wrapping, compact line height and the same system fallback.
- Spacing and layout rhythm: the trigger occupies the full profile content width and sits directly before the existing direction cards; the mobile story uses the full `100dvh` viewport with safe-area-aware progress and bottom CTA.
- Colors and tokens: the primary Tiffany palette (`#4ecdd6`, dark teal and white) is preserved; each strategy receives a distinct supporting tone without changing the main brand color.
- Image quality and asset fidelity: all seven slides use existing high-resolution product assets. No placeholders, emoji, custom SVGs or CSS-drawn imagery were introduced.
- Copy and content: invitation, auction, shares, debts, buy-now, test-drive and smart-assistant steps are present in Russian with English fallback copy.

## Full-view comparison evidence

- The source reference was opened at its original `648 × 770` pixel size.
- A same-state browser implementation screenshot could not be captured, so a valid side-by-side visual comparison is unavailable.

## Focused region comparison evidence

- Not available for the same browser-policy blocker. Static inspection confirms the trigger is inserted immediately before `AuctionCategoryCtaCards variant="profilePage"` in both maintained profile implementations.

## Findings

- [P2] Browser-rendered visual evidence is missing.
  - Location: profile strategy trigger and full-screen stories.
  - Evidence: source reference is available, while the refreshed localhost implementation capture was rejected by the in-app browser security policy.
  - Impact: exact image crops and text wrapping cannot be signed off at the target viewport.
  - Fix: open the local profile with a valid signed-in session and capture the trigger plus invitation, mid-flow and final slides at `393 × 852`.

## Verification completed

- `node --test src/components/ProfileStrategyStories.test.js`: passed (`2/2`).
- `npm run typecheck` in `apps/client`: passed.
- Root Vite production compilation transformed all `4379` modules successfully, then stopped while copying public assets because the disk was full (`ENOSPC`); no source compilation error was reported.
- Console errors for the initial browser frame: none reported before the blocked refresh.
- Primary interactions covered by source tests: seven steps, timer duration, left/right split navigation and all destination routes.

## Comparison history

- Iteration 1: implementation created and both maintained profile copies wired consistently.
- Iteration 2: static tests and app typecheck passed; no code fixes were required.
- Post-fix visual evidence: unavailable because browser refresh was blocked before capture.

## Implementation checklist

- [x] Trigger card before “Наши направления”.
- [x] Seven story slides with individual moods.
- [x] Segmented timed progress.
- [x] Automatic advance and final close.
- [x] Left/right tap navigation and keyboard navigation.
- [x] Working destination CTAs.
- [x] Responsive full-screen mobile presentation.
- [ ] Same-viewport browser screenshot comparison.

final result: blocked
