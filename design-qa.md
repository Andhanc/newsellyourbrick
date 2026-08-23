# Design QA — centered welcome copy

**Source visual truth**

- `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-ca01e10e-ca66-46b4-a932-50c36bb975c4.png` (`696 × 402`).
- Latest requested delta: keep the compact two-line typography and continuous supporting copy, but center the full block again.

**Implementation state**

- Target URL: `http://localhost:5173/`.
- Code changes: `.md-welcome__copy`, `.md-welcome__title`, `.md-welcome__lead`, and the supporting-copy JSX in both maintained page copies.
- Production build: passed.
- Frontend and backend health endpoints: HTTP `200`.
- Superdesign draft `fffa1c4b-b6d1-43b8-ab00-9851b705410e`, version `14`, includes the centered block.

**Required fidelity surfaces**

- Fonts and typography: Montserrat and the established heading weight remain unchanged; the responsive heading size is reduced to `clamp(1.55rem, 5.8vw, 2rem)` with `1.04` line height and balanced wrapping.
- Spacing and layout rhythm: the copy block shares the `430px` mobile and `1040px` desktop alignment widths used by nearby content; title and paragraph use centered auto margins.
- Colors and tokens: existing `#2f3542` heading and `#8b93a7` supporting-copy colors are preserved.
- Image quality: not applicable to this text-only delta; card and photo assets are unchanged.
- Copy and content: both original sentences remain; the hard `<br>` was replaced with a normal space.

**Findings**

- [P2] Fresh browser-rendered evidence is unavailable.
  - Evidence: the in-app browser rejected the localhost refresh transition before a new screenshot could be captured.
  - Impact: exact two-line wrapping at the user's active viewport cannot be visually confirmed from a current implementation screenshot.
  - Fix: refresh the open local page and capture the updated section at the same viewport.

**Implementation checklist**

- [x] Center alignment applied to title and supporting copy.
- [x] Heading size and line height reduced for a stable two-line composition.
- [x] Forced supporting-copy break removed.
- [x] Source and legacy copies updated consistently.
- [x] Production build completed.
- [ ] Fresh same-viewport screenshot and side-by-side comparison captured.

final result: blocked
